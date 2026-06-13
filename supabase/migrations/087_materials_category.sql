-- Migration 087: Materials — phân loại theo danh mục (category) + subcategory
-- Date: 2026-06-13
--
-- Thêm hệ thống phân loại danh mục cho thư viện tài liệu, khớp taxonomy của
-- EasyEng (8 danh mục lớn). Mỗi material thuộc 1 danh mục + 1 subcategory (text
-- tự do, ví dụ "life" / "business" / "entertainment" cho nhóm tin tức).
--
-- Level vẫn giữ CEFR (a1–c1) — không đổi.

-- ============================================================
-- 1. Enum danh mục lớn (8 giá trị, khớp taxonomy)
-- ============================================================
DO $$ BEGIN
  CREATE TYPE material_category AS ENUM (
    'daily_news_talk',   -- 📰 Tin Tức & Thảo Luận
    'callan_method',     -- 🇬🇧 Phương Pháp Callan
    'grammar_basics',    -- 🧱 Ngữ Pháp & Giao Tiếp Cơ Bản
    'business_english',  -- 🏢 Tiếng Anh Thương Mại
    'daily_travel',      -- ✈️ Giao Tiếp Đời Sống & Du Lịch
    'pronunciation',     -- 🗣️ Luyện Phát Âm
    'exam_prep',         -- 🎓 Luyện Thi Chứng Chỉ & Kiểm Tra
    'kids_english'       -- 🧸 Tiếng Anh Trẻ Em
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 2. Cột category + subcategory trên materials
-- ============================================================
-- category nullable để bài cũ không vỡ; backfill ở dưới rồi vẫn để nullable
-- (bài do admin tạo tay có thể chưa phân loại ngay).
ALTER TABLE materials
  ADD COLUMN IF NOT EXISTS category    material_category NULL,
  ADD COLUMN IF NOT EXISTS subcategory text NULL CHECK (subcategory IS NULL OR length(subcategory) <= 64);

CREATE INDEX IF NOT EXISTS idx_materials_category
  ON materials (category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_materials_category_published
  ON materials (category, status) WHERE status = 'published';

COMMENT ON COLUMN materials.category IS
  'Danh mục lớn theo taxonomy EasyEng (8 nhóm). Null = chưa phân loại.';
COMMENT ON COLUMN materials.subcategory IS
  'Phân loại con trong danh mục, vd với daily_news_talk: life | business | entertainment.';

-- ============================================================
-- 3. Backfill bài cũ — suy luận category từ type/goal/tags hiện có
-- ============================================================
-- Bài luyện thi (goal toeic/ielts/vstep hoặc type mock_test) -> exam_prep
UPDATE materials SET category = 'exam_prep'
WHERE category IS NULL
  AND (type = 'mock_test' OR goal IN ('toeic', 'ielts', 'vstep'));

-- Bài thương mại
UPDATE materials SET category = 'business_english'
WHERE category IS NULL AND goal = 'business';

-- Bài du lịch / giao tiếp đời sống
UPDATE materials SET category = 'daily_travel'
WHERE category IS NULL AND goal IN ('travel', 'conversation');

-- Bài ngữ pháp
UPDATE materials SET category = 'grammar_basics'
WHERE category IS NULL AND type = 'grammar_lesson';

-- Bài đọc (reading_passage) còn lại -> tin tức & thảo luận (mặc định cho bài từ báo)
UPDATE materials SET category = 'daily_news_talk', subcategory = COALESCE(subcategory, 'life')
WHERE category IS NULL AND type = 'reading_passage';

-- Phần còn lại (vocabulary_pack, dialogue... chưa rõ) -> grammar_basics tạm
UPDATE materials SET category = 'grammar_basics'
WHERE category IS NULL;
