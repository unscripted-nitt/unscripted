// js/data-cache.js — cache-first, revalidate-in-background helper.
//
// Pattern: on every page load, render whatever is in localStorage instantly
// (no dashes / no spinner), then fetch fresh data in the background. If the
// fresh data differs from what's cached, re-render and overwrite the cache.
// If it's identical, do nothing (avoids a pointless re-render/flicker).
//
// Usage:
//   cachedFetch('events', () => fetchEventsFromFirestore(), (data) => renderEvents(data));

const NS = 'unscripted-cache:';

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return h.toString(36);
}

function readCache(key) {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function writeCache(key, data, hash) {
  try {
    localStorage.setItem(NS + key, JSON.stringify({ data, hash, savedAt: Date.now() }));
  } catch (_) {
    // storage full or unavailable — fail silently, cache is a bonus, not critical
  }
}

/**
 * @param {string} key - unique cache key, e.g. 'events', 'gallery', 'pathways'
 * @param {() => Promise<any>} fetchFn - fetches fresh data (e.g. from Firestore)
 * @param {(data: any, fromCache: boolean) => void} onData - called once with cache (if present), then again with fresh data if it changed
 */
export async function cachedFetch(key, fetchFn, onData) {
  const cached = readCache(key);
  if (cached) {
    onData(cached.data, true);
  }

  try {
    const fresh = await fetchFn();
    const freshHash = hashString(JSON.stringify(fresh));

    if (!cached || freshHash !== cached.hash) {
      onData(fresh, false);
      writeCache(key, fresh, freshHash);
    }
  } catch (err) {
    if (!cached) throw err; // no fallback available — let the caller show an error state
    console.warn(`data-cache: revalidation failed for "${key}", showing cached copy`, err);
  }
}

/** Clears one cached key, or the whole namespace if no key is given. */
export function clearCache(key) {
  try {
    if (key) {
      localStorage.removeItem(NS + key);
      return;
    }
    Object.keys(localStorage)
      .filter(k => k.startsWith(NS))
      .forEach(k => localStorage.removeItem(k));
  } catch (_) {}
}
