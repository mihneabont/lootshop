// Service worker: shows web push notifications and opens the right page on tap.
// URLs are resolved against the scope, so the site can live under a sub-path.
const scope = self.registration.scope;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Loot Shop', body: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Loot Shop', {
      body: data.body,
      icon: new URL('icons/icon-192.png', scope).href,
      badge: new URL('icons/badge-96.png', scope).href,
      data: { url: data.url || '' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data?.url || '').replace(/^\//, ''), scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const w of windows) {
        if (w.url.startsWith(scope) && 'focus' in w) {
          w.navigate(url);
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
