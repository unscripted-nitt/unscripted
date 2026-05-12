// js/firebase-config.js
// ============================================================
// FIREBASE CONFIGURATION — replace with your actual project keys
// Firebase Console → Project Settings → Your Apps → SDK setup
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyD0XLC9q_H0R0oWbTntzB2uUv8Y8fog7LA",
  authDomain: "unscripted-website.firebaseapp.com",
  projectId: "unscripted-website",
  storageBucket: "unscripted-website.firebasestorage.app",
  messagingSenderId: "519266456785",
  appId: "1:519266456785:web:385751f49948b38147a1f0",
  measurementId: "G-YC1YKQRHMM"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

let messaging = null;
try {
  messaging = getMessaging(app);
} catch (e) { /* Not supported outside service worker */ }

export { messaging, getToken, onMessage };
