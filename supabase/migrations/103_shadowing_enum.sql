-- 103_shadowing_enum.sql
-- Adds the 'shadowing' material type.
--
-- ISOLATED ON PURPOSE: ALTER TYPE ... ADD VALUE cannot run in a transaction
-- block that later references the new label (see 080_materials_library.sql:38).
-- Keep this file to this one statement.

ALTER TYPE material_type ADD VALUE IF NOT EXISTS 'shadowing';
