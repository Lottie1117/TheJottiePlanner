/**
 * Firebase Cloud Function — sends FCM push when a notification document is created.
 *
 * Deploy:
 *   npm install -g firebase-tools
 *   firebase login
 *   firebase init functions   (select your jottieplans project)
 *   copy this file to functions/index.js
 *   firebase deploy --only functions
 */
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp }     = require('firebase-admin/app');
const { getFirestore }      = require('firebase-admin/firestore');
const { getMessaging }      = require('firebase-admin/messaging');

initializeApp();

exports.sendShoppingNotification = onDocumentCreated(
  'notifications/{docId}',
  async (event) => {
    const data = event.data.data();
    const { targetUser, title, body } = data;

    const deviceDoc = await getFirestore()
      .collection('devices').doc(targetUser).get();

    if (!deviceDoc.exists) {
      console.log(`No device token for ${targetUser}`);
      await event.data.ref.delete();
      return;
    }

    const token = deviceDoc.data().token;
    if (!token) {
      await event.data.ref.delete();
      return;
    }

    try {
      await getMessaging().send({
        token,
        notification: { title, body },
        webpush: {
          notification: {
            icon:  'https://jottieplans.web.app/icon-192.png',
            badge: 'https://jottieplans.web.app/icon-192.png',
            requireInteraction: false
          },
          fcmOptions: { link: 'https://jottieplans.web.app/' }
        }
      });
      console.log(`Push sent to ${targetUser}`);
    } catch (err) {
      console.error('FCM send error:', err.message);
    }

    // Clean up notification doc
    await event.data.ref.delete();
  }
);
