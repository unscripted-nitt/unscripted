// js/preloader.js — animates and dismisses the "UNSCRIPTED" intro screen.
//
// The overlay itself is static HTML (the very first thing in <body> on
// every page), styled by the render-blocking preloader.css stylesheet —
// so it's already on screen before this script even runs. This file's only
// job is: play a small entrance animation, wait for the real page to be
// ready (and a minimum display time), then fade the overlay out and remove
// it from the DOM.
import { gsap } from 'gsap';

// First page of a browser session gets the full intro; every page after that
// (and any page marked data-preloader="short", e.g. login) gets a quick flash.
// Both are purely time-based: never wait on images/network here, that's what
// made the old version hold pages for 5s+.
const FULL_VISIBLE_MS = 2500;
const SHORT_VISIBLE_MS = 600;
const SESSION_KEY = 'unscripted-preloader-shown';

/** Resolves after at least `ms` milliseconds have passed since `since`. */
function whenMinimumTimeElapsed(since, ms) {
  const remaining = ms - (Date.now() - since);
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, remaining)));
}

function playEntranceAnimation(textEl, short) {
  if (short) {
    return gsap.to(textEl, { opacity: 1, scale: 1, duration: 0.25, ease: 'power2.out' }).then();
  }
  // Solid text that slowly fades/scales in, then starts a looping shine
  // sweep for the rest of the preloader's time on screen.
  return gsap.timeline()
    .to(textEl, { opacity: 1, scale: 1, duration: 1.3, ease: 'power2.out' })
    .then(() => { textEl.classList.add('shine'); });
}

function dismiss(overlayEl, short) {
  if (short) overlayEl.classList.add('quick');
  overlayEl.classList.add('hide');
  return new Promise((resolve) => {
    setTimeout(() => {
      overlayEl.remove();
      resolve();
    }, short ? 280 : 550); // matches the CSS transition durations on .hide / .quick.hide
  });
}

async function runPreloader() {
  const overlay = document.getElementById('app-preloader');
  if (!overlay) return; // page is missing the static markup — nothing to do

  let alreadyShown = false;
  try {
    alreadyShown = sessionStorage.getItem(SESSION_KEY) === '1';
  } catch { /* sessionStorage unavailable — treat as not shown */ }

  const reduceMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    overlay.remove();
    return;
  }

  const short = alreadyShown || overlay.dataset.preloader === 'short';
  const textEl = overlay.querySelector('.preloader-text');
  const shownAt = Date.now();

  // Only the full intro counts as "shown": landing on login first still
  // gives the full intro when the visitor then opens the home page.
  if (!short) {
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch { /* ignore */ }
  }

  await playEntranceAnimation(textEl, short);
  await whenMinimumTimeElapsed(shownAt, short ? SHORT_VISIBLE_MS : FULL_VISIBLE_MS);
  await dismiss(overlay, short);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runPreloader);
} else {
  runPreloader();
}
