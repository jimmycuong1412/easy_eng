/**
 * Notification List Component
 *
 * Displays a list of notifications with actions
 * Task: T173 - Create notification list component
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { X, ExternalLink } from 'lucide-react';
import type { Notification } from '@/hooks/useRealtimeNotifications';

// ============================================================================
// Types
// ============================================================================

interface NotificationListProps {
  notifications: Notification[];
  onMarkAsRead: (notificationId: string) => Promise<void>;
  onDelete: (notificationId: string) => Promise<void>;
  compact?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format time ago
 */
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
    }
  }

  return 'Just now';
}

/**
 * Get notification color classes
 */
function getColorClasses(color?: string): string {
  const colorMap: Record<string, string> = {
    red: 'bg-red-50 border-red-200 text-red-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    purple: 'bg-purple-50 border-purple-200 text-purple-900',
    orange: 'bg-orange-50 border-orange-200 text-orange-900',
    gray: 'bg-gray-50 border-gray-200 text-gray-900',
  };

  return colorMap[color || 'gray'] || colorMap.gray;
}

/**
 * Get priority indicator
 */
function getPriorityIndicator(priority: string): React.ReactNode {
  if (priority === 'urgent') {
    return <span className="absolute top-0 right-0 flex h-3 w-3">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
    </span>;
  }

  if (priority === 'high') {
    return <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-orange-500"></span>;
  }

  return null;
}

// ============================================================================
// Component
// ============================================================================

export default function NotificationList({
  notifications,
  onMarkAsRead,
  onDelete,
  compact = false,
}: NotificationListProps) {
  const router = useRouter();

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      try {
        await onMarkAsRead(notification.id);
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    }

    // Navigate to action URL if provided
    if (notification.action_url) {
      router.push(notification.action_url);
    }
  };

  const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();

    try {
      await onDelete(notificationId);
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  if (notifications.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">No notifications</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {notifications.map(notification => {
        const isExpired = notification.expires_at && new Date(notification.expires_at) < new Date();

        if (isExpired) return null;

        return (
          <div
            key={notification.id}
            className={`
              relative cursor-pointer transition-colors
              ${notification.read ? 'bg-white' : 'bg-blue-50'}
              ${notification.action_url ? 'hover:bg-gray-50' : ''}
              ${compact ? 'p-3' : 'p-4'}
            `}
            onClick={() => handleNotificationClick(notification)}
          >
            {/* Priority Indicator */}
            {getPriorityIndicator(notification.priority)}

            {/* Delete Button */}
            <button
              onClick={(e) => handleDelete(e, notification.id)}
              className="absolute top-2 right-2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Delete notification"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex gap-3">
              {/* Icon */}
              {notification.icon && (
                <div className={`
                  flex-shrink-0 flex items-center justify-center
                  ${compact ? 'h-8 w-8 text-lg' : 'h-10 w-10 text-xl'}
                  rounded-full border
                  ${getColorClasses(notification.color)}
                `}>
                  {notification.icon}
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className={`
                      font-semibold text-gray-900
                      ${compact ? 'text-sm' : 'text-base'}
                    `}>
                      {notification.title}
                    </p>

                    <p className={`
                      text-gray-600 mt-0.5
                      ${compact ? 'text-xs' : 'text-sm'}
                    `}>
                      {notification.message}
                    </p>

                    {/* Action Label */}
                    {notification.action_label && notification.action_url && (
                      <div className="mt-2 flex items-center gap-1 text-blue-600 hover:text-blue-700">
                        <span className={compact ? 'text-xs' : 'text-sm'}>
                          {notification.action_label}
                        </span>
                        <ExternalLink className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Metadata */}
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                  <span>{formatTimeAgo(notification.created_at)}</span>

                  {!notification.read && (
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                      Unread
                    </span>
                  )}

                  {notification.priority === 'urgent' && (
                    <span className="font-semibold text-red-600">URGENT</span>
                  )}

                  {notification.priority === 'high' && (
                    <span className="font-semibold text-orange-600">High Priority</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
