// js/preloader.js — shows a full-screen "UNSCRIPTED" intro while the page's
// real data is still loading, instead of dash placeholders.
import { gsap } from 'gsap';

const MIN_DISPLAY_MS = 2000;
const TEXT = 'UNSCRIPTED';

function buildPreloader() {
  const wrap = document.createElement('div');
  wrap.id = 'app-preloader';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = `<div class="preloader-text">${TEXT}</div>`;
  document.body.prepend(wrap);
  return wrap;
}

function initPreloader() {
  if (document.getElementById('app-preloader')) return;
  const el = buildPreloader();
  const text = el.querySelector('.preloader-text');

  const started = Date.now();
  const hide = () => {
    const elapsed = Date.now() - started;
    const wait = Math.max(0, MIN_DISPLAY_MS - elapsed);
    setTimeout(() => {
      el.classList.add('hide');
      setTimeout(() => el.remove(), 550);
    }, wait);
  };

  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    if (document.readyState === 'complete') hide();
    else window.addEventListener('load', hide, { once: true });
    return;
  }

  gsap.timeline()
    .to(text, { opacity: 1, scale: 1, duration: 0.7, ease: 'power2.out' })
    .to(text, { color: '#FF5722', duration: 0.6, ease: 'power2.out' }, '+=0.3');

  if (document.readyState === 'complete') hide();
  else window.addEventListener('load', hide, { once: true });
}

initPreloader();
