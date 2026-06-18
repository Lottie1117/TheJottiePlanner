// ── VERSION — bump this on every deploy to bust the old cache ─────
// This is updated automatically by the GitHub Action (see deploy.yml note below).
// If you ever deploy manually, change the date/number here.
const CACHE_VERSION = 'jottie-v__BUILD_TIME__';
const CACHE_NAME = CACHE_VERSION;

// ── Files to precache ─────────────────────────────────────────────
const PRECACHE_URLS = [
  './',
  './index.html',
  './index.js',
  './styles.css',
  './firebase.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './images/lunaface.png'
];

// ── Firebase (push notifications only) ───────────────────────────
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

// ── Install: cache all app files ──────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()) // take over immediately, don't wait for old SW to die
  );
});

// ── Activate: delete old caches ───────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim()) // take control of all open tabs immediately
  );
});

// ── Fetch: cache-first for app files, network-first for Firebase/CDN ─
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Let Firebase API calls, Firestore, FCM, and external CDNs go straight to network
  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('fcm.googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('googleapis.com')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first for everything else (your app files)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      // Not in cache — fetch from network and cache it for next time
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        return response;
      });
    })
  );
});

// ── Background push notifications ────────────────────────────────
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

// ── Notification tap: open/focus the app ─────────────────────────
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
