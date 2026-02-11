// SoulPrint Service Worker — push notifications only
// No page caching — let Vercel/browser handle cache with proper headers

self.addEventListener('install', () => {
  // Take over immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Clear any old caches from previous versions
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(cacheNames.map((name) => caches.delete(name)))
    )
  );
  self.clients.claim();
});

// No fetch handler — let the browser handle all requests normally

// Handle push notifications
self.addEventListener('push', (event) => {
  let data = { title: 'SoulPrint', body: 'You have a notification', url: '/' };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch {
    data.body = event.data ? event.data.text() : 'New notification from SoulPrint';
  }

  const options = {
    body: data.body,
    icon: '/images/soulprintlogomain.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'SoulPrint', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
