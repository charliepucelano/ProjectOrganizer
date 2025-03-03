self.addEventListener('push', event => {
  console.log('Push event received:', event);

  try {
    const data = event.data.json();
    console.log('Push data:', data);

    const options = {
      body: data.body,
      icon: '/notification-icon.png',
      badge: '/notification-badge.png',
      data: data.url,
      actions: [
        {
          action: 'open',
          title: 'View Tasks'
        }
      ]
    };

    console.log('Showing notification with options:', options);
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (error) {
    console.error('Error handling push event:', error);
  }
});

self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event);
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow(event.notification.data)
    );
  }
});

// Log when the service worker is installed
self.addEventListener('install', event => {
  console.log('Service Worker installed');
});

// Log when the service worker is activated
self.addEventListener('activate', event => {
  console.log('Service Worker activated');
});