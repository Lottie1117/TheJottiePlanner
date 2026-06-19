const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp }     = require('firebase-admin/app');
const { getFirestore }      = require('firebase-admin/firestore');
const { getMessaging }      = require('firebase-admin/messaging');

initializeApp();

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

    // Send push notification if device token exists
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

    // Document is intentionally kept so the in-app notification centre can display it
  }
);
