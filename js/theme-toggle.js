// js/theme-toggle.js — master dark/light control for every page.
// IMPORTANT: include this as a plain <script src="js/theme-toggle.js"></script>
// (no type="module", no defer) as the FIRST thing inside <head>, so the
// correct theme attribute is set before the browser paints (no flash).
(function () {
  var STORAGE_KEY = 'unscripted-theme';

  function getSystemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function getStoredTheme() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0E0C0A' : '#FF5722');
    var btn = document.getElementById('themeToggleBtn');
    if (btn) btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }

  var theme = getStoredTheme() || 'dark';
  applyTheme(theme);

  function bindToggleButton() {
    var btn = document.getElementById('themeToggleBtn');

    // No button in this page's HTML at all (dashboard/login/admin pages
    // don't have a navbar to put one in) — fall back to a floating one.
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
})();
