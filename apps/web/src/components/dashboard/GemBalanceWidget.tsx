'use client';

import { useEffect } from 'react';
import { Sparkles, TrendingUp, Gift } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGemsBalance } from '@/hooks/useGemsBalance';
import { useAuthStore } from '@/stores/authStore';
import { gemsToUSD } from '@/constants/gems';

/**
 * Gem Balance Widget
 *
 * Displays the student's current Gem balance with:
 * - Total gems available
 * - Equivalent discount value
 * - Recent gem earnings indicator
 * - Shimmer effect for visual appeal
 */
export function GemBalanceWidget() {
  const { user } = useAuthStore();
  const { balance, isLoading, error, refreshBalance } = useGemsBalance();

  useEffect(() => {
    if (user?.id) {
      refreshBalance();
    }
  }, [user?.id, refreshBalance]);

  // Calculate discount value using shared conversion rate
  const discountValue = gemsToUSD(balance);

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-purple-500/10 to-purple-700/10 border-purple-500/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Gem Balance</CardTitle>
          <Sparkles className="h-4 w-4 text-purple-500 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-500 animate-pulse">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gradient-to-br from-red-500/10 to-red-700/10 border-red-500/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Gem Balance</CardTitle>
          <Sparkles className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-500">Error loading balance</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-purple-500/10 to-purple-700/10 border-purple-500/20 hover:border-purple-500/40 transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-purple-100">
          Your Gem Balance
        </CardTitle>
        <div className="relative">
          <Sparkles className="h-5 w-5 text-purple-400 animate-pulse" />
          <div className="absolute inset-0 bg-purple-400 blur-md opacity-50 animate-pulse" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Main Balance Display */}
          <div className="flex items-baseline gap-2">
            <div className="text-4xl font-bold text-purple-300 shimmer-text">
              {balance.toLocaleString()}
            </div>
            <div className="text-sm text-purple-400">Gems</div>
          </div>

          {/* Discount Value */}
          <div className="flex items-center gap-2 text-sm">
            <Gift className="h-4 w-4 text-purple-400" />
            <span className="text-purple-200">
              Worth <span className="font-semibold">${discountValue.toFixed(2)}</span> in discounts
            </span>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-2 pt-2 border-t border-purple-500/20">
            <TrendingUp className="h-4 w-4 text-green-400" />
            <span className="text-xs text-purple-300">
              Use gems to save up to 50% on classes
            </span>
          </div>
        </div>
      </CardContent>

      <style jsx>{`
        @keyframes shimmer {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        .shimmer-text {
          animation: shimmer 2s ease-in-out infinite;
        }
      `}</style>
    </Card>
  );
}
