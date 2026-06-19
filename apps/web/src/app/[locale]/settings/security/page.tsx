'use client';

export const dynamic = 'force-dynamic';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Key,
  Smartphone,
  Monitor,
  LogOut,
  Loader2,
  Check,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Current session - detected from browser
function getCurrentSession(activeNowLabel: string) {
  if (typeof window === 'undefined') return [];
  const ua = navigator.userAgent;
  let browser = 'Browser';
  let os = 'Unknown';
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari')) browser = 'Safari';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'MacOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Android')) os = 'Android';
  return [
    {
      id: 'current',
      device: `${browser} on ${os}`,
      location: '',
      lastActive: activeNowLabel,
      isCurrent: true,
    },
  ];
}

export default function SecuritySettingsPage() {
  const t = useTranslations('security');
  const [isChangingPassword, setIsChangingPassword] = React.useState(false);
  const [passwordSaved, setPasswordSaved] = React.useState(false);
  const [showPasswords, setShowPasswords] = React.useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwords, setPasswords] = React.useState({
    current: '',
    new: '',
    confirm: '',
  });

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswords((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setPasswordSaved(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingPassword(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsChangingPassword(false);
    setPasswordSaved(true);
    setPasswords({ current: '', new: '', confirm: '' });

    setTimeout(() => setPasswordSaved(false), 3000);
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Change Password */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-[#3B82F6]" />
              {t('changePassword')}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {t('changePasswordDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
              {/* Current Password */}
              <div className="space-y-2">
                <Label htmlFor="current" className="text-slate-300">
                  {t('currentPassword')}
                </Label>
                <div className="relative">
                  <Input
                    id="current"
                    name="current"
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwords.current}
                    onChange={handlePasswordChange}
                    className="pr-10 bg-white/5 border-white/10 text-white focus:border-[#3B82F6]"
                    placeholder={t('currentPasswordPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('current')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPasswords.current ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="new" className="text-slate-300">
                  {t('newPassword')}
                </Label>
                <div className="relative">
                  <Input
                    id="new"
                    name="new"
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwords.new}
                    onChange={handlePasswordChange}
                    className="pr-10 bg-white/5 border-white/10 text-white focus:border-[#3B82F6]"
                    placeholder={t('newPasswordPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('new')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPasswords.new ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-slate-300">
                  {t('confirmNewPassword')}
                </Label>
                <div className="relative">
                  <Input
                    id="confirm"
                    name="confirm"
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwords.confirm}
                    onChange={handlePasswordChange}
                    className="pr-10 bg-white/5 border-white/10 text-white focus:border-[#3B82F6]"
                    placeholder={t('confirmPasswordPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('confirm')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <Button
                  type="submit"
                  disabled={isChangingPassword || !passwords.current || !passwords.new || !passwords.confirm}
                  className="bg-[#3B82F6] hover:bg-[#3B82F6]/90"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('updating')}
                    </>
                  ) : (
                    t('updatePassword')
                  )}
                </Button>
                {passwordSaved && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 text-emerald-400"
                  >
                    <Check className="w-4 h-4" />
                    <span className="text-sm">{t('updated')}</span>
                  </motion.div>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Two-Factor Authentication */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-400" />
              {t('twoFactor')}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {t('twoFactorDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500/20 rounded-xl">
                  <Shield className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <p className="text-white font-medium">{t('twoFactorStatus')}</p>
                  <p className="text-sm text-slate-400">{t('notActivated')}</p>
                </div>
              </div>
              <Button className="bg-emerald-500 hover:bg-emerald-500/90">
                {t('activate')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Active Sessions */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Monitor className="w-5 h-5 text-purple-400" />
              {t('activeSessions')}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {t('activeSessionsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {getCurrentSession(t('activeNow')).map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 bg-white/5 rounded-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <Monitor className="w-5 h-5 text-slate-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium">{session.device}</p>
                      {session.isCurrent && (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                          {t('thisDevice')}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-400">
                      {session.location} • {session.lastActive}
                    </p>
                  </div>
                </div>
                {!session.isCurrent && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {t('signOut')}
                  </Button>
                )}
              </div>
            ))}

            <Button
              variant="outline"
              className="w-full mt-4 border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('signOutAll')}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Security Alerts */}
      <motion.div variants={itemVariants}>
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardHeader>
            <CardTitle className="text-amber-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {t('securityAlerts')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-400 text-sm">{t('noAlerts')}</p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
