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
  } catch(e) { console.error('Push send failed:', e.message); }
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

// ── Notification Roundups (Phase 3A: basic delivery) ───────────────
// At each enabled roundup time, send one push per recipient summarising
// how many notifications have landed since their last roundup. Reuses
// the existing notifications collection — no new tracking structures.
async function sendRoundups(timeKey) {
  const db = getFirestore();
  const settingsSnap = await db.collection('settings').get();

  for (const doc of settingsSnap.docs) {
    const targetUser = doc.id;
    const ns = doc.data().notificationSettings;
    if (!ns || ns.mode !== 'roundup' || !ns.times || !ns.times[timeKey]) continue;

    const lastRoundupSent = doc.data().lastRoundupSent || null;
    const sinceMillis = lastRoundupSent ? lastRoundupSent.toMillis() : 0;

    // Mirror the app's existing targetUser + orderBy(createdAt) query shape
    // (no new composite index required), filtering the time window in code.
    const notifSnap = await db.collection('notifications')
      .where('targetUser', '==', targetUser)
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get();
    const count = notifSnap.docs.filter(d => {
      const ts = d.data().createdAt;
      return ts && ts.toMillis() > sinceMillis;
    }).length;

    if (count === 0) continue;

    await sendPush(
      targetUser,
      '💜 Your Jottie Roundup',
      `You have ${count} new notification${count === 1 ? '' : 's'}.\nTap to catch up →`
    );
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

