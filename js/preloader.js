// js/preloader.js — shows a full-screen "UNSCRIPTED" stroke-draw animation
// while the page's real data is still loading, instead of dash placeholders.
// Vanilla-JS port of the StrokeText React component, built for this
// plain HTML + Vite site (no React here).
import { gsap } from 'gsap';

const MIN_DISPLAY_MS = 2000; // keep on screen at least 2s, per spec
const TEXT = 'UNSCRIPTED';

function buildPreloader() {
  const wrap = document.createElement('div');
  wrap.id = 'app-preloader';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = `
    <svg viewBox="0 0 900 200" preserveAspectRatio="xMidYMid meet">
      <text class="preloader-stroke" x="450" y="140" text-anchor="middle"
            font-family="'DM Sans', system-ui, sans-serif" font-weight="800" font-size="108" letter-spacing="2">${TEXT}</text>
      <text class="preloader-fill" x="450" y="140" text-anchor="middle"
            font-family="'DM Sans', system-ui, sans-serif" font-weight="800" font-size="108" letter-spacing="2">${TEXT}</text>
    </svg>`;
  document.body.prepend(wrap);
  return wrap;
}

function initPreloader() {
  if (document.getElementById('app-preloader')) return;
  const el = buildPreloader();
  const stroke = el.querySelector('.preloader-stroke');
  const fill = el.querySelector('.preloader-fill');

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

  // getComputedTextLength needs the node in the DOM, which it now is.
  let len = 2200;
  try { len = stroke.getComputedTextLength() * 1.4; } catch (_) {}

  gsap.set(stroke, { strokeDasharray: len, strokeDashoffset: len });
  gsap.set(fill, { opacity: 0 });

  gsap.timeline()
    .to(stroke, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.out' })
    .to(fill, { opacity: 1, duration: 0.5, ease: 'power2.out' }, '-=0.35');

  if (document.readyState === 'complete') hide();
  else window.addEventListener('load', hide, { once: true });
}

initPreloader();
