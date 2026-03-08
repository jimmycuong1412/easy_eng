/**
 * Real-time Gem Notifications Hook
 * Listens to gem_transactions table for new gem earnings
 * Triggers toast notifications when gems are earned
 */

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface GemNotification {
  id: string;
  activityType: string;
  gemsEarned: number;
  newBalance: number;
  timestamp: string;
}

interface UseGemNotificationsOptions {
  enabled?: boolean;
  onGemEarned?: (notification: GemNotification) => void;
}

export function useGemNotifications(options: UseGemNotificationsOptions = {}) {
  const { enabled = true, onGemEarned } = options;

  const [notifications, setNotifications] = useState<GemNotification[]>([]);
  const [latestNotification, setLatestNotification] = useState<GemNotification | null>(null);
  const [currentBalance, setCurrentBalance] = useState<number>(0);

  const supabase = createClient();

  useEffect(() => {
    if (!enabled) return;

    let channel: RealtimeChannel | null = null;

    const setupRealtimeListener = async () => {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.warn('No authenticated user for gem notifications');
        return;
      }

      // Fetch current balance
      const { data: balanceData, error: balanceError } = await supabase.rpc(
        'get_gems_balance',
        {
          p_user_id: user.id,
        }
      );

      if (!balanceError && balanceData !== null) {
        setCurrentBalance(balanceData);
      }

      // Subscribe to gem_transactions inserts for this user
      channel = supabase
        .channel('gem-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'gem_transactions',
            filter: `user_id=eq.${user.id}`,
          },
          async (payload) => {
            const newTransaction = payload.new;

            // Only notify for positive amounts (gems earned, not spent)
            if (newTransaction.amount > 0) {
              // Fetch updated balance
              const { data: newBalanceData } = await supabase.rpc(
                'get_gems_balance',
                {
                  p_user_id: user.id,
                }
              );

              const updatedBalance = newBalanceData || currentBalance + newTransaction.amount;

              const notification: GemNotification = {
                id: newTransaction.id,
                activityType: newTransaction.reason || newTransaction.transaction_type,
                gemsEarned: newTransaction.amount,
                newBalance: updatedBalance,
                timestamp: newTransaction.created_at,
              };

              setLatestNotification(notification);
              setNotifications((prev) => [notification, ...prev]);
              setCurrentBalance(updatedBalance);

              // Call optional callback
              if (onGemEarned) {
                onGemEarned(notification);
              }

              // Gem notification received
            }
          }
        )
        .subscribe();
    };

    setupRealtimeListener();

    // Cleanup
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, onGemEarned]);

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (latestNotification?.id === id) {
      setLatestNotification(null);
    }
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setLatestNotification(null);
  };

  return {
    notifications,
    latestNotification,
    currentBalance,
    clearNotification,
    clearAllNotifications,
  };
}

/**
 * Usage Example:
 *
 * function StudentDashboard() {
 *   const { latestNotification, currentBalance, clearNotification } = useGemNotifications({
 *     onGemEarned: (notification) => {
 *       console.log('Gems earned:', notification.gemsEarned);
 *     },
 *   });
 *
 *   return (
 *     <div>
 *       <p>Current Balance: {currentBalance} gems</p>
 *
 *       {latestNotification && (
 *         <GemEarnedToast
 *           activityType={latestNotification.activityType}
 *           gemsEarned={latestNotification.gemsEarned}
 *           newBalance={latestNotification.newBalance}
 *           onClose={() => clearNotification(latestNotification.id)}
 *         />
 *       )}
 *     </div>
 *   );
 * }
 */
