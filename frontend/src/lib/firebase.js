import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const VAPID_KEY = process.env.REACT_APP_FIREBASE_VAPID_KEY;

const isConfigured = () => !!firebaseConfig.apiKey && !!firebaseConfig.projectId;

let app = null;
let messaging = null;

const getFirebaseApp = () => {
  if (!isConfigured()) return null;
  if (!app) {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  }
  return app;
};

/**
 * Build the SW URL with Firebase config baked in as query params.
 * This is required because CRA does not inject REACT_APP_* into service workers.
 */
const getSwUrl = () => {
  const params = new URLSearchParams({
    apiKey: firebaseConfig.apiKey || '',
    authDomain: firebaseConfig.authDomain || '',
    projectId: firebaseConfig.projectId || '',
    storageBucket: firebaseConfig.storageBucket || '',
    messagingSenderId: firebaseConfig.messagingSenderId || '',
    appId: firebaseConfig.appId || '',
  });
  return `/firebase-messaging-sw.js?${params.toString()}`;
};

/**
 * Request notification permission and return FCM token.
 * Returns null if Firebase is not configured, browser unsupported, or permission denied.
 */
export const requestNotificationPermission = async () => {
  if (!isConfigured()) return null;
  try {
    const supported = await isSupported();
    if (!supported) return null;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const fbApp = getFirebaseApp();
    if (!fbApp) return null;

    messaging = getMessaging(fbApp);
    const swRegistration = await navigator.serviceWorker.register(getSwUrl());
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swRegistration });
    return token || null;
  } catch (e) {
    console.warn('[FCM] Token error:', e?.message || e);
    return null;
  }
};

/**
 * Listen for foreground messages. Returns unsubscribe function.
 * onMessageCallback receives { title, body, data }
 */
export const onForegroundMessage = (callback) => {
  if (!isConfigured()) return () => {};
  try {
    const fbApp = getFirebaseApp();
    if (!fbApp) return () => {};
    if (!messaging) messaging = getMessaging(fbApp);
    return onMessage(messaging, (payload) => {
      const title = payload.notification?.title || payload.data?.title || 'Celebration QR';
      const body = payload.notification?.body || payload.data?.body || '';
      callback({ title, body, data: payload.data });
    });
  } catch {
    return () => {};
  }
};

export const isFCMConfigured = isConfigured;
