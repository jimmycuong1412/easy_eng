/**
 * Create Notification Edge Function
 *
 * Creates in-app notifications for users
 * Task: T170 - Create notification creation Edge Function
 *
 * Called by other services to send notifications
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ============================================================================
// Types
// ============================================================================

type NotificationType =
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'class_reminder'
  | 'gems_earned'
  | 'xp_earned'
  | 'achievement_unlocked'
  | 'level_up'
  | 'class_started'
  | 'class_ended'
  | 'payment_received'
  | 'system_announcement'
  | 'friend_request'
  | 'message_received';

type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

interface CreateNotificationRequest {
  user_id: string | string[]; // Can send to multiple users
  type: NotificationType;
  title: string;
  message: string;
  action_url?: string;
  action_label?: string;
  related_id?: string;
  related_type?: string;
  metadata?: Record<string, any>;
  icon?: string;
  color?: string;
  priority?: NotificationPriority;
  expires_at?: string;
}

interface NotificationResult {
  success: boolean;
  notification_ids?: string[];
  error?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get default icon for notification type
 */
function getDefaultIcon(type: NotificationType): string {
  const iconMap: Record<NotificationType, string> = {
    'booking_confirmed': '✓',
    'booking_cancelled': '✗',
    'class_reminder': '⏰',
    'gems_earned': '💎',
    'xp_earned': '⭐',
    'achievement_unlocked': '🏆',
    'level_up': '🎉',
    'class_started': '🎥',
    'class_ended': '👋',
    'payment_received': '💰',
    'system_announcement': '📢',
    'friend_request': '👤',
    'message_received': '💬',
  };

  return iconMap[type] || '🔔';
}

/**
 * Get default color for notification type
 */
function getDefaultColor(type: NotificationType): string {
  const colorMap: Record<NotificationType, string> = {
    'booking_confirmed': 'green',
    'booking_cancelled': 'red',
    'class_reminder': 'orange',
    'gems_earned': 'yellow',
    'xp_earned': 'blue',
    'achievement_unlocked': 'purple',
    'level_up': 'purple',
    'class_started': 'blue',
    'class_ended': 'gray',
    'payment_received': 'green',
    'system_announcement': 'blue',
    'friend_request': 'blue',
    'message_received': 'blue',
  };

  return colorMap[type] || 'gray';
}

// ============================================================================
// Main Logic
// ============================================================================

/**
 * Create notification for a single user
 */
async function createNotification(request: CreateNotificationRequest, userId: string): Promise<string> {
  const { error, data } = await supabase.rpc('create_notification', {
    p_user_id: userId,
    p_type: request.type,
    p_title: request.title,
    p_message: request.message,
    p_action_url: request.action_url || null,
    p_action_label: request.action_label || null,
    p_related_id: request.related_id || null,
    p_related_type: request.related_type || null,
    p_metadata: request.metadata || {},
    p_icon: request.icon || getDefaultIcon(request.type),
    p_color: request.color || getDefaultColor(request.type),
    p_priority: request.priority || 'normal',
    p_expires_at: request.expires_at || null,
  });

  if (error) {
    throw new Error(`Failed to create notification: ${error.message}`);
  }

  return data as string;
}

/**
 * Create notifications for multiple users
 */
async function createBulkNotifications(request: CreateNotificationRequest): Promise<NotificationResult> {
  try {
    const userIds = Array.isArray(request.user_id) ? request.user_id : [request.user_id];

    const notificationIds: string[] = [];
    const errors: string[] = [];

    // Create notification for each user
    for (const userId of userIds) {
      try {
        const notificationId = await createNotification(request, userId);
        notificationIds.push(notificationId);
        console.log(`Created notification ${notificationId} for user ${userId}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${userId}: ${errorMsg}`);
        console.error(`Failed to create notification for user ${userId}:`, error);
      }
    }

    if (notificationIds.length === 0) {
      return {
        success: false,
        error: `Failed to create notifications: ${errors.join(', ')}`,
      };
    }

    return {
      success: true,
      notification_ids: notificationIds,
    };
  } catch (error) {
    console.error('Error in createBulkNotifications:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// HTTP Handler
// ============================================================================

serve(async (req: Request) => {
  try {
    // Verify request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const request: CreateNotificationRequest = await req.json();

    // Validate required fields
    if (!request.user_id || !request.type || !request.title || !request.message) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: user_id, type, title, message',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating notification:', {
      users: Array.isArray(request.user_id) ? request.user_id.length : 1,
      type: request.type,
      title: request.title,
    });

    // Create notifications
    const result = await createBulkNotifications(request);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        notification_ids: result.notification_ids,
        count: result.notification_ids?.length || 0,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in create-notification function:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================================================
// Deployment Notes
// ============================================================================

/*
To deploy this function:

1. Deploy the function:
   supabase functions deploy create-notification

2. Test the function:
   curl -X POST https://your-project.supabase.co/functions/v1/create-notification \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "user_id": "user-uuid",
       "type": "booking_confirmed",
       "title": "Booking Confirmed",
       "message": "Your class has been confirmed!",
       "action_url": "/bookings/123",
       "action_label": "View Booking",
       "priority": "high"
     }'

3. Create notifications in other Edge Functions:
   await fetch(`${SUPABASE_URL}/functions/v1/create-notification`, {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
       'Content-Type': 'application/json',
     },
     body: JSON.stringify({
       user_id: userId,
       type: 'gems_earned',
       title: 'You Earned Gems!',
       message: 'You earned 10 Gems for completing the class',
       related_id: transactionId,
       related_type: 'gem_transaction',
       metadata: { gems: 10, xp: 50 },
     }),
   });

4. Send to multiple users:
   {
     "user_id": ["user1-uuid", "user2-uuid", "user3-uuid"],
     "type": "system_announcement",
     "title": "System Maintenance",
     "message": "The platform will be under maintenance tonight"
   }
*/
