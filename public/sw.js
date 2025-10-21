/* Basic placeholder; we’ll expand when sending push */
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}
  const title = data.title || 'PlayCove';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    data: data.url ? { url: data.url } : {}
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
