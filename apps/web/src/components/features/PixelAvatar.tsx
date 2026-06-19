'use client';

import * as React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface PixelAvatarProps {
  src?: string | null;
  fallbackEmoji?: string;
  level?: number;
  name?: string;
  careerPath?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLevel?: boolean;
  isAnimated?: boolean;
  className?: string;
}

/**
 * Pixel art avatar component for the Career Path system.
 * Renders 8-bit style character sprites with level badges.
 */
export function PixelAvatar({
  src,
  fallbackEmoji = '👤',
  level,
  name,
  careerPath,
  size = 'md',
  showLevel = true,
  isAnimated = true,
  className,
}: PixelAvatarProps) {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
  };

  const levelBadgeSizes = {
    sm: 'text-[10px] px-1 py-0.5 -bottom-1 -right-1',
    md: 'text-xs px-1.5 py-0.5 -bottom-1 -right-1',
    lg: 'text-sm px-2 py-1 -bottom-2 -right-2',
    xl: 'text-base px-2.5 py-1 -bottom-2 -right-2',
  };

  const MotionWrapper = isAnimated ? motion.div : 'div';
  const animationProps = isAnimated
    ? {
        whileHover: { scale: 1.05 },
        whileTap: { scale: 0.95 },
        transition: { type: 'spring', stiffness: 400, damping: 17 },
      }
    : {};

  return (
    <MotionWrapper
      className={cn('relative inline-block', className)}
      {...animationProps}
    >
      {/* Avatar container */}
      <div
        className={cn(
          'relative overflow-hidden rounded-xl bg-bg-elevated border-2 border-border-default',
          'flex items-center justify-center',
          sizeClasses[size]
        )}
        style={{
          imageRendering: 'pixelated',
        }}
      >
        {src ? (
          <Image
            src={src}
            alt={name || 'Avatar'}
            fill
            className="object-cover"
            style={{ imageRendering: 'pixelated' }}
          />
        ) : (
          <span
            className={cn(
              'font-pixel',
              size === 'sm' && 'text-lg',
              size === 'md' && 'text-2xl',
              size === 'lg' && 'text-4xl',
              size === 'xl' && 'text-5xl'
            )}
          >
            {fallbackEmoji}
          </span>
        )}

        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/30 to-transparent pointer-events-none" />
      </div>

      {/* Level badge */}
      {showLevel && level !== undefined && (
        <Badge
          variant="gold"
          className={cn(
            'absolute font-bold shadow-glow-gold',
            levelBadgeSizes[size]
          )}
        >
          {level}
        </Badge>
      )}

      {/* Career path indicator */}
      {careerPath && (
        <div className="mt-1 text-center">
          <span className="text-xs text-text-muted font-pixel">{careerPath}</span>
        </div>
      )}

      {/* Name */}
      {name && (
        <div className="mt-0.5 text-center">
          <span className="text-sm text-text-secondary font-medium truncate">
            {name}
          </span>
        </div>
      )}
    </MotionWrapper>
  );
}
