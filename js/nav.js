// js/nav.js — Navbar scroll, hamburger, scroll animations, counters

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

const statsBar = document.querySelector('.stats-bar');
if (statsBar) {
  const obs = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { animateCounters(); obs.disconnect(); }
  }, { threshold: 0.3 });
  obs.observe(statsBar);
}

// Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
