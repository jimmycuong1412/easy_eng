-- Migration 086: Materials — publish ngay + hẹn giờ tự động publish
-- Date: 2026-06-13
--
-- Bổ sung khả năng cho ADMIN:
--   1. publish_material(id)            — publish 1 bài NGAY (draft → published).
--   2. schedule_material_publish(id, at) — đặt lịch tự động publish vào thời điểm `at`.
--   3. cancel_material_publish_schedule(id) — huỷ lịch đã đặt.
--   4. publish_scheduled_materials()   — job: publish mọi bài đã tới hạn (pg_cron gọi).
--
-- Quy trình: 1 cấp (draft → published). Ràng buộc song ngữ
-- (materials_published_bilingual_chk) vẫn được tôn trọng — publish thiếu tiếng
-- Anh sẽ bị chặn với thông báo rõ ràng.
--
-- Tất cả RPC là SECURITY DEFINER + chỉ cho admin (qua public.get_my_role()),
-- theo đúng quy ước migration 083.

-- ============================================================
-- 1. Cột lịch publish
-- ============================================================
ALTER TABLE materials
  ADD COLUMN IF NOT EXISTS scheduled_publish_at timestamptz NULL;

-- Index cho job quét: chỉ những bài draft có đặt lịch.
CREATE INDEX IF NOT EXISTS idx_materials_scheduled_publish
  ON materials (scheduled_publish_at)
  WHERE status = 'draft' AND scheduled_publish_at IS NOT NULL;

COMMENT ON COLUMN materials.scheduled_publish_at IS
  'Nếu set + status=draft: job pg_cron sẽ tự publish khi now() >= giá trị này.';

-- ============================================================
-- 2. Hàm nội bộ: thực thi publish 1 bài (KHÔNG kiểm quyền — caller tự lo)
--    Kiểm song ngữ tại đây để dùng chung cho cả publish tay lẫn theo lịch.
-- ============================================================
CREATE OR REPLACE FUNCTION public._do_publish_material(
  p_material_id uuid,
  p_actor_id    uuid
) RETURNS materials
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_material materials%ROWTYPE;
BEGIN
  SELECT * INTO v_material FROM materials WHERE id = p_material_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'material not found'
      USING ERRCODE = 'P0002', HINT = p_material_id::text;
  END IF;

  IF v_material.status = 'published' THEN
    -- Idempotent: đã published thì thôi (vẫn xoá lịch nếu còn).
    UPDATE materials SET scheduled_publish_at = NULL
      WHERE id = p_material_id AND scheduled_publish_at IS NOT NULL;
    RETURN v_material;
  END IF;

  -- Ràng buộc song ngữ: phải đủ title_en + summary_en + body_en.
  IF v_material.title_en IS NULL OR btrim(v_material.title_en) = ''
     OR v_material.summary_en IS NULL OR btrim(v_material.summary_en) = ''
     OR v_material.body_en IS NULL OR btrim(v_material.body_en) = '' THEN
    RAISE EXCEPTION 'cần đủ nội dung tiếng Anh trước khi xuất bản (title_en, summary_en, body_en)'
      USING ERRCODE = 'P0001',
            HINT = 'missing_bilingual';
  END IF;

  UPDATE materials
  SET status               = 'published',
      published_at         = now(),
      published_by         = p_actor_id,
      scheduled_publish_at = NULL,        -- đã publish thì xoá lịch
      last_editor_id       = COALESCE(p_actor_id, last_editor_id)
  WHERE id = p_material_id
  RETURNING * INTO v_material;

  -- Ghi audit (bảng materials_audit có sẵn từ migration 080).
  INSERT INTO materials_audit (event, material_id, user_id, payload)
  VALUES ('material_published', p_material_id, p_actor_id,
          jsonb_build_object('published_at', v_material.published_at));

  RETURN v_material;
END;
$$;

