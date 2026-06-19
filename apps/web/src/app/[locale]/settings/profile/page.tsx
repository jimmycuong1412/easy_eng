'use client';

export const dynamic = 'force-dynamic';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Camera,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Save,
  Loader2,
  Check,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { GemImage } from '@/components/common/GemImage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { getUserProfile, updateUserProfile } from '@/lib/queries';
import { useGemsBalance } from '@/hooks/useGemsBalance';
import type { Profile } from '@easyeng/types';

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

export default function ProfileSettingsPage() {
  const t = useTranslations('settings.profile');
  const { user } = useAuth();
  const { balance: gemBalance } = useGemsBalance();
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [isPageLoading, setIsPageLoading] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaved, setIsSaved] = React.useState(false);
  const [formData, setFormData] = React.useState({
    fullName: '',
    displayName: '',
    email: '',
    phone: '',
    location: '',
    dateOfBirth: '',
    bio: '',
  });

  React.useEffect(() => {
    if (!user?.id) return;
    getUserProfile(user.id)
      .then((p) => {
        setProfile(p);
        setFormData({
          fullName: p.full_name || '',
          displayName: p.full_name || '',
          email: p.email || '',
          phone: p.phone || '',
          location: p.timezone || '',
          dateOfBirth: p.date_of_birth || '',
          bio: p.bio || '',
        });
      })
      .catch(console.error)
      .finally(() => setIsPageLoading(false));
  }, [user?.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setIsSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setIsLoading(true);

    try {
      await updateUserProfile(user.id, {
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone || null,
        timezone: formData.location,
        date_of_birth: formData.dateOfBirth || null,
        bio: formData.bio || null,
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isPageLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  const displayName = profile?.full_name || 'User';

  const getRoleLabel = (role: string | undefined) => {
    if (role === 'student') return t('roleStudent');
    if (role === 'teacher') return t('roleTeacher');
    if (role === 'admin') return t('roleAdmin');
    return '';
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Profile Header Card */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-[#3B82F6]/30">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-[#3B82F6] text-white text-2xl">
                    {displayName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <button className="absolute bottom-0 right-0 p-2 bg-[#3B82F6] rounded-full hover:bg-[#3B82F6]/90 transition-colors">
                  <Camera className="w-4 h-4 text-white" />
                </button>
              </div>

              <div className="text-center sm:text-left flex-1">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <h2 className="text-xl font-bold text-white">{displayName}</h2>
                  {getRoleLabel(profile?.role) && (
                    <Badge className="bg-[#3B82F6]/20 text-[#3B82F6] border-0">
                      {getRoleLabel(profile?.role)}
                    </Badge>
                  )}
                </div>
                <p className="text-slate-400 mt-1">{profile?.email}</p>
                <p className="text-sm text-slate-500 mt-2">
                  {t('memberSince')} {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : ''}
                </p>
              </div>

              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-400 flex items-center gap-1"><GemImage size={22} /> {gemBalance}</p>
                  <p className="text-xs text-slate-400">Gems</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Edit Profile Form */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <User className="w-5 h-5 text-[#3B82F6]" />
              {t('title')}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {t('description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-slate-300">
                    {t('fullName')}
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      className="pl-10 bg-white/5 border-white/10 text-white focus:border-[#3B82F6]"
                      placeholder={t('fullNamePlaceholder')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-slate-300">
                    {t('displayName')}
                  </Label>
                  <Input
                    id="displayName"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleChange}
                    className="bg-white/5 border-white/10 text-white focus:border-[#3B82F6]"
                    placeholder={t('displayNamePlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-300">
                    {t('email')}
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="pl-10 bg-white/5 border-white/10 text-white focus:border-[#3B82F6]"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-slate-300">
                    {t('phone')}
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="pl-10 bg-white/5 border-white/10 text-white focus:border-[#3B82F6]"
                      placeholder="+84 xxx xxx xxx"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="text-slate-300">
                    {t('location')}
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="pl-10 bg-white/5 border-white/10 text-white focus:border-[#3B82F6]"
                      placeholder={t('locationPlaceholder')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth" className="text-slate-300">
                    {t('dateOfBirth')}
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="dateOfBirth"
                      name="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      className="pl-10 bg-white/5 border-white/10 text-white focus:border-[#3B82F6]"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-slate-300">
                  {t('bio')}
                </Label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] resize-none"
                  placeholder={t('bioPlaceholder')}
                />
                <p className="text-xs text-slate-500">
                  {t('bioCounter', { count: formData.bio.length })}
                </p>
              </div>

              <div className="flex items-center justify-end gap-4">
                {isSaved && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 text-emerald-400"
                  >
                    <Check className="w-4 h-4" />
                    <span className="text-sm">{t('saved')}</span>
                  </motion.div>
                )}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-[#3B82F6] hover:bg-[#3B82F6]/90 min-w-[140px]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('saving')}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {t('saveChanges')}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Danger Zone */}
      <motion.div variants={itemVariants}>
        <Card className="bg-red-500/5 border-red-500/20">
          <CardHeader>
            <CardTitle className="text-red-400">{t('dangerZone')}</CardTitle>
            <CardDescription className="text-slate-400">
              {t('dangerZoneDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
              {t('disableAccount')}
            </Button>
            <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
              {t('deleteAccount')}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
