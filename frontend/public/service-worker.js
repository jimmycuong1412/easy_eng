/**
 * Service Worker for Push Notifications
 *
 * Handles push notifications and background sync
 * Task: T174 - Configure web push
 */

// Service Worker version
const VERSION = '1.0.0';
const CACHE_NAME = `easy-eng-${VERSION}`;

// ============================================================================
// Install Event
// ============================================================================

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing version:', VERSION);

  // Skip waiting to activate immediately
  self.skipWaiting();
});

// ============================================================================
// Activate Event
// ============================================================================

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating version:', VERSION);

  // Clean up old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );

  // Claim all clients immediately
  return self.clients.claim();
});

// ============================================================================
// Push Event
// ============================================================================

self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event);

  let notificationData = {
    title: 'Easy English',
    body: 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'default',
    requireInteraction: false,
    data: {},
  };

  // Parse push data
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data,
      };
    } catch (error) {
      console.error('[Service Worker] Error parsing push data:', error);
      notificationData.body = event.data.text();
    }
  }

  // Show notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data,
      actions: notificationData.actions || [],
      vibrate: [200, 100, 200],
    })
  );
});

// ============================================================================
// Notification Click Event
// ============================================================================

self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);

  event.notification.close();

  // Handle action buttons
  if (event.action) {
    console.log('[Service Worker] Action clicked:', event.action);

    // Handle specific actions
    switch (event.action) {
      case 'view':
        if (event.notification.data?.url) {
          event.waitUntil(
            clients.openWindow(event.notification.data.url)
          );
        }
        break;

      case 'dismiss':
        // Just close the notification
        break;

      default:
        break;
    }
  } else {
    // Default click behavior - open app or focus existing window
    event.waitUntil(
      clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if there's already a window open
          for (const client of clientList) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              // Navigate to notification URL if provided
              if (event.notification.data?.url) {
                client.navigate(event.notification.data.url);
              }
              return client.focus();
            }
          }

          // No window open, open a new one
          if (clients.openWindow) {
            const url = event.notification.data?.url || '/';
            return clients.openWindow(url);
          }
        })
    );
  }
});

// ============================================================================
// Notification Close Event
// ============================================================================

self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notification closed:', event);

  // Track notification dismissal
  if (event.notification.data?.tracking_id) {
    // Could send analytics event here
    console.log('[Service Worker] Notification dismissed:', event.notification.data.tracking_id);
  }
});

// ============================================================================
// Background Sync (Optional)
// ============================================================================

self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);

  if (event.tag === 'sync-notifications') {
    event.waitUntil(
      // Could fetch latest notifications here
      Promise.resolve()
    );
  }
});

// ============================================================================
// Message Event (Communication with App)
// ============================================================================

self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all window clients
 */
async function getAllClients() {
  const clientList = await clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });
  return clientList;
}

/**
 * Send message to all clients
 */
async function broadcastMessage(message) {
  const clientList = await getAllClients();
  clientList.forEach((client) => {
    client.postMessage(message);
  });
}

console.log('[Service Worker] Loaded version:', VERSION);
