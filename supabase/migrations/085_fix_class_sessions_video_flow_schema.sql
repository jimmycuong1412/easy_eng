-- ============================================================================
-- 085: Align live class_sessions/session_participants with the video flow code
-- ============================================================================
-- The frontend live-class page (app/[locale]/class/[classId]/live/page.tsx)
-- was written against 021_class_sessions.sql, but the live DB diverged:
--   * cometchat_group_id / max_participants / current_participants missing
--     (live table had meeting_id / participant_count instead)
--   * scheduled_end_time NOT NULL but never sent by the code
--   * status CHECK lacked 'waiting' / 'live' / 'ended'
--   * session_participants had no role column and no INSERT/UPDATE policies
-- Applied to production 2026-06-12 via MCP (fix_class_sessions_video_flow_schema).

-- 1. class_sessions: columns the live page inserts
ALTER TABLE public.class_sessions
  ADD COLUMN IF NOT EXISTS cometchat_group_id TEXT,
  ADD COLUMN IF NOT EXISTS max_participants INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS current_participants INTEGER NOT NULL DEFAULT 0;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'class_sessions_cometchat_group_id_key') THEN
    ALTER TABLE public.class_sessions ADD CONSTRAINT class_sessions_cometchat_group_id_key UNIQUE (cometchat_group_id);
  END IF;
END $$;

-- 2. scheduled_end_time: code never sends it; keep it derivable instead of required
ALTER TABLE public.class_sessions ALTER COLUMN scheduled_end_time DROP NOT NULL;

-- 3. status CHECK: code uses waiting/live/ended; keep legacy values for old rows
DO $$
DECLARE c TEXT;
BEGIN
  SELECT conname INTO c FROM pg_constraint
  WHERE conrelid = 'public.class_sessions'::regclass AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%status%';
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.class_sessions DROP CONSTRAINT %I', c);
  END IF;
END $$;
ALTER TABLE public.class_sessions ADD CONSTRAINT class_sessions_status_check
  CHECK (status::text = ANY (ARRAY['scheduled','waiting','live','in_progress','completed','ended','cancelled','no_show']));

-- 4. session_participants: role column used by the join upsert
ALTER TABLE public.session_participants ADD COLUMN IF NOT EXISTS role TEXT;

-- 5. session_participants RLS: only SELECT existed — joins need INSERT/UPDATE of own row
DROP POLICY IF EXISTS "Participants insert own records" ON public.session_participants;
CREATE POLICY "Participants insert own records" ON public.session_participants
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Participants update own records" ON public.session_participants;
CREATE POLICY "Participants update own records" ON public.session_participants
  FOR UPDATE USING (user_id = auth.uid());
