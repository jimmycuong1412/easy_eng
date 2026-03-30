/**
 * Timezone-aware date/time formatting utilities.
 * Uses the user's stored timezone preference from their profile.
 */

/** All supported IANA timezone identifiers with display labels. */
export const TIMEZONE_OPTIONS = [
  { value: 'Asia/Ho_Chi_Minh', label: '(GMT+7) Hồ Chí Minh' },
  { value: 'Asia/Bangkok', label: '(GMT+7) Bangkok' },
  { value: 'Asia/Singapore', label: '(GMT+8) Singapore' },
  { value: 'Asia/Tokyo', label: '(GMT+9) Tokyo' },
  { value: 'America/New_York', label: '(GMT-5) New York' },
  { value: 'Europe/London', label: '(GMT+0) London' },
] as const;

export type SupportedTimezone = (typeof TIMEZONE_OPTIONS)[number]['value'];

/** Returns the display label for a timezone identifier. */
export function getTimezoneLabel(timezone: string): string {
  const found = TIMEZONE_OPTIONS.find((tz) => tz.value === timezone);
  return found ? found.label : timezone;
}

/**
 * Format a Date (or ISO string) as a time in the given timezone.
 * e.g. "09:30"
 */
export function formatTime(
  date: Date | string,
  timezone: string,
  locale = 'en-US'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString(locale, {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format a Date (or ISO string) as a date in the given timezone.
 * e.g. "Mar 17, 2026"
 */
export function formatDate(
  date: Date | string,
  timezone: string,
  locale = 'en-US'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale, {
    timeZone: timezone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a Date (or ISO string) as a date+time in the given timezone.
 * e.g. "Mar 17, 2026, 09:30"
 */
export function formatDateTime(
  date: Date | string,
  timezone: string,
  locale = 'en-US'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString(locale, {
    timeZone: timezone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format a time range in the given timezone.
 * e.g. "09:00 – 09:30"
 */
export function formatTimeRange(
  start: Date | string,
  end: Date | string,
  timezone: string,
  locale = 'en-US'
): string {
  return `${formatTime(start, timezone, locale)} – ${formatTime(end, timezone, locale)}`;
}

/**
 * Get the current local time string in a given timezone.
 * e.g. "09:30:45"
 */
export function getCurrentTimeInTimezone(timezone: string, locale = 'en-US'): string {
  return new Date().toLocaleTimeString(locale, { timeZone: timezone });
}

/**
 * Returns true if the given string is a plausible IANA timezone identifier.
 * Does a lightweight check — uses Intl.DateTimeFormat.
 */
export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
