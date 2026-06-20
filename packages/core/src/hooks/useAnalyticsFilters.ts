'use client';
/**
 * Analytics Filters Hook
 *
 * Manages time period filtering logic for analytics dashboards
 *
 * Related Tasks: T111 [US5] Implement time period filtering logic
 */

import { useState, useCallback } from 'react';

export interface AnalyticsFilters {
  startDate: string;
  endDate: string;
  interval: 'day' | 'week' | 'month';
  role?: 'student' | 'teacher' | 'admin' | 'all';
  paymentMethod?: string;
  activityType?: string;
}

export interface UseAnalyticsFiltersReturn {
  filters: AnalyticsFilters;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  setInterval: (interval: 'day' | 'week' | 'month') => void;
  setRole: (role: 'student' | 'teacher' | 'admin' | 'all') => void;
  setPaymentMethod: (method: string) => void;
  setActivityType: (type: string) => void;
  setDateRange: (start: string, end: string) => void;
  resetFilters: () => void;
}

const DEFAULT_FILTERS: AnalyticsFilters = {
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0],
  interval: 'day',
  role: 'all',
};

export function useAnalyticsFilters(
  initialFilters?: Partial<AnalyticsFilters>
): UseAnalyticsFiltersReturn {
  const [filters, setFilters] = useState<AnalyticsFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  const setStartDate = useCallback((date: string) => {
    setFilters((prev) => ({ ...prev, startDate: date }));
  }, []);

  const setEndDate = useCallback((date: string) => {
    setFilters((prev) => ({ ...prev, endDate: date }));
  }, []);

  const setInterval = useCallback((interval: 'day' | 'week' | 'month') => {
    setFilters((prev) => ({ ...prev, interval }));
  }, []);

  const setRole = useCallback((role: 'student' | 'teacher' | 'admin' | 'all') => {
    setFilters((prev) => ({ ...prev, role }));
  }, []);

  const setPaymentMethod = useCallback((method: string) => {
    setFilters((prev) => ({ ...prev, paymentMethod: method }));
  }, []);

  const setActivityType = useCallback((type: string) => {
    setFilters((prev) => ({ ...prev, activityType: type }));
  }, []);

  const setDateRange = useCallback((start: string, end: string) => {
    setFilters((prev) => ({ ...prev, startDate: start, endDate: end }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  return {
    filters,
    setStartDate,
    setEndDate,
    setInterval,
    setRole,
    setPaymentMethod,
    setActivityType,
    setDateRange,
    resetFilters,
  };
}

/**
 * Helper function to calculate date range based on preset
 */
export function calculateDateRange(preset: 'week' | 'month' | 'quarter' | 'year'): {
  start: string;
  end: string;
} {
  const today = new Date();
  let startDate: Date;

  switch (preset) {
    case 'week':
      startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'quarter':
      startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      startDate = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
  }

  return {
    start: startDate.toISOString().split('T')[0],
    end: today.toISOString().split('T')[0],
  };
}

/**
 * Helper function to format date for display
 */
export function formatDateForDisplay(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Helper function to calculate the number of days in a date range
 */
export function calculateDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}
