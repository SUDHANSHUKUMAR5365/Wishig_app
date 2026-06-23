/* eslint-disable no-undef */
// Firebase background messaging service worker
// Must be at public/ root so it is served from the app origin.
// CRA does NOT inject REACT_APP_* into service workers.
// The firebase config is embedded here at build time via the
// INLINE_RUNTIME_CHUNK=false + craco alias, OR you can use
// a build script that replaces the placeholders below.
//
// For local dev: set the values below manually.
// For production (Render/Vercel): use a build script or inject via SW URL query params.

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Read config injected via URL query string when registering the SW:
//   navigator.serviceWorker.register('/firebase-messaging-sw.js?apiKey=...&projectId=...')
// Falls back to empty strings — Firebase init will be skipped gracefully.
function getParam(name) {
  try {
    return new URL(location.href).searchParams.get(name) || '';
  } catch {
    return '';
  }
}

const firebaseConfig = {
  apiKey:            getParam('apiKey'),
  authDomain:        getParam('authDomain'),
  projectId:         getParam('projectId'),
  storageBucket:     getParam('storageBucket'),
  messagingSenderId: getParam('messagingSenderId'),
  appId:             getParam('appId'),
};

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || payload.data?.title || 'Celebration QR';
    const body  = payload.notification?.body  || payload.data?.body  || '';
    const icon  = payload.notification?.icon  || '/logo192.png';

    self.registration.showNotification(title, {
      body,
      icon,
      badge: '/logo192.png',
      data: payload.data || {},
      vibrate: [200, 100, 200],
    });
  });

  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/';
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow(url);
      })
    );
  });
}
