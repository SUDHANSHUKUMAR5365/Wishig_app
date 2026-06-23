import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sudhanshu.celebrationqr',
  appName: 'Celebration QR',
  webDir: 'build',
  bundledWebRuntime: false,

  server: {
    // During development point to your local dev server.
    // Comment this out for production APK builds.
    // url: 'http://192.168.x.x:3000',
    androidScheme: 'https',
    cleartext: false,
  },

  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // set true only for debug builds
  },

  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      // serverClientId is read from REACT_APP_GOOGLE_CLIENT_ID at runtime via GoogleAuth.initialize()
      // Do NOT hardcode the client ID here — set it in frontend/.env
      forceCodeForRefreshToken: true,
    },
    FirebaseMessaging: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0A0F1F',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
