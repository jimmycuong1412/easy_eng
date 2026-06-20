'use client';

export const dynamic = 'force-dynamic';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  Globe,
  Clock,
  Banknote,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@easyeng/core';
import { usePreferences } from '@/hooks/usePreferences';

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

const languages = [
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
];

const timezones = [
  { value: 'Asia/Ho_Chi_Minh', label: '(GMT+7) Hồ Chí Minh' },
  { value: 'Asia/Bangkok', label: '(GMT+7) Bangkok' },
  { value: 'Asia/Singapore', label: '(GMT+8) Singapore' },
  { value: 'Asia/Tokyo', label: '(GMT+9) Tokyo' },
  { value: 'America/New_York', label: '(GMT-5) New York' },
  { value: 'Europe/London', label: '(GMT+0) London' },
];

const currencies = [
  { code: 'VND', name: 'Đồng Việt Nam', symbol: '₫' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
];

export default function PreferencesSettingsPage() {
  const t = useTranslations('settings.preferences');
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();

  // Single useAuth() call — pass its values into usePreferences so we don't
  // create a second auth lock (which would cause the spinner to hang on Vercel).
  const { profile, isLoading: authLoading, refetchProfile } = useAuth();
  const {
    preferences: savedPreferences,
    isLoading: prefsLoading,
    error: prefsError,
    updatePreferences,
    isPending,
  } = usePreferences({ profile, isLoading: authLoading, refetchProfile });

  const [isSaved, setIsSaved] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState<string | null>(null);
  const [localPreferences, setLocalPreferences] = React.useState({
    language: 'vi',
    timezone: 'Asia/Ho_Chi_Minh',
    currency: 'VND',
  });

  // Load saved preferences from database
  React.useEffect(() => {
    if (savedPreferences) {
      setLocalPreferences({
        language: savedPreferences.locale,
        timezone: savedPreferences.timezone,
        currency: savedPreferences.currency,
      });
    }
  }, [savedPreferences]);

  // Update time only on client side to avoid hydration mismatch
  React.useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleTimeString('vi-VN', {
          timeZone: localPreferences.timezone,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [localPreferences.timezone]);

  const handleSave = async () => {
    const success = await updatePreferences({
      locale: localPreferences.language,
      timezone: localPreferences.timezone,
      currency: localPreferences.currency,
    });

    if (success) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);

      // If locale changed, redirect to new locale
      if (localPreferences.language !== currentLocale) {
        const newPath = pathname.replace(
          `/${currentLocale}`,
          `/${localPreferences.language}`
        );
        router.push(newPath);
      }
    }
  };

  // Don't block rendering on auth loading — the form shows defaults immediately
  // and updates via useEffect when savedPreferences arrives.

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Error message */}
      {prefsError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400"
        >
          <AlertCircle className="w-5 h-5" />
          <span>{prefsError}</span>
        </motion.div>
      )}

      {/* Language */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#3B82F6]" />
              {t('language.title')}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {t('language.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() =>
                    setLocalPreferences((p) => ({ ...p, language: lang.code }))
                  }
                  disabled={isPending}
                  className={`p-4 rounded-xl border transition-all ${
                    localPreferences.language === lang.code
                      ? 'bg-[#3B82F6]/20 border-[#3B82F6] text-white'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                  } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="text-2xl mb-2 block">{lang.flag}</span>
                  <span className="text-sm font-medium">{lang.name}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Timezone */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-400" />
              {t('timezone.title')}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {t('timezone.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-md">
              <Label htmlFor="timezone" className="text-slate-300 sr-only">
                Chọn múi giờ
              </Label>
              <select
                id="timezone"
                value={localPreferences.timezone}
                onChange={(e) =>
                  setLocalPreferences((p) => ({ ...p, timezone: e.target.value }))
                }
                disabled={isPending}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {timezones.map((tz) => (
                  <option
                    key={tz.value}
                    value={tz.value}
                    className="bg-[#1E3A5F] text-white"
                  >
                    {tz.label}
                  </option>
                ))}
              </select>
              <p className="text-sm text-slate-500 mt-2">
                {t('timezone.currentTime')} {currentTime ?? '--:--:--'}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Currency */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Banknote className="w-5 h-5 text-amber-400" />
              {t('currency.title')}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {t('currency.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-lg">
              {currencies.map((currency) => (
                <button
                  key={currency.code}
                  onClick={() =>
                    setLocalPreferences((p) => ({ ...p, currency: currency.code }))
                  }
                  disabled={isPending}
                  className={`p-4 rounded-xl border transition-all text-left ${
                    localPreferences.currency === currency.code
                      ? 'bg-[#3B82F6]/20 border-[#3B82F6] text-white'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                  } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="text-2xl font-bold block">{currency.symbol}</span>
                  <span className="text-sm">{currency.code}</span>
                  <span className="text-xs block text-slate-500">
                    {currency.name}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Save Button */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-end gap-4"
      >
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
          onClick={handleSave}
          disabled={isPending}
          className="bg-[#3B82F6] hover:bg-[#3B82F6]/90 min-w-[140px]"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t('saving')}
            </>
          ) : (
            t('saveButton')
          )}
        </Button>
      </motion.div>
    </motion.div>
  );
}
