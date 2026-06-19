/**
 * Notification Center Component
 * 
 * Toast notifications for user feedback
 */

'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { useNotificationStore } from '@/stores/notificationStore';

const iconMap = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const colorMap = {
  success: 'bg-success/10 border-success/20 text-success',
  error: 'bg-error/10 border-error/20 text-error',
  warning: 'bg-warning/10 border-warning/20 text-warning',
  info: 'bg-info/10 border-info/20 text-info',
};

export default function NotificationCenter() {
  const { notifications, removeNotification } = useNotificationStore();

  return (
    <div
      className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-md"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      aria-atomic="false"
    >
      <AnimatePresence>
        {notifications.map((notification) => {
          const Icon = iconMap[notification.type];

          return (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              role={notification.type === 'error' ? 'alert' : 'status'}
              className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg backdrop-blur-sm ${
                colorMap[notification.type]
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />

              <div className="flex-1 min-w-0">
                {notification.title && (
                  <h4 className="font-semibold text-sm mb-1">{notification.title}</h4>
                )}
                <p className="text-sm opacity-90">{notification.message}</p>
              </div>

              <button
                onClick={() => removeNotification(notification.id)}
                className="flex-shrink-0 p-1 hover:bg-black/10 rounded transition-colors"
                aria-label={`Dismiss ${notification.title || notification.message}`}
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
