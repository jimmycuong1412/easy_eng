/**
 * Notification Store
 * 
 * Zustand store for managing toast notifications
 */

import { create } from 'zustand';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],

  addNotification: (notification) => {
    const id = Math.random().toString(36).substring(7);
    const duration = notification.duration || 5000;

    set((state) => ({
      notifications: [
        ...state.notifications,
        {
          ...notification,
          id,
        },
      ],
    }));

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      }, duration);
    }
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  clearAll: () => {
    set({ notifications: [] });
  },
}));

/**
 * Helper hook for easy notification creation
 */
export function useNotifications() {
  const { addNotification } = useNotificationStore();

  return {
    success: (message: string, title?: string) => 
      addNotification({ type: 'success', message, title }),
    
    error: (message: string, title?: string) => 
      addNotification({ type: 'error', message, title }),
    
    warning: (message: string, title?: string) => 
      addNotification({ type: 'warning', message, title }),
    
    info: (message: string, title?: string) => 
      addNotification({ type: 'info', message, title }),
  };
}
