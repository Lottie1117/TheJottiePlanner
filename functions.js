const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule }        = require('firebase-functions/v2/scheduler');
const { onRequest, onCall } = require('firebase-functions/v2/https');
const { initializeApp }     = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging }      = require('firebase-admin/messaging');
const { GoogleGenerativeAI } = require('@google/generative-ai');

initializeApp();

async function sendPush(targetUser, title, body) {
  const deviceDoc = await getFirestore().collection('devices').doc(targetUser).get();
  if (!deviceDoc.exists) return;
  const token = deviceDoc.data().token;
  if (!token) return;
  try {
    await getMessaging().send({
      token,
      notification: { title, body },
      webpush: { fcmOptions: { link: 'https://jottieplans.web.app/' } }
    });
  } catch(e) {
    console.error('Push send failed:', e.message);
    // Remove stale/invalid tokens so they don't block future sends
    if (e.code === 'messaging/registration-token-not-registered' ||
        e.code === 'messaging/invalid-registration-token') {
      await getFirestore().collection('devices').doc(targetUser).delete();
    }
  }
}

exports.sendShoppingNotification = onDocumentCreated(
  'notifications/{docId}',
  async (event) => {
    const { targetUser, title, body } = event.data.data();

    // Respect the recipient's delivery preference: in roundup mode,
    // activity still lands in the notification centre (this doc is
    // always kept) but the immediate push is suppressed.
    const settingsDoc = await getFirestore().collection('settings').doc(targetUser).get();
    const notifMode = settingsDoc.exists && settingsDoc.data().notificationSettings
      ? settingsDoc.data().notificationSettings.mode
      : 'instant';
    if (notifMode === 'roundup') return;

    await sendPush(targetUser, title, body);

    // Document is intentionally kept so the in-app notification centre can display it
  }
);

// ── Notification Roundups ──────────────────────────────────────────
// At each enabled roundup time, send one push per recipient summarising
// recent activity grouped by type. Reuses the notifications collection.
async function sendRoundups(timeKey) {
  const db = getFirestore();
  const settingsSnap = await db.collection('settings').get();

  for (const doc of settingsSnap.docs) {
    const targetUser = doc.id;
    const ns = doc.data().notificationSettings;
    if (!ns || ns.mode !== 'roundup' || !ns.times || !ns.times[timeKey]) continue;

    const lastRoundupSent = doc.data().lastRoundupSent || null;
    const sinceMillis = lastRoundupSent ? lastRoundupSent.toMillis() : 0;

    const notifSnap = await db.collection('notifications')
      .where('targetUser', '==', targetUser)
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get();

    const recent = notifSnap.docs
      .map(d => d.data())
      .filter(d => d.createdAt && d.createdAt.toMillis() > sinceMillis);

    if (recent.length === 0) continue;

    // Group by notification type using the icon/type fields written by writeNotif()
    const groups = {};
    for (const n of recent) {
      const key = n.type || 'other';
      groups[key] = (groups[key] || []);
      groups[key].push(n);
    }

    const greetings = { morning: '💜 Good morning!', lunch: '💜 Good afternoon!', evening: '💜 Good evening!' };
    const greeting = greetings[timeKey] || '💜 Your Jottie Roundup';

    // Build summary lines, at most 4
    const typeLabels = {
      glimmer_liked:  (items) => `❤️ ${items.length} glimmer reaction${items.length > 1 ? 's' : ''}`,
      luna_update:    (items) => `🐾 ${items.length} Luna update${items.length > 1 ? 's' : ''}`,
      task_completed: (items) => `☑️ ${items.length} task${items.length > 1 ? 's' : ''} completed`,
      shopping:       (items) => `🛒 ${items.length} shopping update${items.length > 1 ? 's' : ''}`,
      plans:          (items) => `📅 ${items.length} plan update${items.length > 1 ? 's' : ''}`,
      thinking:       (items) => `💭 ${items.length} Thinking of You`,
    };

    // Fall back: use icon from notification doc if type not in map
    const lines = [];
    for (const [type, items] of Object.entries(groups)) {
      if (lines.length >= 4) break;
      if (typeLabels[type]) {
        lines.push(typeLabels[type](items));
      } else {
        const icon = items[0].icon || '🔔';
        lines.push(`${icon} ${items.length} new update${items.length > 1 ? 's' : ''}`);
      }
    }

    const body = lines.join('\n') + '\nTap to catch up →';

    await sendPush(targetUser, greeting, body);
    await doc.ref.set({ lastRoundupSent: new Date() }, { merge: true });
  }
}

exports.sendMorningRoundup = onSchedule(
  { schedule: '0 8 * * *', timeZone: 'Europe/London' },
  () => sendRoundups('morning')
);
exports.sendLunchRoundup = onSchedule(
  { schedule: '0 13 * * *', timeZone: 'Europe/London' },
  () => sendRoundups('lunch')
);
exports.sendEveningRoundup = onSchedule(
  { schedule: '0 20 * * *', timeZone: 'Europe/London' },
  () => sendRoundups('evening')
);

// ── Dev: test roundup ─────────────────────────────────────────────
// Sends a realistic-looking roundup push to a single user immediately.
// Only callable from the app; restricted to the jottieplans domain.
exports.sendTestRoundup = onRequest(
  { region: 'europe-west2', cors: true },
  async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }

    const { targetUser } = req.body;
    if (!targetUser) { res.status(400).send('Missing targetUser'); return; }

    const title = '💜 Good evening!';
    const body  = [
      '✨ 2 new memories added',
      '❤️ 1 glimmer reaction',
      '🛒 2 shopping updates',
      '📅 1 plan tomorrow',
      'Tap to catch up →',
    ].join('\n');

    await sendPush(targetUser, title, body);
    res.status(200).send('ok');
  }
);

// ── AI Subtask Suggestions ─────────────────────────────────────────
// HTTP function: POST { taskTitle } → { subtasks: string[] }
exports.generateSubtasks = onRequest(
  { region: 'europe-west2', cors: true, secrets: ['GEMINI_API_KEY'] },
  async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }

    // Parse body — v2 onRequest doesn't auto-parse JSON
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e) { body = {}; }
    }
    if (!body || typeof body !== 'object') body = {};

    const taskTitle = (body.taskTitle || '').trim();
    if (!taskTitle) { res.status(400).json({ error: 'Missing taskTitle' }); return; }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) { res.status(500).json({ error: 'GEMINI_API_KEY not configured' }); return; }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are a helpful assistant for a couple's shared household planner app called Jottie.
They have added a task: "${taskTitle}"
Suggest 3 to 5 short, practical subtasks that would help them complete it.
Keep each subtask concise (under 8 words). Be specific and actionable.
Reply with ONLY a valid JSON array of strings. No markdown, no explanation.
Example: ["Buy ingredients from supermarket","Check recipe beforehand","Preheat oven to 180°C"]`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      let subtasks;
      try {
        subtasks = JSON.parse(text);
      } catch (e) {
        subtasks = JSON.parse(text.replace(/```json|```/g, '').trim());
      }
      if (!Array.isArray(subtasks)) throw new Error('Unexpected response format');
      subtasks = subtasks.filter(s => typeof s === 'string' && s.trim()).slice(0, 6);
      res.status(200).json({ subtasks });
    } catch (e) {
      console.error('generateSubtasks error:', e.message);
      res.status(500).json({ error: e.message });
    }
  }
);
