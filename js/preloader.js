import { gsap } from 'gsap';

const MIN_DISPLAY_MS = 2000;

function initPreloader() {
  const el = document.getElementById('app-preloader');
  if (!el) return;
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPreloader);
} else {
  initPreloader();
}
