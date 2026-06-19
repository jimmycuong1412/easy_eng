'use client';

export const dynamic = 'force-dynamic';

import * as React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Bell,
  Calendar,
  MessageSquare,
  Gift,
  Trophy,
  AlertCircle,
  CheckCircle,
  X,
  Check,
  Trash2,
  Clock,
  Video,
  Gem,
  Star,
  Heart,
} from 'lucide-react';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

import { useAuth } from '@/hooks/useAuth';
import { getUserNotifications, markNotificationRead } from '@/lib/queries';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';

const notificationIconMap: Record<string, { icon: typeof Bell; color: string; bgColor: string }> = {
  class_reminder: { icon: Video, color: 'text-[#3B82F6]', bgColor: 'bg-[#3B82F6]/10' },
  class_started: { icon: Video, color: 'text-[#3B82F6]', bgColor: 'bg-[#3B82F6]/10' },
  class_ended: { icon: Video, color: 'text-slate-400', bgColor: 'bg-slate-500/10' },
  gems_earned: { icon: Gem, color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
  xp_earned: { icon: Trophy, color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
  achievement_unlocked: { icon: Trophy, color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
  level_up: { icon: Star, color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
  booking_confirmed: { icon: Calendar, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  booking_cancelled: { icon: AlertCircle, color: 'text-red-400', bgColor: 'bg-red-500/10' },
  new_booking: { icon: Calendar, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  message_received: { icon: MessageSquare, color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  payment_received: { icon: Gift, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  booking_payment: { icon: Gift, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  system_announcement: { icon: AlertCircle, color: 'text-slate-400', bgColor: 'bg-slate-500/10' },
  slot_opened: { icon: Calendar, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  teacher_favorited: { icon: Heart, color: 'text-pink-400', bgColor: 'bg-pink-500/10' },
  cancellation_alert: { icon: AlertCircle, color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

type NotificationItem = {
  id: string;   // UUID from DB
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl: string | null;
  icon: typeof Bell;
  color: string;
  bgColor: string;
};

const NOTIFICATION_SETTING_KEYS = [
  'classReminder',
  'newMessage',
  'gemEarned',
  'reviewRequest',
  'achievement',
  'promotions',
  'paymentUpdate',
  'slotOpened',
  'teacherFavorited',
] as const;

// Maps UI camelCase key → DB notification type for preference lookup
const SETTING_KEY_TO_DB_TYPE: Record<string, string> = {
  classReminder:    'class_reminder',
  newMessage:       'message_received',
  gemEarned:        'gems_earned',
  reviewRequest:    'booking_confirmed',
  achievement:      'achievement_unlocked',
  promotions:       'system_announcement',
  paymentUpdate:    'payment_received',
  slotOpened:       'slot_opened',
  teacherFavorited: 'teacher_favorited',
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const t = useTranslations('notifications');
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const { preferences, updatePreference } = useNotificationPreferences();

  const sendTestNotification = async () => {
    if (!user?.id) return;
    const supabase = (await import('@/lib/supabase/client')).createClient();

    const testId = `test-${Date.now()}`;
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'system_announcement',
      title: 'Diagnostic Test',
      message: `If you see this, notification list rendering is working! (${testId})`,
      priority: 'high',
      metadata: { test_id: testId }
    });
    
    // Refresh list (normally we'd use realtime, but a simple refetch for test is fine)
    window.location.reload();
  };

  React.useEffect(() => {
    if (!user?.id) return;
    getUserNotifications(user.id)
      .then((data) => {
        const mapped: NotificationItem[] = (data || []).map((n: Record<string, unknown>) => {
          const iconInfo = notificationIconMap[(n.type as string) || ''] || notificationIconMap.system_announcement;
          return {
            id: String(n.id),
            type: (n.type as string) || 'system_announcement',
            title: (n.title as string) || '',
            message: (n.message as string) || '',
            timestamp: (n.created_at as string) || new Date().toISOString(),
            read: (n.read as boolean) || false,
            actionUrl: (n.action_url as string) || null,
            icon: iconInfo.icon,
            color: iconInfo.color,
            bgColor: iconInfo.bgColor,
          };
        });
        setNotifications(mapped);
      })
      .catch(console.error);
  }, [user?.id]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return t('minutesAgo', { n: diffMins });
    if (diffHours < 24) return t('hoursAgo', { n: diffHours });
    if (diffDays < 7) return t('daysAgo', { n: diffDays });
    return date.toLocaleDateString();
  };

  const markAsRead = (id: string) => {
    markNotificationRead(id).catch(console.error);
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{t('title')}</h1>
          <p className="text-slate-400">
            {unreadCount > 0
              ? t(unreadCount === 1 ? 'unreadCount' : 'unreadCountPlural', { n: unreadCount })
              : t('allRead')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-[#3B82F6]/50 text-[#3B82F6]"
            onClick={sendTestNotification}
          >
            <Bell className="w-4 h-4 mr-1" />
            Test
          </Button>

          {notifications.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 text-white"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
              >
                <Check className="w-4 h-4 mr-1" />
                {t('markAllRead')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-red-500/50 text-red-400"
                onClick={clearAll}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                {t('clearAll')}
              </Button>
            </div>
          )}
        </div>
      </motion.div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="all" className="data-[state=active]:bg-[#3B82F6]">
            {t('tabAll')}
          </TabsTrigger>
          <TabsTrigger value="unread" className="data-[state=active]:bg-[#3B82F6]">
            {t('tabUnread')}
            {unreadCount > 0 && (
              <Badge className="ml-2 bg-red-500 text-white border-0 text-xs">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-[#3B82F6]">
            {t('tabSettings')}
          </TabsTrigger>
        </TabsList>

        {/* All Notifications */}
        <TabsContent value="all">
          {notifications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <Bell className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">{t('noNotifications')}</h3>
              <p className="text-slate-400">{t('noNotificationsDesc')}</p>
            </motion.div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {notifications.map((notification) => (
                <motion.div key={notification.id} variants={itemVariants}>
                  <Card
                    className={`border-white/10 transition-all hover:border-[#3B82F6]/50 ${
                      notification.read ? 'bg-white/5' : 'bg-white/10'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notification.bgColor}`}
                        >
                          <notification.icon className={`w-5 h-5 ${notification.color}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-semibold text-white flex items-center gap-2">
                                {notification.title}
                                {!notification.read && (
                                  <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                                )}
                              </h4>
                              <p className="text-sm text-slate-400 mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-slate-500 mt-2">
                                <Clock className="w-3 h-3 inline mr-1" />
                                {formatTimestamp(notification.timestamp)}
                              </p>
                            </div>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-slate-500 hover:text-white shrink-0"
                              onClick={() => deleteNotification(notification.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>

                          {notification.actionUrl && (
                            <Link href={notification.actionUrl}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[#3B82F6] hover:text-[#3B82F6] hover:bg-[#3B82F6]/10 mt-2 -ml-2"
                                onClick={() => markAsRead(notification.id)}
                              >
                                {t('viewDetails')}
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </TabsContent>

        {/* Unread Notifications */}
        <TabsContent value="unread">
          {notifications.filter((n) => !n.read).length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <CheckCircle className="w-16 h-16 text-emerald-500/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">{t('allRead')}</h3>
              <p className="text-slate-400">{t('noUnreadNotifications')}</p>
            </motion.div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {notifications
                .filter((n) => !n.read)
                .map((notification) => (
                  <motion.div key={notification.id} variants={itemVariants}>
                    <Card className="bg-white/10 border-white/10 hover:border-[#3B82F6]/50 transition-all">
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notification.bgColor}`}
                          >
                            <notification.icon className={`w-5 h-5 ${notification.color}`} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-white flex items-center gap-2">
                              {notification.title}
                              <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                            </h4>
                            <p className="text-sm text-slate-400 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-slate-500 mt-2">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {formatTimestamp(notification.timestamp)}
                            </p>

                            {notification.actionUrl && (
                              <Link href={notification.actionUrl}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-[#3B82F6] hover:text-[#3B82F6] hover:bg-[#3B82F6]/10 mt-2 -ml-2"
                                  onClick={() => markAsRead(notification.id)}
                                >
                                  {t('viewDetails')}
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
            </motion.div>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">{t('notifSettings')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {NOTIFICATION_SETTING_KEYS.map((key) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-lg"
                >
                  <div>
                    <Label className="text-white font-medium">{t(`settings.${key}`)}</Label>
                    <p className="text-sm text-slate-400">{t(`settings.${key}Desc`)}</p>
                  </div>
                  <Switch
                    id={`toggle-${key}`}
                    checked={preferences[SETTING_KEY_TO_DB_TYPE[key] ?? key]?.in_app ?? true}
                    onCheckedChange={(checked) => {
                      console.log(`[NotificationsPage] Toggle ${key} changed to ${checked}`);
                      const dbType = SETTING_KEY_TO_DB_TYPE[key];
                      if (dbType) {
                        updatePreference(dbType, 'in_app', checked).catch(console.error);
                      }
                    }}
                  />
                </div>
              ))}

              <div className="pt-4 border-t border-white/10">
                <h4 className="font-semibold text-white mb-3">{t('channels.inApp')}</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div>
                      <Label className="text-white font-medium">{t('channels.inApp')}</Label>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div>
                      <Label className="text-white font-medium">{t('channels.email')}</Label>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div>
                      <Label className="text-white font-medium">{t('channels.push')}</Label>
                    </div>
                    <Switch />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
