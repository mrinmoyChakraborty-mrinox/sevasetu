/* firebase-messaging-sw.js */

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// This service worker is triggered for background notifications.
// It will be initialized with the config fetched from the main app.
// However, service workers don't have access to the main window's fetch easily without async init.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_CONFIG') {
    const config = event.data.config;
    if (!firebase.apps.length) {
      firebase.initializeApp(config);
      const messaging = firebase.messaging();
      
      messaging.onBackgroundMessage((payload) => {
        console.log('[sw] Background message received:', payload);
        const notificationTitle = payload.notification.title;
        const notificationOptions = {
          body: payload.notification.body,
          icon: '/static/images/logo.png', // Fallback icon
          data: payload.data
        };

        return self.registration.showNotification(notificationTitle, notificationOptions);
      });
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data;
  
  let urlToOpen = '/';
  if (data && data.click_action) {
    urlToOpen = data.click_action;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
