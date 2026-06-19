'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { cn, formatNumber, levelFromXp, xpForLevel } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface XPProgressBarProps {
  totalXp: number;
  showLevel?: boolean;
  showNumbers?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * XP Progress bar showing current level progress.
 * Features animated level-up effects.
 */
export function XPProgressBar({
  totalXp,
  showLevel = true,
  showNumbers = true,
  size = 'md',
  className,
}: XPProgressBarProps) {
  const { level, currentXp, xpToNext } = levelFromXp(totalXp);
  const xpForCurrentLevel = xpForLevel(level);
  const progressPercent = (currentXp / xpForCurrentLevel) * 100;

  const [prevLevel, setPrevLevel] = React.useState(level);
  const [showLevelUp, setShowLevelUp] = React.useState(false);

  React.useEffect(() => {
    if (level > prevLevel) {
      setShowLevelUp(true);
      const timer = setTimeout(() => {
        setShowLevelUp(false);
        setPrevLevel(level);
      }, 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [level, prevLevel]);

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={cn('relative', className)}>
      {/* Level badge */}
      {showLevel && (
        <div className="flex items-center justify-between mb-2">
          <Badge variant="level" className="font-bold">
            Lv. {level}
          </Badge>
          {showNumbers && (
            <span className="text-xs text-text-muted">
              {formatNumber(currentXp)} / {formatNumber(xpForCurrentLevel)} XP
            </span>
          )}
        </div>
      )}

      {/* Progress bar */}
      <Progress
        value={progressPercent}
        className={cn(sizeClasses[size])}
        indicatorClassName="bg-gradient-to-r from-accent-primary to-accent-secondary"
      />

      {/* XP to next level */}
      {showNumbers && (
        <p className="text-xs text-text-muted mt-1 text-right">
          {formatNumber(xpToNext)} XP to Level {level + 1}
        </p>
      )}

      {/* Level up animation */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 0.5, type: 'spring' }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-accent-gold/90 text-bg-primary px-4 py-2 rounded-lg font-bold text-lg shadow-glow-gold">
              🎉 Level Up! Lv. {level}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
