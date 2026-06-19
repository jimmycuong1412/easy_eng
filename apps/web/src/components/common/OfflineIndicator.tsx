/**
 * Offline Indicator Component (T228)
 *
 * Displays connection status and enables graceful degradation for offline scenarios
 */

'use client';

import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Set initial online status
    setIsOnline(navigator.onLine);

    // Handler for online event
    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);

      // Hide "back online" message after 3 seconds
      setTimeout(() => {
        setWasOffline(false);
      }, 3000);
    };

    // Handler for offline event
    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(false);
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className="fixed top-0 left-0 right-0 z-[200] bg-warning/90 backdrop-blur-sm border-b border-warning"
        >
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-center gap-3">
            <WifiOff className="w-5 h-5 text-white" aria-hidden="true" />
            <p className="text-white font-medium text-sm">
              You are currently offline. Some features may be unavailable.
            </p>
          </div>
        </motion.div>
      )}

      {isOnline && wasOffline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="fixed top-0 left-0 right-0 z-[200] bg-success/90 backdrop-blur-sm border-b border-success"
        >
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-center gap-3">
            <Wifi className="w-5 h-5 text-white" aria-hidden="true" />
            <p className="text-white font-medium text-sm">
              You're back online!
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook for checking online status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Wrapper component that disables children when offline
 */
export function OnlineOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const isOnline = useOnlineStatus();

  if (!isOnline) {
    return fallback || (
      <div
        role="alert"
        aria-live="polite"
        className="p-4 bg-warning/10 border border-warning/20 rounded-lg text-center"
      >
        <WifiOff className="w-8 h-8 text-warning mx-auto mb-2" aria-hidden="true" />
        <p className="text-warning">This feature requires an internet connection.</p>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Hook for offline-aware data fetching
 */
export function useOfflineAwareFetch<T>(
  fetchFn: () => Promise<T>,
  options?: {
    offlineFallback?: T;
    refetchOnReconnect?: boolean;
  }
) {
  const [data, setData] = useState<T | null>(options?.offlineFallback || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (!isOnline) {
      setLoading(false);
      setError(new Error('Network offline'));
      return;
    }

    setLoading(true);
    setError(null);

    fetchFn()
      .then((result) => {
        setData(result);
        setError(null);
      })
      .catch((err) => {
        setError(err);
      })
      .finally(() => {
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, options?.refetchOnReconnect]);

  return { data, loading, error, isOnline };
}

export default OfflineIndicator;
