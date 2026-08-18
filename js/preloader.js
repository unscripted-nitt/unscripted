// js/preloader.js — animates and dismisses the "UNSCRIPTED" intro screen.
//
// The overlay itself is static HTML (the very first thing in <body> on
// every page), styled by the render-blocking preloader.css stylesheet —
// so it's already on screen before this script even runs. This file's only
// job is: play a small entrance animation, wait for the real page to be
// ready (and a minimum display time), then fade the overlay out and remove
// it from the DOM.
import { gsap } from 'gsap';

const MIN_VISIBLE_MS = 3000;

/** Resolves once the window's `load` event has fired (or immediately if it already has). */
function whenPageLoaded() {
  return new Promise((resolve) => {
    if (document.readyState === 'complete') {
      resolve();
      return;
    }
    window.addEventListener('load', () => resolve(), { once: true });
  });
}

/** Resolves after at least `ms` milliseconds have passed since `since`. */
function whenMinimumTimeElapsed(since, ms) {
  const remaining = ms - (Date.now() - since);
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, remaining)));
}

function playEntranceAnimation(textEl, reduceMotion) {
  if (reduceMotion) {
    gsap.set(textEl, { opacity: 1, scale: 1 });
    textEl.classList.add('shine');
    return Promise.resolve();
  }
  // Solid text that slowly fades/scales in, then starts a looping shine
  // sweep for the rest of the preloader's time on screen.
  return gsap.timeline()
    .to(textEl, { opacity: 1, scale: 1, duration: 1.3, ease: 'power2.out' })
    .then(() => { textEl.classList.add('shine'); });
}

function dismiss(overlayEl) {
  overlayEl.classList.add('hide');
  return new Promise((resolve) => {
    setTimeout(() => {
      overlayEl.remove();
      resolve();
    }, 550); // matches the CSS transition duration on .hide
  });
}

async function runPreloader() {
  const overlay = document.getElementById('app-preloader');
  if (!overlay) return; // page is missing the static markup — nothing to do

  const textEl = overlay.querySelector('.preloader-text');
  const reduceMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const shownAt = Date.now();

  await Promise.all([
    playEntranceAnimation(textEl, reduceMotion),
    whenPageLoaded(),
  ]);
  await whenMinimumTimeElapsed(shownAt, MIN_VISIBLE_MS);
  await dismiss(overlay);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runPreloader);
} else {
  runPreloader();
}
