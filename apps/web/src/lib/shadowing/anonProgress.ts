/**
 * Anonymous shadowing progress — localStorage only.
 *
 * Deliberately NOT hardened. A visitor who clears localStorage gets more reps;
 * that is not an attack worth engineering against, and treating it as one would
 * cost more than it saves.
 *
 * On signup this record is replayed into the account so the user's first
 * logged-in view already shows their scores (Phase B).
 */

const STORAGE_KEY = 'easyeng.shadowing.anon';

/**
 * Distinct clips an anonymous visitor may practise per day before the wall.
 * A named constant because this number will be A/B tested against real ad
 * traffic — the page's SEO value and its conversion value pull in opposite
 * directions here.
 */
export const ANON_DAILY_CLIP_LIMIT = 3;

/**
 * Fixed timezone the daily quota resets in, matching the rest of the app's
 * "what day is it for this user" logic (see StreakWidget.tsx and the
 * `AT TIME ZONE 'Asia/Ho_Chi_Minh'` streak RPCs). The audience is
 * Vietnam-based, so the day boundary is pinned to Vietnam local time rather
 * than the visitor's own browser timezone or UTC — a traveller abroad should
 * still see the quota reset on the same schedule as everyone else, and this
 * stays consistent with server-side day logic that uses the same fixed zone.
 */
const ANON_PROGRESS_TIMEZONE = 'Asia/Ho_Chi_Minh';

export interface AnonAttempt {
  clipId: string;
  overall: number;
}

export interface AnonProgress {
  /** Date (YYYY-MM-DD) the attempts belong to, in ANON_PROGRESS_TIMEZONE. */
  date: string;
  attempts: AnonAttempt[];
}

function today(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: ANON_PROGRESS_TIMEZONE });
}

function isValidAttempt(a: unknown): a is AnonAttempt {
  return (
    typeof a === 'object' &&
    a !== null &&
    typeof (a as AnonAttempt).clipId === 'string' &&
    typeof (a as AnonAttempt).overall === 'number' &&
    Number.isFinite((a as AnonAttempt).overall)
  );
}

function empty(): AnonProgress {
  return { date: today(), attempts: [] };
}

/**
 * Shared parse/validate core for both readers below. Never throws; returns
 * `null` when there is nothing usable in storage (missing key, storage
 * disabled, corrupt JSON, or wrong shape) so each caller can decide what
 * "nothing usable" means for its own date policy.
 */
function readRaw(): AnonProgress | null {
  if (typeof window === 'undefined') return null;

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage disabled (private mode, blocked cookies) — behave as if empty.
    return null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<AnonProgress>;
    if (typeof parsed?.date !== 'string' || !Array.isArray(parsed?.attempts)) {
      // Missing or malformed — nothing usable.
      return null;
    }
    return { date: parsed.date, attempts: parsed.attempts.filter(isValidAttempt) };
  } catch {
    return null;
  }
}

/**
 * Quota-aware reader: attempts from any day other than today do not count.
 * This is what `anonClipsUsed()` / `isAnonLimitReached()` are built on, and
 * it must keep resetting daily — do not weaken the date check here.
 */
export function readAnonProgress(): AnonProgress {
  const parsed = readRaw();
  if (!parsed || parsed.date !== today()) {
    // Missing, malformed, or from a previous day — start fresh.
    return empty();
  }
  return parsed;
}

/**
 * Carry-over reader: returns whatever attempts are stored, regardless of
 * which day they were recorded on.
 *
 * The date gate in `readAnonProgress()` exists to reset the daily quota, not
 * to expire the attempts themselves. But the registration flow makes
 * crossing midnight the NORMAL case — signUp shows "check your email" and
 * redirects to /auth/login; the user confirms by email and logs back in,
 * often the next day. Gating carry-over on "today" would silently drop their
 * scores right when SignupWall's promise ("save your results") is supposed
 * to be honoured. So this reader applies the same corruption/shape
 * validation as readAnonProgress but never the date check.
 */
export function readAnonProgressForCarryOver(): AnonAttempt[] {
  return readRaw()?.attempts ?? [];
}

function write(progress: AnonProgress): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Storage full or disabled — progress is best-effort, never fatal.
  }
}

/** Record an attempt, keeping the best score per clip. */
export function recordAnonAttempt(clipId: string, overall: number): AnonProgress {
  const progress = readAnonProgress();
  const existing = progress.attempts.find((a) => a.clipId === clipId);
  if (existing) {
    existing.overall = Math.max(existing.overall, overall);
  } else {
    progress.attempts.push({ clipId, overall });
  }
  write(progress);
  return progress;
}

/** Distinct clips practised today. Retries of one clip count once. */
export function anonClipsUsed(): number {
  return readAnonProgress().attempts.length;
}

export function isAnonLimitReached(): boolean {
  return anonClipsUsed() >= ANON_DAILY_CLIP_LIMIT;
}

export function clearAnonProgress(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do.
  }
}
