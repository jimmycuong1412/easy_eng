import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx and tailwind-merge.
 * This handles conflicting classes properly.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number with locale-specific thousand separators.
 * Uses a fixed locale to prevent hydration mismatches between server and client.
 */
export function formatNumber(num: number, locale: string = 'vi-VN'): string {
  return new Intl.NumberFormat(locale).format(num);
}

/**
 * Format a number as currency.
 */
export function formatCurrency(
  amount: number,
  currency: string = 'VND',
  locale: string = 'vi-VN'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format cents to currency display.
 */
export function formatCents(
  cents: number,
  currency: string = 'VND',
  locale: string = 'vi-VN'
): string {
  // VND doesn't use cents, so we divide by 100 for other currencies
  const amount = currency === 'VND' ? cents : cents / 100;
  return formatCurrency(amount, currency, locale);
}

/**
 * Format a date relative to now (e.g., "2 hours ago").
 */
export function formatRelativeTime(date: Date | string, locale: string = 'vi-VN'): string {
  const now = new Date();
  const then = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (diffInSeconds < 60) {
    return rtf.format(-diffInSeconds, 'second');
  }
  if (diffInSeconds < 3600) {
    return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
  }
  if (diffInSeconds < 86400) {
    return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
  }
  if (diffInSeconds < 2592000) {
    return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
  }
  if (diffInSeconds < 31536000) {
    return rtf.format(-Math.floor(diffInSeconds / 2592000), 'month');
  }
  return rtf.format(-Math.floor(diffInSeconds / 31536000), 'year');
}

/**
 * Format a date for display.
 */
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  },
  locale: string = 'vi-VN'
): string {
  return new Intl.DateTimeFormat(locale, options).format(new Date(date));
}

/**
 * Format time for display (e.g., "14:30").
 */
export function formatTime(
  date: Date | string,
  locale: string = 'vi-VN',
  hour12: boolean = false
): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12,
  }).format(new Date(date));
}

/**
 * Calculate XP required for a given level.
 * Uses 500 XP per level as defined in the spec.
 */
export function xpForLevel(level: number): number {
  return level * 500;
}

/**
 * Calculate level from total XP.
 */
export function levelFromXp(totalXp: number): { level: number; currentXp: number; xpToNext: number } {
  const level = Math.floor(totalXp / 500) + 1;
  const currentXp = totalXp % 500;
  const xpToNext = 500 - currentXp;
  return { level, currentXp, xpToNext };
}

/**
 * Calculate discount from gems.
 * 1 Gem = 1000 VND discount (as per spec).
 */
export function gemDiscount(gems: number): number {
  return gems * 1000; // in VND
}

/** @deprecated Use gemDiscount instead */
export const cookieDiscount = gemDiscount;

/**
 * Truncate text to a maximum length with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Generate initials from a name.
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Delay execution for a specified time.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if we're in a browser environment.
 */
export const isBrowser = typeof window !== 'undefined';

/**
 * Generate a random ID.
 */
export function generateId(): string {
  return crypto.randomUUID();
}
