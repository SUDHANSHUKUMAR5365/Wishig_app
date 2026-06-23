/**
 * Native FCM via @capacitor-firebase/messaging
 * Falls back to web FCM (firebase.js) when running in browser.
 */
import { Capacitor } from '@capacitor/core';

const isNative = () => Capacitor.isNativePlatform();

/**
 * Request permission and return FCM token.
 * On Android: uses native Capacitor Firebase Messaging.
 * On web: uses existing firebase.js web flow.
 */
export const getNativeFCMToken = async () => {
  if (!isNative()) {
    // Web fallback
    const { requestNotificationPermission } = await import('@/lib/firebase');
    return requestNotificationPermission();
  }

  try {
    const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');

    // Request permission
    const { receive } = await FirebaseMessaging.requestPermissions();
    if (receive !== 'granted') {
      console.warn('[FCM] Permission denied on native platform');
      return null;
    }

    // Get token
    const { token } = await FirebaseMessaging.getToken();
    return token || null;
  } catch (e) {
    console.warn('[FCM] Native token error:', e?.message || e);
    return null;
  }
};

/**
 * Listen for foreground push notifications (native).
 * Returns unsubscribe function.
 */
export const onNativeForegroundMessage = async (callback) => {
  if (!isNative()) {
    const { onForegroundMessage } = await import('@/lib/firebase');
    return onForegroundMessage(callback);
  }

  try {
    const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
    const listener = await FirebaseMessaging.addListener(
      'notificationReceived',
      (event) => {
        callback({
          title: event.notification?.title || 'Celebration QR',
          body: event.notification?.body || '',
          data: event.notification?.data || {},
        });
      }
    );
    return () => listener.remove();
  } catch (e) {
    console.warn('[FCM] Native listener error:', e?.message || e);
    return () => {};
  }
};

/**
 * Handle notification tap (app opened from notification).
 */
export const onNotificationTap = async (callback) => {
  if (!isNative()) return () => {};
  try {
    const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
    const listener = await FirebaseMessaging.addListener(
      'notificationActionPerformed',
      (event) => callback(event.notification?.data || {})
    );
    return () => listener.remove();
  } catch (e) {
    return () => {};
  }
};
