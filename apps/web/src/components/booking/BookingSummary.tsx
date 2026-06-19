'use client';

import { Sparkles, Calendar, Clock, User, DollarSign, Gem } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { gemsToUSD } from '@/constants/gems';

interface BookingSummaryProps {
  classDetails: {
    id: string;
    title: string;
    teacher: string;
    scheduledAt: Date;
    duration: number;
    price: number;
  };
  gemsUsed: number;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export function BookingSummary({
  classDetails,
  gemsUsed,
  onConfirm,
  onCancel,
  isProcessing = false,
}: BookingSummaryProps) {
  const t = useTranslations('bookingSummary');
  const { title, teacher, scheduledAt, duration, price } = classDetails;

  // Calculate discount using shared conversion rate
  const gemDiscount = gemsToUSD(gemsUsed);
  const finalPrice = Math.max(price - gemDiscount, 5); // $5 minimum
  const actualDiscount = price - finalPrice;
  const discountPercentage = ((actualDiscount / price) * 100).toFixed(0);

  // Check if discount was capped
  const wasDiscountCapped = actualDiscount < gemDiscount;
  const cappedReason = finalPrice === 5 ? 'Minimum price ($5)' : '50% maximum discount';

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Class Details */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">{title}</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <User className="h-4 w-4" />
              <span>{teacher}</span>
            </div>

            <div className="flex items-center gap-2 text-gray-400">
              <Calendar className="h-4 w-4" />
              <span>{scheduledAt.toLocaleDateString()}</span>
            </div>

            <div className="flex items-center gap-2 text-gray-400">
              <Clock className="h-4 w-4" />
              <span>{scheduledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            <div className="flex items-center gap-2 text-gray-400">
              <Clock className="h-4 w-4" />
              <span>{t('durationMinutes', { n: duration })}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Pricing Breakdown */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-gray-300">{t('pricingBreakdown')}</h4>

          {/* Original Price */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">{t('originalPrice')}</span>
            <span className="font-medium">${price.toFixed(2)}</span>
          </div>

          {/* Gems Applied */}
          {gemsUsed > 0 && (
            <>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Gem className="h-4 w-4 text-purple-500" />
                  <span className="text-sm text-gray-400">
                    {t('gemsUsed', { n: gemsUsed })}
                  </span>
                </div>
                <span className="text-purple-400 font-medium">
                  -${actualDiscount.toFixed(2)}
                </span>
              </div>

              {/* Discount Capped Warning */}
              {wasDiscountCapped && (
                <div className="text-xs text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2">
                  {t('discountCapped', { pct: discountPercentage, reason: cappedReason })}
                </div>
              )}
            </>
          )}

          <Separator className="my-2" />

          {/* Final Price */}
          <div className="flex justify-between items-center">
            <span className="font-semibold">{t('totalAmount')}</span>
            <div className="text-right">
              {gemsUsed > 0 && (
                <div className="text-sm text-gray-400 line-through">
                  ${price.toFixed(2)}
                </div>
              )}
              <div className="text-2xl font-bold text-green-400">
                ${finalPrice.toFixed(2)}
              </div>
              {gemsUsed > 0 && (
                <div className="text-xs text-green-400">
                  {t('youSave', { amount: actualDiscount.toFixed(2), pct: discountPercentage })}
                </div>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Gems Balance Info */}
        {gemsUsed > 0 && (
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span className="text-purple-200">
                {t('gemsDeducted', { n: gemsUsed })}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={isProcessing}
          >
            {t('cancel')}
          </Button>
          <Button
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            onClick={onConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                {t('processing')}
              </>
            ) : (
              <>
                <DollarSign className="h-4 w-4 mr-2" />
                {t('confirm', { amount: finalPrice.toFixed(2) })}
              </>
            )}
          </Button>
        </div>

        {/* Terms */}
        <p className="text-xs text-gray-500 text-center">
          {t('termsText')}{' '}
          <a href="/terms" className="text-purple-400 hover:underline">
            {t('termsLink')}
          </a>{' '}
          and{' '}
          <a href="/cancellation-policy" className="text-purple-400 hover:underline">
            {t('cancellationPolicy')}
          </a>
        </p>
      </CardContent>
    </Card>
  );
}
