'use client';

import { Star, Crown, Trophy, Award, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Level Badge Component (Task T150)
 *
 * Displays a student's level with animated badge effects.
 * Supports different sizes, styles, and tier indicators.
 *
 * Props:
 * - level: Current level (1-50)
 * - size: 'sm' | 'md' | 'lg' | 'xl'
 * - showLabel: Whether to show "Level X" text
 * - showIcon: Whether to show tier icon
 * - animated: Enable animation effects
 * - variant: 'default' | 'tier' | 'minimal'
 * - className: Additional CSS classes
 */

interface LevelBadgeProps {
  level: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  showIcon?: boolean;
  animated?: boolean;
  variant?: 'default' | 'tier' | 'minimal';
  className?: string;
}

export function LevelBadge({
  level,
  size = 'md',
  showLabel = false,
  showIcon = true,
  animated = true,
  variant = 'default',
  className,
}: LevelBadgeProps) {
  // Determine level tier and styling
  const getTierInfo = () => {
    if (level >= 40) {
      return {
        tier: 'legendary',
        color: 'from-purple-500 to-pink-500',
        borderColor: 'border-purple-400',
        icon: Crown,
        iconColor: 'text-purple-300',
        glow: 'bg-purple-500',
      };
    }
    if (level >= 30) {
      return {
        tier: 'epic',
        color: 'from-indigo-500 to-purple-500',
        borderColor: 'border-indigo-400',
        icon: Trophy,
        iconColor: 'text-indigo-300',
        glow: 'bg-indigo-500',
      };
    }
    if (level >= 20) {
      return {
        tier: 'rare',
        color: 'from-blue-500 to-cyan-500',
        borderColor: 'border-blue-400',
        icon: Award,
        iconColor: 'text-blue-300',
        glow: 'bg-blue-500',
      };
    }
    if (level >= 10) {
      return {
        tier: 'uncommon',
        color: 'from-green-500 to-emerald-500',
        borderColor: 'border-green-400',
        icon: Zap,
        iconColor: 'text-green-300',
        glow: 'bg-green-500',
      };
    }
    return {
      tier: 'common',
      color: 'from-yellow-500 to-orange-500',
      borderColor: 'border-yellow-400',
      icon: Star,
      iconColor: 'text-yellow-300',
      glow: 'bg-yellow-500',
    };
  };

  const tierInfo = getTierInfo();
  const Icon = tierInfo.icon;

  // Size configurations
  const sizeConfig = {
    sm: {
      badge: 'w-8 h-8',
      text: 'text-xs',
      icon: 'h-3 w-3',
      iconPosition: '-top-1 -right-1',
      border: 'border-2',
      labelText: 'text-xs',
      labelGap: 'gap-1.5',
    },
    md: {
      badge: 'w-12 h-12',
      text: 'text-sm',
      icon: 'h-4 w-4',
      iconPosition: '-top-1 -right-1',
      border: 'border-2',
      labelText: 'text-sm',
      labelGap: 'gap-2',
    },
    lg: {
      badge: 'w-16 h-16',
      text: 'text-lg',
      icon: 'h-5 w-5',
      iconPosition: '-top-2 -right-2',
      border: 'border-3',
      labelText: 'text-base',
      labelGap: 'gap-2',
    },
    xl: {
      badge: 'w-20 h-20',
      text: 'text-2xl',
      icon: 'h-6 w-6',
      iconPosition: '-top-2 -right-2',
      border: 'border-4',
      labelText: 'text-lg',
      labelGap: 'gap-3',
    },
  };

  const config = sizeConfig[size];

  // Minimal variant - just number
  if (variant === 'minimal') {
    return (
      <div className={cn(
        'inline-flex items-center justify-center rounded-full font-bold shadow-lg',
        config.badge,
        config.text,
        config.border,
        `bg-gradient-to-br ${tierInfo.color}`,
        tierInfo.borderColor,
        animated && 'hover:scale-110 transition-transform duration-200',
        className
      )}>
        <span className="text-white drop-shadow-md">{level}</span>
      </div>
    );
  }

  // Tier variant - shows tier badge with icon
  if (variant === 'tier') {
    return (
      <div className={cn('relative inline-block', className)}>
        <div className={cn(
          'flex items-center justify-center rounded-full font-bold shadow-2xl',
          config.badge,
          config.text,
          config.border,
          `bg-gradient-to-br ${tierInfo.color}`,
          tierInfo.borderColor,
          animated && 'hover:scale-110 transition-transform duration-200'
        )}>
          {/* Glow effect */}
          {animated && (
            <div className={cn(
              'absolute inset-0 rounded-full blur-lg opacity-40 animate-pulse',
              tierInfo.glow
            )} />
          )}

          {/* Level number */}
          <span className="relative text-white drop-shadow-lg">{level}</span>
        </div>

        {/* Tier Icon */}
        {showIcon && (
          <div className={cn(
            'absolute z-10',
            config.iconPosition
          )}>
            <Icon className={cn(
              config.icon,
              tierInfo.iconColor,
              animated && 'animate-bounce'
            )} />
          </div>
        )}

        {/* Label */}
        {showLabel && (
          <div className={cn(
            'absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap',
            config.labelText
          )}>
            <span className="text-gray-400 capitalize">
              {tierInfo.tier}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Default variant - badge with optional label
  return (
    <div className={cn(
      'inline-flex items-center',
      showLabel && config.labelGap,
      className
    )}>
      {/* Badge */}
      <div className="relative">
        <div className={cn(
          'flex items-center justify-center rounded-full font-bold shadow-2xl',
          config.badge,
          config.text,
          config.border,
          `bg-gradient-to-br ${tierInfo.color}`,
          tierInfo.borderColor,
          animated && 'hover:scale-110 transition-transform duration-200'
        )}>
          {/* Glow effect */}
          {animated && (
            <div className={cn(
              'absolute inset-0 rounded-full blur-lg opacity-40 animate-pulse',
              tierInfo.glow
            )} />
          )}

          {/* Level number */}
          <span className="relative text-white drop-shadow-lg">{level}</span>
        </div>

        {/* Icon */}
        {showIcon && (
          <div className={cn(
            'absolute z-10',
            config.iconPosition
          )}>
            <Icon className={cn(
              config.icon,
              tierInfo.iconColor,
              animated && 'animate-pulse'
            )} />
          </div>
        )}
      </div>

      {/* Label Text */}
      {showLabel && (
        <span className={cn(
          'font-semibold text-gray-200',
          config.labelText
        )}>
          Level {level}
        </span>
      )}
    </div>
  );
}

// Convenience exports for common use cases
export function LevelBadgeSm(props: Omit<LevelBadgeProps, 'size'>) {
  return <LevelBadge {...props} size="sm" />;
}

export function LevelBadgeLg(props: Omit<LevelBadgeProps, 'size'>) {
  return <LevelBadge {...props} size="lg" />;
}

export function LevelBadgeTier(props: Omit<LevelBadgeProps, 'variant'>) {
  return <LevelBadge {...props} variant="tier" />;
}

/**
 * Level Tier Legend Component
 * Shows all level tiers with their ranges
 */
export function LevelTierLegend() {
  const tiers = [
    { name: 'Common', range: '1-9', level: 5 },
    { name: 'Uncommon', range: '10-19', level: 15 },
    { name: 'Rare', range: '20-29', level: 25 },
    { name: 'Epic', range: '30-39', level: 35 },
    { name: 'Legendary', range: '40-50', level: 45 },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-300">Level Tiers</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className="flex flex-col items-center gap-2 p-3 rounded-lg bg-gray-800/50 border border-gray-700"
          >
            <LevelBadge
              level={tier.level}
              size="md"
              variant="tier"
              showIcon
              animated={false}
            />
            <div className="text-center">
              <div className="text-xs font-semibold text-gray-300">
                {tier.name}
              </div>
              <div className="text-xs text-gray-500">
                Levels {tier.range}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Example Usage:

import {
  LevelBadge,
  LevelBadgeSm,
  LevelBadgeLg,
  LevelBadgeTier,
  LevelTierLegend
} from '@/components/character/LevelBadge';

// Default badge
<LevelBadge level={15} />

// With label
<LevelBadge level={25} showLabel />

// Small size without icon
<LevelBadgeSm level={8} showIcon={false} />

// Large with tier variant
<LevelBadgeLg level={42} variant="tier" showLabel />

// Show all tiers
<LevelTierLegend />

*/
