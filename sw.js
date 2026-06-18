importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyD8V6vSAQh8dhaat4euCWh6aevPBDg-aUc",
  authDomain:        "jottieplans.firebaseapp.com",
  projectId:         "jottieplans",
  storageBucket:     "jottieplans.firebasestorage.app",
  messagingSenderId: "1068707407091",
  appId:             "1:1068707407091:web:a827b16ba13c7d84ce0386"
});

const messaging = firebase.messaging();

// ── Required for PWA install prompt ──────────────────────────────
// Chrome won't show the "Add to Home Screen" prompt without a fetch handler.
// This one passes requests straight through to the network (no offline caching),
// which is fine — it just needs to exist.
self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request));
});

// Receives push when app is in the background or closed
messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || 'The Jottie Planner';
  const body  = payload.notification?.body  || '';
  self.registration.showNotification(title, {
    body,
    icon:  '/icon-192.png',
    badge: '/icon-192.png',
    tag:   'jottie-shopping',
    data:  { url: self.location.origin }
  });
});

// Opens/focuses the app when a notification is tapped
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      return clients.openWindow(event.notification.data?.url || '/');
    })
  );
});
