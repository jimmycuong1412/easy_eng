/**
 * @easyeng/core — shared business logic (Supabase data hooks, stores, utils)
 * consumed by both the web (Next.js) and mobile (React Native) apps.
 *
 * Platform-specific concerns are injected via adapters; each app registers them
 * once at startup (see ./adapters/*).
 */

// Adapters (platform injection points)
export * from './adapters/supabase';
export * from './adapters/storage';
export * from './adapters/platform';

// Stores
export * from './stores/notificationStore';
export * from './stores/authStore';

// Lib (portable utilities + queries)
export * from './lib/sanitization';
export * from './lib/timezone';
export * from './lib/grammar/rules';
export * from './lib/queries';
export * from './lib/queries/materials';
export * from './lib/queries/shadowing';
export * from './lib/shadowing';
export * from './lib/cometchat';

// Hooks (Supabase data + client state)
export * from './hooks/useAuth';
export * from './hooks/useNotificationPreferences';
export * from './hooks/useGemsBalance';
export * from './hooks/useStreak';
export * from './hooks/useXpSummary';
export * from './hooks/useWeeklyGoal';
export * from './hooks/useSavedWords';
export * from './hooks/useProgressReport';
export * from './hooks/useActivityDates';
export * from './hooks/useGemNotifications';
export * from './hooks/useRealtimeNotifications';
export * from './hooks/useClassReminder';
export * from './hooks/useScheduleDraft';
export * from './hooks/useAnalyticsFilters';
export * from './hooks/useSlotSelection';
