/**
 * Push Notification Utilities
 *
 * Handles push notification subscription and management
 * Task: T175 - Create push notification subscription
 */

// ============================================================================
// Types
// ============================================================================

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface SubscriptionResult {
  success: boolean;
  subscription?: PushSubscriptionData;
  error?: string;
}

// ============================================================================
// Configuration
// ============================================================================

// VAPID public key - must be generated on server
// Generate with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

// ============================================================================
// Service Worker Registration
// ============================================================================

/**
 * Register service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
    });

    // Service Worker registered successfully

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Unregister service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const success = await registration.unregister();
      // Service Worker unregistered
      return success;
    }
    return false;
  } catch (error) {
    console.error('Service Worker unregistration failed:', error);
    return false;
  }
}

// ============================================================================
// Push Notification Permission
// ============================================================================

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  try {
    const permission = await Notification.requestPermission();
    // Notification permission result received
    return permission;
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return 'denied';
  }
}

// ============================================================================
// Push Subscription Management
// ============================================================================

/**
 * Convert VAPID public key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\\-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications(): Promise<SubscriptionResult> {
  try {
    // Check support
    if (!isPushSupported()) {
      return {
        success: false,
        error: 'Push notifications not supported in this browser',
      };
    }

    // Check VAPID key
    if (!VAPID_PUBLIC_KEY) {
      return {
        success: false,
        error: 'VAPID public key not configured',
      };
    }

    // Request permission
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        error: 'Notification permission denied',
      };
    }

    // Register service worker
    const registration = await registerServiceWorker();
    if (!registration) {
      return {
        success: false,
        error: 'Failed to register service worker',
      };
    }

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();

    // Subscribe if not already subscribed
    if (!subscription) {
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
      });

      // Push subscription created
    } else {
      // Already subscribed to push
    }

    // Convert subscription to storable format
    const subscriptionData: PushSubscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
        auth: arrayBufferToBase64(subscription.getKey('auth')!),
      },
    };

    return {
      success: true,
      subscription: subscriptionData,
    };
  } catch (error) {
    console.error('Push subscription failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator)) {
      return false;
    }

    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      return false;
    }

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      return true; // Already unsubscribed
    }

    const success = await subscription.unsubscribe();
    // Push unsubscription completed
    return success;
  } catch (error) {
    console.error('Push unsubscription failed:', error);
    return false;
  }
}

/**
 * Get current push subscription
 */
export async function getCurrentPushSubscription(): Promise<PushSubscriptionData | null> {
  try {
    if (!('serviceWorker' in navigator)) {
      return null;
    }

    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      return null;
    }

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      return null;
    }

    return {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
        auth: arrayBufferToBase64(subscription.getKey('auth')!),
      },
    };
  } catch (error) {
    console.error('Failed to get push subscription:', error);
    return null;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert ArrayBuffer to Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Test push notification
 */
export async function sendTestNotification(title: string, body: string): Promise<boolean> {
  try {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      return false;
    }

    const registration = await registerServiceWorker();
    if (!registration) {
      return false;
    }

    await registration.showNotification(title, {
      body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: 'test-notification',
    } as NotificationOptions);

    return true;
  } catch (error) {
    console.error('Test notification failed:', error);
    return false;
  }
}

// ============================================================================
// Server Integration
// ============================================================================

/**
 * Save subscription to server
 */
export async function savePushSubscriptionToServer(
  subscription: PushSubscriptionData,
  userId: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        subscription,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to save subscription to server:', error);
    return false;
  }
}

/**
 * Delete subscription from server
 */
export async function deletePushSubscriptionFromServer(userId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to delete subscription from server:', error);
    return false;
  }
}

// ============================================================================
// Complete Flow
// ============================================================================

/**
 * Complete push notification setup
 */
export async function setupPushNotifications(userId: string): Promise<SubscriptionResult> {
  try {
    // Subscribe to push
    const result = await subscribeToPushNotifications();
    if (!result.success || !result.subscription) {
      return result;
    }

    // Save to server
    const saved = await savePushSubscriptionToServer(result.subscription, userId);
    if (!saved) {
      return {
        success: false,
        error: 'Failed to save subscription to server',
      };
    }

    return result;
  } catch (error) {
    console.error('Push notification setup failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Complete push notification teardown
 */
export async function teardownPushNotifications(userId: string): Promise<boolean> {
  try {
    // Delete from server
    await deletePushSubscriptionFromServer(userId);

    // Unsubscribe from push
    const unsubscribed = await unsubscribeFromPushNotifications();

    return unsubscribed;
  } catch (error) {
    console.error('Push notification teardown failed:', error);
    return false;
  }
}
