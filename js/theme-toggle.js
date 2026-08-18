// js/theme-toggle.js — binds the click handler for the theme toggle button.
//
// This file no longer applies the initial theme — that's now done by a tiny
// INLINE <script> (no src attribute) placed first inside <head> on every
// page. Inline scripts are plain HTML content, never something Vite has to
// resolve/bundle, so they can never be silently dropped from a production
// build the way an external non-module <script src> was. They also run
// synchronously, before the browser paints anything, which is what actually
// prevents the light-then-dark flash.
//
// This file is type="module" (so Vite bundles it correctly) and only
// handles what doesn't need to happen before first paint: making the button
// clickable.
var STORAGE_KEY = 'unscripted-theme';

function getSystemTheme() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0E0C0A' : '#FF5722');
  var btn = document.getElementById('themeToggleBtn');
  if (btn) btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
}

function bindToggleButton() {
  var btn = document.getElementById('themeToggleBtn');

  // No button in this page's HTML at all — fall back to a floating one.
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'themeToggleBtn';
    btn.className = 'theme-toggle-btn theme-toggle-btn--floating';
    btn.type = 'button';
    btn.innerHTML = '<span class="theme-toggle-icon"></span>';
    document.body.appendChild(btn);
  }

  if (btn.dataset.bound === '1') return; // never double-bind
  btn.dataset.bound = '1';
  btn.setAttribute('aria-label', 'Toggle theme');
  btn.addEventListener('click', function () {
    var current = document.documentElement.getAttribute('data-theme') || getSystemTheme();
    var next = current === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(STORAGE_KEY, next); } catch (e) {}
    applyTheme(next);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindToggleButton);
} else {
  bindToggleButton();
}
