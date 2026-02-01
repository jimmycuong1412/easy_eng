/**
 * Loading States and Skeleton Components
 * 
 * Reusable loading indicators and skeleton screens
 */

'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Spinner Component
 */
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <Loader2 className={cn('animate-spin text-primary', sizeMap[size], className)} />
  );
}

/**
 * Full Page Loader
 */
interface FullPageLoaderProps {
  message?: string;
}

export function FullPageLoader({ message = 'Loading...' }: FullPageLoaderProps) {
  return (
    <div className="fixed inset-0 bg-surface-base flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col items-center gap-4"
      >
        <Spinner size="lg" />
        {message && (
          <p className="text-sm text-text-subtle">{message}</p>
        )}
      </motion.div>
    </div>
  );
}

/**
 * Skeleton Base Component
 */
interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

export function Skeleton({ className, variant = 'rectangular' }: SkeletonProps) {
  const variantClasses = {
    text: 'h-4 w-full',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div
      className={cn(
        'animate-pulse bg-surface-elevated/50',
        variantClasses[variant],
        className
      )}
    />
  );
}

/**
 * Card Skeleton
 */
export function CardSkeleton() {
  return (
    <div className="p-6 border border-border-default rounded-lg space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" className="w-12 h-12" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/6" />
      </div>
    </div>
  );
}

/**
 * List Skeleton
 */
interface ListSkeletonProps {
  count?: number;
}

export function ListSkeleton({ count = 5 }: ListSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border border-border-default rounded-lg">
          <Skeleton variant="circular" className="w-10 h-10 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

/**
 * Table Skeleton
 */
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div className="w-full space-y-3">
      {/* Header */}
      <div className="flex gap-4 p-4 bg-surface-elevated rounded-lg">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-4 border border-border-default rounded-lg">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Dashboard Skeleton
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-6 border border-border-default rounded-lg space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Content Area */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="p-6 border border-border-default rounded-lg">
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline Loader (for buttons, etc.)
 */
interface InlineLoaderProps {
  text?: string;
}

export function InlineLoader({ text = 'Loading...' }: InlineLoaderProps) {
  return (
    <div className="flex items-center gap-2">
      <Spinner size="sm" />
      <span className="text-sm text-text-subtle">{text}</span>
    </div>
  );
}

/**
 * Content Loader (preserves layout)
 */
interface ContentLoaderProps {
  children?: React.ReactNode;
  isLoading: boolean;
  fallback?: React.ReactNode;
}

export function ContentLoader({ children, isLoading, fallback }: ContentLoaderProps) {
  if (isLoading) {
    return fallback ? <>{fallback}</> : <CardSkeleton />;
  }

  return <>{children}</>;
}
