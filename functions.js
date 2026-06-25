const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule }        = require('firebase-functions/v2/scheduler');
const { onRequest, onCall } = require('firebase-functions/v2/https');
const { initializeApp }     = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging }      = require('firebase-admin/messaging');

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
    const settingsDoc = await getFirestore().collection('settings').doc(targetUser).get();
    const notifMode = settingsDoc.exists && settingsDoc.data().notificationSettings
      ? settingsDoc.data().notificationSettings.mode
      : 'instant';
    if (notifMode === 'roundup') return;
    await sendPush(targetUser, title, body);
  }
);

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
    const groups = {};
    for (const n of recent) {
      const key = n.type || 'other';
      groups[key] = (groups[key] || []);
      groups[key].push(n);
    }
    const greetings = { morning: '💜 Good morning!', lunch: '💜 Good afternoon!', evening: '💜 Good evening!' };
    const greeting = greetings[timeKey] || '💜 Your Jottie Roundup';
    const typeLabels = {
      glimmer_liked:  (items) => `❤️ ${items.length} glimmer reaction${items.length > 1 ? 's' : ''}`,
      luna_update:    (items) => `🐾 ${items.length} Luna update${items.length > 1 ? 's' : ''}`,
      task_completed: (items) => `☑️ ${items.length} task${items.length > 1 ? 's' : ''} completed`,
      shopping:       (items) => `🛒 ${items.length} shopping update${items.length > 1 ? 's' : ''}`,
      plans:          (items) => `📅 ${items.length} plan update${items.length > 1 ? 's' : ''}`,
      thinking:       (items) => `💭 ${items.length} Thinking of You`,
    };
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
exports.generateSubtasks = onRequest(
  { region: 'europe-west2', cors: true, secrets: ['GEMINI_API_KEY'] },
  async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }

    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e) { body = {}; }
    }
    if (!body || typeof body !== 'object') body = {};

    const taskTitle = (body.taskTitle || '').trim();
    if (!taskTitle) { res.status(400).json({ error: 'Missing taskTitle' }); return; }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) { res.status(500).json({ error: 'GEMINI_API_KEY not configured' }); return; }

    const prompt = `You are a helpful assistant for a couple's shared household planner app called Jottie.
They have added a task: "${taskTitle}"
Suggest 3 to 5 short, practical subtasks that would help them complete it.
Keep each subtask concise (under 8 words). Be specific and actionable.
Reply with ONLY a valid JSON array of strings. No markdown, no explanation.
Example: ["Buy ingredients from supermarket","Check recipe beforehand","Preheat oven to 180°C"]`;

    try {
      const apiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        }
      );
      if (!apiRes.ok) {
        const errData = await apiRes.json();
        throw new Error(JSON.stringify(errData));
      }
      const data = await apiRes.json();
      const text = data.candidates[0].content.parts[0].text.trim();
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


