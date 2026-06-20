'use client';
/**
 * Realtime Notifications Hook
 *
 * Subscribes to realtime notifications using Supabase Realtime
 * Task: T171 - Setup Supabase Realtime for notifications
 */


import { useEffect, useState, useCallback } from 'react';
import { createClient } from '../adapters/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ============================================================================
// Types
// ============================================================================

export interface RealtimeNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  action_url?: string;
  action_label?: string;
  related_id?: string;
  related_type?: string;
  metadata?: Record<string, any>;
  icon?: string;
  color?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  read: boolean;
  read_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UseRealtimeNotificationsReturn {
  notifications: RealtimeNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useRealtimeNotifications(userId?: string): UseRealtimeNotificationsReturn {
  const supabase = createClient();

  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [_channel, setChannel] = useState<RealtimeChannel | null>(null);

  /**
   * Fetch initial notifications
   */
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      const targetUserId = userId || user?.id;

      if (!targetUserId) {
        throw new Error('No user ID available');
      }

      // Fetch notifications
      const { data, error: fetchError } = await (supabase as any)
        .from('notifications')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      setNotifications(data || []);

      // Calculate unread count
      const unread = data?.filter((n: any) => !n.read && (!n.expires_at || new Date(n.expires_at) > new Date())).length || 0;
      setUnreadCount(unread);

      setLoading(false);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
      setLoading(false);
    }
  }, [supabase, userId]);

  /**
   * Subscribe to realtime updates
   */
  useEffect(() => {
    let realtimeChannel: RealtimeChannel | null = null;

    const setupRealtime = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const targetUserId = userId || user?.id;

        if (!targetUserId) {
          console.warn('No user ID for realtime subscription');
          return;
        }

        // Initial fetch
        await fetchNotifications();

        // Subscribe to realtime changes
        realtimeChannel = supabase
          .channel(`notifications:${targetUserId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${targetUserId}`,
            },
            (payload) => {
              // New notification received
              const newNotification = payload.new as RealtimeNotification;

              setNotifications(prev => [newNotification, ...prev]);
              if (!newNotification.read) {
                setUnreadCount(prev => prev + 1);
              }

              // Show a browser notification on web if supported. Accessed via
              // globalThis so this compiles without the DOM lib (React Native);
              // on native `window`/Notification are absent and the block is
              // skipped (mobile push will use expo-notifications in Phase 7).
              const w = (globalThis as { window?: unknown }).window as
                | {
                    Notification?: {
                      new (title: string, opts?: unknown): unknown;
                      permission: string;
                    };
                  }
                | undefined;
              if (w?.Notification && w.Notification.permission === 'granted') {
                new w.Notification(newNotification.title, {
                  body: newNotification.message,
                  icon: '/icon-192x192.png',
                  tag: newNotification.id,
                });
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${targetUserId}`,
            },
            (payload) => {
              // Notification updated
              const updatedNotification = payload.new as RealtimeNotification;

              setNotifications(prev =>
                prev.map(n => (n.id === updatedNotification.id ? updatedNotification : n))
              );

              // Update unread count
              if (updatedNotification.read && !payload.old.read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${targetUserId}`,
            },
            (payload) => {
              // Notification deleted
              const deletedId = (payload.old as RealtimeNotification).id;

              setNotifications(prev => prev.filter(n => n.id !== deletedId));

              // Update unread count if deleted notification was unread
              if (!(payload.old as RealtimeNotification).read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
              }
            }
          )
          .subscribe();

        setChannel(realtimeChannel);
      } catch (err) {
        console.error('Error setting up realtime:', err);
      }
    };

    setupRealtime();

    // Cleanup
    return () => {
      if (realtimeChannel) {
        realtimeChannel.unsubscribe();
      }
    };
  }, [supabase, userId, fetchNotifications]);

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        const { error: updateError } = await (supabase as any)
          .from('notifications')
          .update({
            read: true,
            read_at: new Date().toISOString(),
          })
          .eq('id', notificationId);

        if (updateError) throw updateError;

        // Update local state
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId
              ? { ...n, read: true, read_at: new Date().toISOString() }
              : n
          )
        );

        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Error marking notification as read:', err);
        throw err;
      }
    },
    [supabase]
  );

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: updateError } = await (supabase as any)
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('read', false);

      if (updateError) throw updateError;

      // Update local state
      setNotifications(prev =>
        prev.map(n => ({
          ...n,
          read: true,
          read_at: n.read_at || new Date().toISOString(),
        }))
      );

      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
      throw err;
    }
  }, [supabase]);

  /**
   * Delete notification
   */
  const deleteNotification = useCallback(
    async (notificationId: string) => {
      try {
        const { error: deleteError } = await (supabase as any)
          .from('notifications')
          .delete()
          .eq('id', notificationId);

        if (deleteError) throw deleteError;

        // Update local state
        const notification = notifications.find(n => n.id === notificationId);
        setNotifications(prev => prev.filter(n => n.id !== notificationId));

        if (notification && !notification.read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      } catch (err) {
        console.error('Error deleting notification:', err);
        throw err;
      }
    },
    [supabase, notifications]
  );

  /**
   * Refresh notifications
   */
  const refresh = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
  };
}
