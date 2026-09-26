// js/firebase-config.js
// ============================================================
// FIREBASE CONFIGURATION
// Values come from Vite build-time environment variables (see .env.example)
// rather than being hardcoded, so this file never carries a live project
// key in git history. Firebase Console → Project Settings → Your Apps →
// SDK setup shows these same values if you need to (re)populate .env.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

if (!firebaseConfig.apiKey) {
  console.error(
    'Firebase config is missing (VITE_FIREBASE_API_KEY is unset). ' +
    'Copy .env.example to .env and fill in your project\'s values, ' +
    'or set the same variables in your hosting platform\'s environment settings.'
  );
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);
// "asia-south1" matches the region Cloud Functions are deployed to (see functions/index.js)
export const functions = getFunctions(app, "asia-south1");
export { httpsCallable };

let messaging = null;
try {
  messaging = getMessaging(app);
} catch (e) { /* Not supported outside service worker */ }

export { messaging, getToken, onMessage };
