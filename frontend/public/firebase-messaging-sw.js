/* eslint-disable no-undef */
// Firebase background messaging service worker
// This file MUST be at the root of the web app (public/).

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// These values are injected at build time via the SW template or set here directly.
// They must match your REACT_APP_FIREBASE_* env vars.
const firebaseConfig = {
  apiKey:            self.FIREBASE_API_KEY            || '',
  authDomain:        self.FIREBASE_AUTH_DOMAIN        || '',
  projectId:         self.FIREBASE_PROJECT_ID         || '',
  storageBucket:     self.FIREBASE_STORAGE_BUCKET     || '',
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID || '',
  appId:             self.FIREBASE_APP_ID             || '',
};

// Only initialize if config is present (avoids errors when Firebase is not set up)
if (firebaseConfig.apiKey) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // Handle background messages
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

  // Handle notification click — open the app
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
