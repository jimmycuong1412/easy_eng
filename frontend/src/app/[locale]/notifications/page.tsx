'use client';

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
  Settings,
  Check,
  Trash2,
  Clock,
  Video,
  Cookie,
  Star,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// Mock notifications data
const mockNotifications = [
  {
    id: 1,
    type: 'class_reminder',
    title: 'Lớp học sắp bắt đầu',
    message: 'Lớp "Business English: Meeting Skills" sẽ bắt đầu sau 15 phút',
    timestamp: '2026-01-23T08:45:00+07:00',
    read: false,
    actionUrl: '/class/class-1/pre-check',
    icon: Video,
    color: 'text-[#3B82F6]',
    bgColor: 'bg-[#3B82F6]/10',
  },
  {
    id: 2,
    type: 'cookie_earned',
    title: 'Bạn nhận được Cookies!',
    message: 'Bạn đã nhận được 10 Cookies từ việc hoàn thành buổi học',
    timestamp: '2026-01-23T09:30:00+07:00',
    read: false,
    actionUrl: '/student/cookies',
    icon: Cookie,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
  {
    id: 3,
    type: 'achievement',
    title: 'Thành tích mới!',
    message: 'Chúc mừng! Bạn đã đạt thành tích "Học sinh chăm chỉ" - Hoàn thành 10 buổi học',
    timestamp: '2026-01-23T09:35:00+07:00',
    read: false,
    actionUrl: '/student/progress',
    icon: Trophy,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
  {
    id: 4,
    type: 'booking_confirmed',
    title: 'Đặt lịch thành công',
    message: 'Buổi học "IELTS Speaking Part 2" với cô Nguyễn Minh Anh đã được xác nhận vào 25/01/2026 lúc 10:00',
    timestamp: '2026-01-22T14:00:00+07:00',
    read: true,
    actionUrl: '/student/bookings',
    icon: Calendar,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
  {
    id: 5,
    type: 'message',
    title: 'Tin nhắn từ giáo viên',
    message: 'Cô Nguyễn Minh Anh đã gửi cho bạn một tin nhắn về bài tập về nhà',
    timestamp: '2026-01-22T10:30:00+07:00',
    read: true,
    actionUrl: '/messages',
    icon: MessageSquare,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
  },
  {
    id: 6,
    type: 'promotion',
    title: 'Khuyến mãi đặc biệt!',
    message: 'Giảm 20% cho gói 10 buổi học - Chỉ trong tuần này!',
    timestamp: '2026-01-21T09:00:00+07:00',
    read: true,
    actionUrl: '/pricing',
    icon: Gift,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
  },
  {
    id: 7,
    type: 'feedback_request',
    title: 'Đánh giá buổi học',
    message: 'Hãy đánh giá buổi học vừa rồi với thầy Trần Văn Nam để nhận 5 Cookies',
    timestamp: '2026-01-20T16:00:00+07:00',
    read: true,
    actionUrl: '/class/class-2/feedback',
    icon: Star,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
  {
    id: 8,
    type: 'system',
    title: 'Cập nhật hệ thống',
    message: 'Chúng tôi đã cập nhật tính năng mới: Ghi chú trong buổi học',
    timestamp: '2026-01-19T12:00:00+07:00',
    read: true,
    actionUrl: null,
    icon: AlertCircle,
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10',
  },
];

const notificationSettings = [
  { key: 'class_reminder', label: 'Nhắc nhở buổi học', description: 'Nhận thông báo trước khi lớp học bắt đầu' },
  { key: 'booking', label: 'Đặt lịch', description: 'Xác nhận và cập nhật về lịch học' },
  { key: 'message', label: 'Tin nhắn', description: 'Tin nhắn từ giáo viên và hệ thống' },
  { key: 'achievement', label: 'Thành tích', description: 'Thông báo khi đạt thành tích mới' },
  { key: 'cookie_earned', label: 'Cookies & Phần thưởng', description: 'Thông báo khi nhận được cookies hoặc phần thưởng' },
  { key: 'promotion', label: 'Khuyến mãi', description: 'Ưu đãi và chương trình khuyến mãi' },
  { key: 'system', label: 'Hệ thống', description: 'Thông báo cập nhật và bảo trì' },
];

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

export default function NotificationsPage() {
  const [notifications, setNotifications] = React.useState(mockNotifications);
  const [settings, setSettings] = React.useState<Record<string, boolean>>(
    Object.fromEntries(notificationSettings.map((s) => [s.key, true]))
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date('2026-01-23T09:00:00+07:00'); // Mock current time
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  const markAsRead = (id: number) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id: number) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const toggleSetting = (key: string) => {
    setSettings({ ...settings, [key]: !settings[key] });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#1E3A5F] to-[#0A1628] py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Thông báo</h1>
            <p className="text-slate-400">
              {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Tất cả đã đọc'}
            </p>
          </div>
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
                Đánh dấu đã đọc
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-red-500/50 text-red-400"
                onClick={clearAll}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Xóa tất cả
              </Button>
            </div>
          )}
        </motion.div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="all" className="data-[state=active]:bg-[#3B82F6]">
              Tất cả
            </TabsTrigger>
            <TabsTrigger value="unread" className="data-[state=active]:bg-[#3B82F6]">
              Chưa đọc
              {unreadCount > 0 && (
                <Badge className="ml-2 bg-red-500 text-white border-0 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-[#3B82F6]">
              Cài đặt
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
                <h3 className="text-lg font-semibold text-white mb-2">
                  Không có thông báo
                </h3>
                <p className="text-slate-400">
                  Bạn sẽ nhận được thông báo khi có hoạt động mới
                </p>
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
                                  Xem chi tiết →
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
                <h3 className="text-lg font-semibold text-white mb-2">
                  Tất cả đã đọc!
                </h3>
                <p className="text-slate-400">Không có thông báo chưa đọc nào</p>
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
                                    Xem chi tiết →
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
                <CardTitle className="text-white">Cài đặt thông báo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {notificationSettings.map((setting) => (
                  <div
                    key={setting.key}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-lg"
                  >
                    <div>
                      <Label className="text-white font-medium">{setting.label}</Label>
                      <p className="text-sm text-slate-400">{setting.description}</p>
                    </div>
                    <Switch
                      checked={settings[setting.key]}
                      onCheckedChange={() => toggleSetting(setting.key)}
                    />
                  </div>
                ))}

                <div className="pt-4 border-t border-white/10">
                  <h4 className="font-semibold text-white mb-3">Kênh thông báo</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                      <div>
                        <Label className="text-white font-medium">Thông báo trong app</Label>
                        <p className="text-sm text-slate-400">Hiển thị trong ứng dụng</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                      <div>
                        <Label className="text-white font-medium">Email</Label>
                        <p className="text-sm text-slate-400">Gửi email đến địa chỉ đã đăng ký</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                      <div>
                        <Label className="text-white font-medium">Push notification</Label>
                        <p className="text-sm text-slate-400">Thông báo đẩy trên thiết bị</p>
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
    </div>
  );
}
