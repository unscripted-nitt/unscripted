// js/nav.js — Navbar scroll, hamburger, scroll animations, counters
if (typeof document === 'undefined') { /* server build — skip */ }
else {

// Scroll progress bar
const progressBar = document.createElement('div');
progressBar.id = 'scroll-progress-bar';
document.body.prepend(progressBar);

window.addEventListener('scroll', () => {
  const winScroll = document.documentElement.scrollTop;
  const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  progressBar.style.width = (height > 0 ? (winScroll / height) * 100 : 0) + '%';
}, { passive: true });

// Navbar scroll effect
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });
}

// Hamburger toggle
window.toggleMenu = function() {
  const links = document.getElementById('navLinks');
  const ham   = document.getElementById('hamburger');
  if (links) links.classList.toggle('open');
  if (ham)   ham.classList.toggle('open');
};

// Close menu on nav link click
document.querySelectorAll('.nav-links a').forEach(a => {
  a.addEventListener('click', () => {
    document.getElementById('navLinks')?.classList.remove('open');
    document.getElementById('hamburger')?.classList.remove('open');
  });
});

// Intersection Observer — fade-up
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
  });
}, { threshold: 0.1 });
document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

// Counter animation
function animateCounters() {
  document.querySelectorAll('.stat-num[data-target]').forEach(el => {
    const target   = +el.dataset.target;
    const duration = 2000;
    let start      = null;
    const ease     = t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
    const step     = ts => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      el.textContent = Math.floor(ease(p) * target);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target;
    };
    requestAnimationFrame(step);
  });
}

// The "UNSCRIPTED" preloader covers the page for >= 5s. On phones the stats
// strip is already on screen at load, so without this the count-up would run
// (and finish) invisibly behind the overlay. Resolves as the overlay starts
// fading out (or right away if there is none).
function whenPreloaderDone() {
  return new Promise(resolve => {
    const overlay = document.getElementById('app-preloader');
    if (!overlay || !overlay.isConnected) { resolve(); return; }
    const done = () => { mo.disconnect(); clearTimeout(safety); resolve(); };
    const check = () => {
      if (!overlay.isConnected || overlay.classList.contains('hide')) done();
    };
    const mo = new MutationObserver(check);
    mo.observe(overlay, { attributes: true, attributeFilter: ['class'] });
    mo.observe(document.body, { childList: true });
    const safety = setTimeout(done, 9000);   // never leave the numbers at 0
    check();
  });
}

const statsBar = document.querySelector('.stats-bar');
if (statsBar) {
  const inView = new Promise(resolve => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { obs.disconnect(); resolve(); }
    }, { threshold: 0.3 });
    obs.observe(statsBar);
  });
  Promise.all([inView, whenPreloaderDone()]).then(animateCounters);
}

// Service Worker — register, actively check for updates, and reload
// automatically the moment a new version takes control. This is what makes
// every visitor (not just first-time ones) land on the latest deploy.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        // Ask the browser to check sw.js for changes right now, instead of
        // waiting for its own internal timer.
        reg.update().catch(() => {});
      })
      .catch(() => {});
  });

  // A new service worker just activated and took control of this page —
  // reload once so every asset on screen comes from the new version.
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });
}
}
