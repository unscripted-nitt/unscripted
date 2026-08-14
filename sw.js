// sw.js — Service Worker for Unscripted NITT PWA
// Provides offline caching and push notification support

const CACHE_NAME = 'unscripted-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/preloader.css',
  '/css/theme-toggle.css',
  '/css/gooey-nav.css',
  '/css/stack-gallery.css',
  '/js/nav.js',
  '/js/preloader.js',
  '/js/theme-toggle.js',
  '/js/gooey-nav.js',
  '/js/stack-gallery.js',
  '/js/data-cache.js',
  '/icons/logo.png',
  '/manifest.json',
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

// Fetch — stale-while-revalidate: serve the cached copy instantly (fast load),
// then re-fetch in the background and overwrite the cache if the file changed.
// Firestore/auth calls are never intercepted — those always go to the network.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('firebasejs') || event.request.url.includes('googleapis') || event.request.url.includes('firestore')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(event.request);

      const networkFetch = fetch(event.request)
        .then(response => {
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        })
        .catch(() => cached || new Response('', { status: 503 }));

      // Return cache immediately if we have it; otherwise wait on the network.
      return cached || networkFetch;
    })
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

// Notification click — open app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
