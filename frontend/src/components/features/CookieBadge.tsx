'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { cn, formatNumber } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { GemImage } from '@/components/common/GemImage';

interface GemBadgeProps {
  count: number;
  size?: 'sm' | 'md' | 'lg';
  showAnimation?: boolean;
  className?: string;
}

/**
 * Gem badge component displaying the user's gem count.
 * Features animated updates when count changes.
 */
export function GemBadge({
  count,
  size = 'md',
  showAnimation = true,
  className,
}: GemBadgeProps) {
  const [prevCount, setPrevCount] = React.useState(count);
  const [isAnimating, setIsAnimating] = React.useState(false);

  React.useEffect(() => {
    if (count !== prevCount && showAnimation) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setPrevCount(count);
      }, 600);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [count, prevCount, showAnimation]);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  return (
    <div className={cn('relative', className)}>
      <Badge
        variant="gem"
        className={cn(
          'inline-flex items-center gap-1.5 font-semibold',
          sizeClasses[size],
          isAnimating && 'animate-bounce-subtle'
        )}
      >
        <GemImage size={size === 'sm' ? 14 : size === 'lg' ? 22 : 18} alt="Gem" />
        <AnimatePresence mode="popLayout">
          <motion.span
            key={count}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            {formatNumber(count)}
          </motion.span>
        </AnimatePresence>
      </Badge>

      {/* Floating +gems animation */}
      <AnimatePresence>
        {isAnimating && count > prevCount && (
          <motion.div
            initial={{ opacity: 0, y: 0, scale: 0.8 }}
            animate={{ opacity: 1, y: -20, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.8 }}
            transition={{ duration: 0.6 }}
            className="absolute -top-2 left-1/2 -translate-x-1/2 text-accent-gem font-bold text-sm pointer-events-none"
          >
            +{count - prevCount}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Legacy alias
export const CookieBadge = GemBadge;
