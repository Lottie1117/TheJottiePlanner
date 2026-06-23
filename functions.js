const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule }        = require('firebase-functions/v2/scheduler');
const { initializeApp }     = require('firebase-admin/app');
const { getFirestore }      = require('firebase-admin/firestore');
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
