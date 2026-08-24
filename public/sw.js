// Maths Manthra — Service Worker v1.1
// Handles caching, offline fallback, push notifications, and background sync

const CACHE_NAME = 'mathsmanthra-v2';
const OFFLINE_URL = '/offline';

// Assets to precache on install
const PRECACHE_ASSETS = [
  '/offline',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
];

// ─── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== 'GET') return;
  if (!url.origin.includes(self.location.origin) &&
      !url.origin.includes('fonts.googleapis.com') &&
      !url.origin.includes('fonts.gstatic.com') &&
      !url.origin.includes('cdn.tailwindcss.com') &&
      !url.origin.includes('cdn.jsdelivr.net')) return;

  // Static assets: cache-first strategy
  if (
    url.pathname.startsWith('/css/') ||
    url.pathname.startsWith('/js/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/') ||
    url.origin.includes('fonts.gstatic.com') ||
    url.origin.includes('cdn.tailwindcss.com') ||
    url.origin.includes('cdn.jsdelivr.net')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Navigation requests: network-first, fallback to offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
    return;
  }
});

// ─── Push Notifications ───────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {
    title: 'Maths Manthra',
    body: 'You have a new notification.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    url: '/dashboard',
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    data: { url: data.url },
    vibrate: [200, 100, 200],
    requireInteraction: false,
    tag: data.tag || 'mathsmanthra-notification',
    actions: [
      { action: 'view', title: '👀 View' },
      { action: 'dismiss', title: '✕ Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ─── Notification Click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const url = event.notification.data?.url || '/dashboard';

  if (action === 'dismiss') return;

  // Focus existing tab or open new one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
