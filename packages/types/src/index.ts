/**
 * @easyeng/types — shared TypeScript types across web and mobile apps.
 *
 * Currently re-exports the Supabase-generated database types. Keep this as the
 * single source of truth: the Supabase type-regen script writes to
 * ./database.ts (see apps/web type-gen scripts).
 */
export * from './database';
