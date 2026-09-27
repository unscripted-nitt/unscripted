// sw.js — Service Worker for Unscripted NITT PWA
// Provides offline caching and push notification support

const CACHE_NAME = 'unscripted-v6';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/pages/login.html',
  '/pages/members.html',
  '/pages/videos.html',
];

// Install — cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => console.warn('Cache error:', err));
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - Hashed, immutable build assets (Vite's /assets/*) are cache-first: they
//   never change without a new hash, so re-downloading them on every
//   navigation is pure waste.
// - Everything else (HTML, unhashed static files) is network-first, so a
//   new deploy is always picked up, with the cache as an offline fallback.
// Firestore/auth calls are never intercepted — those always go straight to
// the network.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = event.request.url;
  if (url.includes('firebasejs') || url.includes('googleapis') || url.includes('firestore') || url.includes('/__/auth/')) return;

  const isHashedAsset = new URL(url).pathname.startsWith('/assets/');

  if (isHashedAsset) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => cached || new Response('', { status: 503 })))
  );
});

// Push notifications
self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Unscripted NITT', {
      body: data.body || 'Something new on Unscripted!',
      icon: '/icons/logo.png',
      badge: '/icons/logo.png',
      data: { url: data.url || '/' },
      vibrate: [200, 100, 200],
    })
  );
});

// Notification click — open app. The URL comes from a push payload, so it
// is only ever opened when it resolves to this same origin.
self.addEventListener('notificationclick', event => {
  event.notification.close();
  let url = '/';
  try {
    const candidate = new URL(event.notification.data?.url || '/', self.location.origin);
    if (candidate.origin === self.location.origin) url = candidate.href;
  } catch { /* keep default */ }
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
