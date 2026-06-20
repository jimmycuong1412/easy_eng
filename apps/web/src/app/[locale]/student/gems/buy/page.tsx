'use client';

export const dynamic = 'force-dynamic';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ShoppingCart,
  Zap,
  Check,
  Loader2,
  ArrowLeft,
  AlertCircle,
  CreditCard,
} from 'lucide-react';

import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GemImage } from '@/components/common/GemImage';
import { useAuth } from '@easyeng/core';
import { useGemsBalance } from '@easyeng/core';
import { getSupabaseClient } from '@/lib/supabase/client';

interface GemPackage {
  id: string;
  name: string;
  gems: number;
  price_vnd: number;
  price_usd: number;
  bonus_gems: number;
  is_popular: boolean;
  sort_order: number;
}

type PaymentMethodId = 'momo' | 'vnpay' | 'zalopay' | 'stripe';

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

export default function BuyGemsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { balance, refreshBalance } = useGemsBalance();
  const t = useTranslations('buyGems');

  const PAYMENT_METHODS: { id: PaymentMethodId; label: string; icon: string }[] = [
    { id: 'momo',    label: 'MoMo',    icon: '📱' },
    { id: 'vnpay',   label: 'VNPay',   icon: '🏦' },
    { id: 'zalopay', label: 'ZaloPay', icon: '💙' },
    { id: 'stripe',  label: 'Stripe',  icon: '💳' },
  ];

  const [packages, setPackages] = React.useState<GemPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = React.useState<GemPackage | null>(null);
  const [selectedMethod, setSelectedMethod] = React.useState<PaymentMethodId>('momo');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isPaying, setIsPaying] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    loadPackages();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPackages = async () => {
    try {
      const supabase = getSupabaseClient();
      const { data, error: fetchError } = await supabase
        .from('gem_packages')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (fetchError) throw fetchError;
      setPackages(data || []);
      // Auto-select the popular package
      const popular = (data || []).find((p: GemPackage) => p.is_popular);
      if (popular) setSelectedPackage(popular);
    } catch {
      setError(t('errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage || !user) return;
    setIsPaying(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // Create a pending gem purchase record
      const idempotencyKey = `gem_${user.id}_${selectedPackage.id}_${Date.now()}`;
      const { data: purchase, error: insertError } = await supabase
        .from('gem_purchases')
        .insert({
          user_id: user.id,
          package_id: selectedPackage.id,
          gems_amount: selectedPackage.gems,
          bonus_gems: selectedPackage.bonus_gems,
          payment_method: selectedMethod,
          payment_amount: selectedPackage.price_vnd,
          payment_currency: 'VND',
          idempotency_key: idempotencyKey,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      // Call backend to create payment URL
      const response = await fetch('/api/payments/gem-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchase_id: purchase.id,
          payment_method: selectedMethod,
          amount: selectedPackage.price_vnd,
          currency: 'VND',
          description: `Buy ${selectedPackage.gems + selectedPackage.bonus_gems} Gems - ${selectedPackage.name}`,
          return_url: `${window.location.origin}/student/gems/buy?status=success`,
          cancel_url: `${window.location.origin}/student/gems/buy?status=cancel`,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || t('errors.createFailed'));
      }

      // Redirect to payment gateway
      if (result.payment_url) {
        window.location.href = result.payment_url;
      } else {
        throw new Error(t('errors.noUrl'));
      }
    } catch (err: unknown) {
      console.error('Gem purchase error:', err);
      setError(err instanceof Error ? err.message : t('errors.transactionFailed'));
      setIsPaying(false);
    }
  };

  // Handle return from payment gateway
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    if (status === 'success') {
      const totalGems = selectedPackage
        ? selectedPackage.gems + selectedPackage.bonus_gems
        : 0;
      setSuccessMsg(t('success', { gems: totalGems }));
      refreshBalance();
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (status === 'cancel') {
      setError(t('cancelledMsg'));
      window.history.replaceState({}, '', window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalGems = selectedPackage
    ? selectedPackage.gems + selectedPackage.bonus_gems
    : 0;

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('back')}
          </button>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <GemImage size={36} />
                {t('title')}
              </h1>
              <p className="mt-1 text-slate-400">{t('subtitle')}</p>
            </div>
            {/* Current balance */}
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 border border-white/10">
              <GemImage size={22} />
              <div>
                <p className="text-xs text-slate-400">{t('currentBalance')}</p>
                <p className="text-xl font-bold text-amber-400">{balance.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Alerts */}
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-emerald-400"
          >
            <Check className="h-5 w-5 flex-shrink-0" />
            <p>{successMsg}</p>
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-400"
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </motion.div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">

          {/* Package selector — takes 2 columns */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold text-white">{t('choosePackage')}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {packages.map((pkg, i) => {
                const isSelected = selectedPackage?.id === pkg.id;
                const total = pkg.gems + pkg.bonus_gems;
                return (
                  <motion.button
                    key={pkg.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setSelectedPackage(pkg)}
                    className={`relative rounded-2xl border p-5 text-left transition-all ${
                      isSelected
                        ? 'border-[#3B82F6] bg-[#3B82F6]/10 ring-1 ring-[#3B82F6]'
                        : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                    }`}
                  >
                    {pkg.is_popular && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-[#3B82F6] px-3 py-0.5 text-xs font-semibold text-white">
                        {t('mostPopular')}
                      </span>
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-white">{pkg.name}</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <GemImage size={18} />
                          <span className="text-2xl font-bold text-amber-400">
                            {total.toLocaleString()}
                          </span>
                          {pkg.bonus_gems > 0 && (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-xs">
                              +{pkg.bonus_gems.toLocaleString()} bonus
                            </Badge>
                          )}
                        </div>
                        {pkg.bonus_gems > 0 && (
                          <p className="mt-0.5 text-xs text-slate-500">
                            {t('bonusGems', { base: pkg.gems.toLocaleString(), bonus: pkg.bonus_gems.toLocaleString() })}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold text-white">{formatVND(pkg.price_vnd)}</p>
                        <p className="text-xs text-slate-500">${pkg.price_usd.toFixed(2)}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="absolute right-3 top-3 rounded-full bg-[#3B82F6] p-0.5">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Info bar */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 flex-shrink-0 text-amber-400 mt-0.5" />
                <div className="text-sm text-slate-400">
                  <p>{t('infoBar')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Checkout panel */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">{t('paymentMethod')}</h2>

            {/* Payment method */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-medium text-slate-300 mb-3">
                  <CreditCard className="inline h-4 w-4 mr-1.5 text-slate-400" />
                  {t('paymentMethod')}
                </p>
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                      selectedMethod === method.id
                        ? 'border-[#3B82F6] bg-[#3B82F6]/10 text-white'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    <span className="text-xl">{method.icon}</span>
                    <div>
                      <p className="font-medium text-sm">{method.label}</p>
                      <p className="text-xs text-slate-500">{t(`paymentMethods.${method.id}`)}</p>
                    </div>
                    {selectedMethod === method.id && (
                      <Check className="ml-auto h-4 w-4 text-[#3B82F6]" />
                    )}
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Order summary */}
            {selectedPackage && (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-medium text-slate-300">{t('paymentSummary')}</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">{selectedPackage.name}</span>
                    <div className="flex items-center gap-1">
                      <GemImage size={14} />
                      <span className="text-white font-medium">{selectedPackage.gems.toLocaleString()}</span>
                    </div>
                  </div>
                  {selectedPackage.bonus_gems > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-400">Bonus Gems</span>
                      <div className="flex items-center gap-1">
                        <GemImage size={14} />
                        <span className="text-emerald-400 font-medium">+{selectedPackage.bonus_gems.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                  <div className="border-t border-white/10 pt-3 flex justify-between">
                    <span className="text-slate-300 font-medium">{t('totalGems')}</span>
                    <div className="flex items-center gap-1.5">
                      <GemImage size={16} />
                      <span className="text-amber-400 font-bold text-lg">{totalGems.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300 font-medium">{t('paymentMethod')}</span>
                    <span className="text-white font-bold text-lg">{formatVND(selectedPackage.price_vnd)}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button
              onClick={handlePurchase}
              disabled={!selectedPackage || isPaying}
              className="w-full h-12 bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-base font-semibold"
            >
              {isPaying ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  {t('processing')}
                </>
              ) : (
                <>
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  {selectedPackage
                    ? `${t('buyNow')} ${totalGems.toLocaleString()} Gems — ${formatVND(selectedPackage.price_vnd)}`
                    : t('choosePackage')}
                </>
              )}
            </Button>

            <p className="text-center text-xs text-slate-500">
              {t('termsText')}{' '}
              <span className="text-slate-400 underline cursor-pointer">{t('termsLink')}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
