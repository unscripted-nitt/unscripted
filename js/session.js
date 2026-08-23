// js/session.js — 10-minute inactivity auto-logout
import { auth } from './firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
let timer = null;

function resetTimer() {
  clearTimeout(timer);
  timer = setTimeout(async () => {
    try { await signOut(auth); } catch(e) { /* ignore */ }
    const isAdmin = window.location.pathname.includes('admin-dashboard');
    window.location.href = isAdmin
      ? 'login.html?type=admin&reason=timeout'
      : 'login.html?reason=timeout';
  }, TIMEOUT_MS);
}

const EVENTS = ['mousemove','keydown','click','touchstart','scroll','wheel'];
EVENTS.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
resetTimer(); // start immediately
