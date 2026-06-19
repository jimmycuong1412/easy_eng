'use client';

import { useEffect, useState } from 'react';
import { Zap, TrendingUp, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * XP Bar Component (Task T149)
 *
 * Displays student's XP (Experience Points) progress toward next level with:
 * - Current level badge
 * - Animated progress bar
 * - XP amount (current/required)
 * - Progress percentage
 * - Glow effects for visual appeal
 *
 * Props:
 * - currentLevel: Student's current level (1-50)
 * - currentXP: Current XP progress toward next level
 * - xpToNextLevel: XP required to reach next level
 * - totalXP: Total XP earned all-time (optional)
 * - className: Additional CSS classes (optional)
 * - variant: 'default' | 'compact' | 'minimal'
 */

interface XPBarProps {
  currentLevel: number;
  currentXP: number;
  xpToNextLevel: number;
  totalXP?: number;
  className?: string;
  variant?: 'default' | 'compact' | 'minimal';
}

export function XPBar({
  currentLevel,
  currentXP,
  xpToNextLevel,
  totalXP,
  className,
  variant = 'default',
}: XPBarProps) {
  const [progressPercent, setProgressPercent] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Calculate progress percentage
  const calculatedPercent = Math.min(
    Math.round((currentXP / xpToNextLevel) * 100),
    100
  );

  // Animate progress bar on mount or when XP changes
  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => {
      setProgressPercent(calculatedPercent);
      setIsAnimating(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [calculatedPercent, currentXP]);

  // Determine color based on progress
  const getProgressColor = () => {
    if (progressPercent >= 80) return 'bg-gradient-to-r from-green-400 to-emerald-500';
    if (progressPercent >= 50) return 'bg-gradient-to-r from-blue-400 to-cyan-500';
    if (progressPercent >= 20) return 'bg-gradient-to-r from-yellow-400 to-orange-500';
    return 'bg-gradient-to-r from-purple-400 to-pink-500';
  };

  // Minimal variant - just a thin progress bar
  if (variant === 'minimal') {
    return (
      <div className={cn('space-y-1', className)}>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Level {currentLevel}</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-500 ease-out',
              getProgressColor()
            )}
            style={{ width: `${progressPercent}%` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        </div>
      </div>
    );
  }

  // Compact variant - small level badge + progress
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        {/* Level Badge */}
        <div className="relative">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 border-2 border-yellow-300 shadow-lg">
            <span className="text-sm font-bold text-white">
              {currentLevel}
            </span>
          </div>
          <Star className="absolute -top-1 -right-1 h-4 w-4 text-yellow-300 animate-pulse" />
        </div>

        {/* Progress Bar */}
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-300">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-blue-400" />
              {currentXP.toLocaleString()} / {xpToNextLevel.toLocaleString()} XP
            </span>
            <span className="text-blue-400 font-medium">{progressPercent}%</span>
          </div>
          <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
            <div
              className={cn(
                'h-full transition-all duration-500 ease-out',
                getProgressColor(),
                isAnimating && 'animate-pulse'
              )}
              style={{ width: `${progressPercent}%` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          </div>
        </div>
      </div>
    );
  }

  // Default variant - full card with all details
  return (
    <Card className={cn(
      'bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20 hover:border-blue-500/40 transition-all duration-300',
      className
    )}>
      <CardContent className="pt-6 space-y-4">
        {/* Header with Level Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Animated Level Badge */}
            <div className="relative">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 border-4 border-yellow-300 shadow-2xl">
                <span className="text-2xl font-bold text-white drop-shadow-lg">
                  {currentLevel}
                </span>
              </div>
              <div className="absolute inset-0 rounded-full bg-yellow-400 blur-lg opacity-30 animate-pulse" />
              <Star className="absolute -top-2 -right-2 h-6 w-6 text-yellow-300 animate-bounce" />
            </div>

            {/* Level Info */}
            <div>
              <div className="text-lg font-bold text-blue-200">
                Level {currentLevel}
              </div>
              <div className="text-sm text-gray-400">
                {currentLevel < 50 ? `Next level at ${xpToNextLevel} XP` : 'Maximum Level!'}
              </div>
            </div>
          </div>

          {/* Total XP Badge */}
          {totalXP !== undefined && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/30">
              <TrendingUp className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-300">
                {totalXP.toLocaleString()} Total XP
              </span>
            </div>
          )}
        </div>

        {/* Progress Section */}
        <div className="space-y-2">
          {/* XP Amount */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-400" />
              <span className="text-gray-300">
                <span className="font-bold text-blue-300">
                  {currentXP.toLocaleString()}
                </span>
                {' / '}
                <span className="text-gray-400">
                  {xpToNextLevel.toLocaleString()}
                </span>
                {' XP'}
              </span>
            </div>
            <span className="font-bold text-blue-400">
              {progressPercent}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="relative h-4 bg-gray-800 rounded-full overflow-hidden border-2 border-gray-700 shadow-inner">
            {/* Progress Fill */}
            <div
              className={cn(
                'h-full transition-all duration-700 ease-out relative',
                getProgressColor(),
                isAnimating && 'animate-pulse'
              )}
              style={{ width: `${progressPercent}%` }}
            >
              {/* Inner glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent" />
            </div>

            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
          </div>

          {/* XP to Next Level */}
          {currentLevel < 50 && (
            <div className="text-xs text-gray-400 text-center">
              {(xpToNextLevel - currentXP).toLocaleString()} XP needed to level up
            </div>
          )}
        </div>
      </CardContent>

      {/* Animations */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .animate-shimmer {
          animation: shimmer 3s infinite;
        }
      `}</style>
    </Card>
  );
}

// Export variant-specific components for convenience
export function XPBarCompact(props: Omit<XPBarProps, 'variant'>) {
  return <XPBar {...props} variant="compact" />;
}

export function XPBarMinimal(props: Omit<XPBarProps, 'variant'>) {
  return <XPBar {...props} variant="minimal" />;
}

/* Example Usage:

import { XPBar, XPBarCompact, XPBarMinimal } from '@/components/character/XPBar';

// Default variant (full card)
<XPBar
  currentLevel={5}
  currentXP={750}
  xpToNextLevel={1000}
  totalXP={5420}
/>

// Compact variant (for sidebars)
<XPBarCompact
  currentLevel={12}
  currentXP={450}
  xpToNextLevel={800}
/>

// Minimal variant (for headers)
<XPBarMinimal
  currentLevel={3}
  currentXP={200}
  xpToNextLevel={500}
/>

*/
