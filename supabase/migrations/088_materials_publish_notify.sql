-- Migration 088: Thông báo cho admin khi material được xuất bản
-- Date: 2026-06-13
--
-- Cập nhật _do_publish_material (migration 086) để sau khi publish thành công,
-- tạo notification 'material_published' cho TẤT CẢ admin. Áp dụng cho cả publish
-- tay (publish_material) lẫn publish theo lịch (publish_scheduled_materials),
-- vì cả hai đều đi qua _do_publish_material.
--
-- Notification lỗi KHÔNG làm hỏng việc publish (bọc trong khối phụ, nuốt lỗi).
--
-- Đồng thời mở rộng CHECK constraint notifications_type_check để chấp nhận 2
-- loại mới: material_pending_review (route ingest) và material_published.

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
  type = ANY (ARRAY[
    'booking_confirmed','booking_cancelled','class_reminder','gems_earned','xp_earned',
    'achievement_unlocked','level_up','class_started','class_ended','payment_received',
    'system_announcement','friend_request','message_received','new_booking','slot_opened',
    'teacher_favorited','booking_payment','cancellation_alert',
    'material_pending_review','material_published'
  ])
);

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
    UPDATE materials SET scheduled_publish_at = NULL
      WHERE id = p_material_id AND scheduled_publish_at IS NOT NULL;
    RETURN v_material;
  END IF;

  IF v_material.title_en IS NULL OR btrim(v_material.title_en) = ''
     OR v_material.summary_en IS NULL OR btrim(v_material.summary_en) = ''
     OR v_material.body_en IS NULL OR btrim(v_material.body_en) = '' THEN
    RAISE EXCEPTION 'cần đủ nội dung tiếng Anh trước khi xuất bản (title_en, summary_en, body_en)'
      USING ERRCODE = 'P0001', HINT = 'missing_bilingual';
  END IF;

  UPDATE materials
  SET status               = 'published',
      published_at         = now(),
      published_by         = p_actor_id,
      scheduled_publish_at = NULL,
      last_editor_id       = COALESCE(p_actor_id, last_editor_id)
  WHERE id = p_material_id
  RETURNING * INTO v_material;

  INSERT INTO materials_audit (event, material_id, user_id, payload)
  VALUES ('material_published', p_material_id, p_actor_id,
          jsonb_build_object('published_at', v_material.published_at));

  -- Thông báo cho mọi admin (best-effort; lỗi không làm hỏng publish).
  BEGIN
    INSERT INTO notifications (
      user_id, type, title, message, action_url, action_label,
      related_id, related_type, icon, priority, data
    )
    SELECT
      p.id,
      'material_published',
      'Bài học đã được xuất bản',
      '"' || v_material.title_vi || '" đã xuất bản và hiển thị cho học viên.',
      '/vi/materials/' || v_material.slug,
      'Xem bài',
      v_material.id,
      'material',
      '✅',
      'normal',
      jsonb_build_object('category', v_material.category)
    FROM profiles p
    WHERE p.role = 'admin';
  EXCEPTION WHEN OTHERS THEN
    -- Nuốt lỗi notification để không làm hỏng việc publish.
    NULL;
  END;

  RETURN v_material;
END;
$$;