-- ============================================================
-- 3. publish_material(id) — admin publish NGAY
-- ============================================================
CREATE OR REPLACE FUNCTION public.publish_material(
  p_material_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_material materials%ROWTYPE;
BEGIN
  IF public.get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'chỉ admin được xuất bản'
      USING ERRCODE = '42501';
  END IF;

  v_material := public._do_publish_material(p_material_id, auth.uid());

  RETURN jsonb_build_object(
    'id', v_material.id,
    'status', v_material.status,
    'published_at', v_material.published_at
  );
END;
$$;

-- ============================================================
-- 4. schedule_material_publish(id, at) — admin đặt lịch
-- ============================================================
CREATE OR REPLACE FUNCTION public.schedule_material_publish(
  p_material_id uuid,
  p_publish_at  timestamptz
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_material materials%ROWTYPE;
BEGIN
  IF public.get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'chỉ admin được đặt lịch xuất bản'
      USING ERRCODE = '42501';
  END IF;

  IF p_publish_at IS NULL THEN
    RAISE EXCEPTION 'thời điểm hẹn giờ không được rỗng' USING ERRCODE = 'P0001';
  END IF;
  IF p_publish_at <= now() THEN
    RAISE EXCEPTION 'thời điểm hẹn giờ phải ở tương lai' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_material FROM materials WHERE id = p_material_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'material not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_material.status <> 'draft' THEN
    RAISE EXCEPTION 'chỉ đặt lịch được cho bài đang ở trạng thái draft'
      USING ERRCODE = 'P0001';
  END IF;

  -- Kiểm song ngữ NGAY khi đặt lịch để admin biết sớm (không đợi tới giờ mới lỗi).
  IF v_material.title_en IS NULL OR btrim(v_material.title_en) = ''
     OR v_material.summary_en IS NULL OR btrim(v_material.summary_en) = ''
     OR v_material.body_en IS NULL OR btrim(v_material.body_en) = '' THEN
    RAISE EXCEPTION 'cần đủ nội dung tiếng Anh trước khi đặt lịch xuất bản'
      USING ERRCODE = 'P0001', HINT = 'missing_bilingual';
  END IF;

  UPDATE materials
  SET scheduled_publish_at = p_publish_at
  WHERE id = p_material_id;

  INSERT INTO materials_audit (event, material_id, user_id, payload)
  VALUES ('material_publish_scheduled', p_material_id, auth.uid(),
          jsonb_build_object('scheduled_publish_at', p_publish_at));

  RETURN jsonb_build_object('id', p_material_id, 'scheduled_publish_at', p_publish_at);
END;
$$;

-- ============================================================
-- 5. cancel_material_publish_schedule(id) — admin huỷ lịch
-- ============================================================
CREATE OR REPLACE FUNCTION public.cancel_material_publish_schedule(
  p_material_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'chỉ admin được huỷ lịch xuất bản'
      USING ERRCODE = '42501';
  END IF;

  UPDATE materials SET scheduled_publish_at = NULL WHERE id = p_material_id;

  INSERT INTO materials_audit (event, material_id, user_id, payload)
  VALUES ('material_publish_schedule_cancelled', p_material_id, auth.uid(), '{}'::jsonb);

  RETURN jsonb_build_object('id', p_material_id, 'scheduled_publish_at', NULL);
END;
$$;

-- ============================================================
-- 6. publish_scheduled_materials() — JOB: publish mọi bài đã tới hạn
--    Chạy với quyền owner (SECURITY DEFINER), KHÔNG kiểm get_my_role()
--    vì caller là pg_cron (không có phiên người dùng). Bài nào thiếu song
--    ngữ sẽ bị bỏ qua + ghi audit, không làm hỏng cả lượt chạy.
-- ============================================================
CREATE OR REPLACE FUNCTION public.publish_scheduled_materials()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row       record;
  v_published int := 0;
BEGIN
  FOR v_row IN
    SELECT id, published_by
    FROM materials
    WHERE status = 'draft'
      AND scheduled_publish_at IS NOT NULL
      AND scheduled_publish_at <= now()
    ORDER BY scheduled_publish_at
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      -- Actor = người đã đặt lịch nếu biết, nếu không thì NULL (job hệ thống).
      PERFORM public._do_publish_material(v_row.id, v_row.published_by);
      v_published := v_published + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Bài lỗi (vd thiếu song ngữ): bỏ lịch để khỏi lặp lại mãi + ghi audit.
      UPDATE materials SET scheduled_publish_at = NULL WHERE id = v_row.id;
      INSERT INTO materials_audit (event, material_id, user_id, payload)
      VALUES ('material_scheduled_publish_failed', v_row.id, NULL,
              jsonb_build_object('error', SQLERRM));
    END;
  END LOOP;

  RETURN v_published;
END;
$$;

-- ============================================================
-- 7. Quyền gọi RPC: chỉ user đã đăng nhập (authenticated). RLS/role-check
--    bên trong hàm tự lo phần admin.
-- ============================================================
REVOKE ALL ON FUNCTION public.publish_material(uuid) FROM public;
REVOKE ALL ON FUNCTION public.schedule_material_publish(uuid, timestamptz) FROM public;
REVOKE ALL ON FUNCTION public.cancel_material_publish_schedule(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.publish_material(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_material_publish(uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_material_publish_schedule(uuid) TO authenticated;

-- _do_publish_material và publish_scheduled_materials KHÔNG cấp cho client.
REVOKE ALL ON FUNCTION public._do_publish_material(uuid, uuid) FROM public;
REVOKE ALL ON FUNCTION public.publish_scheduled_materials() FROM public;

-- ============================================================
-- 8. pg_cron: chạy job mỗi phút
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Gỡ job cũ (nếu migration chạy lại) rồi đăng ký lại.
DO $$
BEGIN
  PERFORM cron.unschedule('publish-scheduled-materials')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'publish-scheduled-materials');
EXCEPTION WHEN OTHERS THEN
  NULL;  -- chưa có job thì bỏ qua
END $$;

SELECT cron.schedule(
  'publish-scheduled-materials',
  '* * * * *',                                   -- mỗi phút
  $$ SELECT public.publish_scheduled_materials(); $$
);
