-- Migration: Marketplace Items Table
-- Description: Stores purchasable cosmetic items for character customization
-- Related to: Phase 10 - Character & Gamification System (T155)

-- Create enum for item categories
CREATE TYPE item_category AS ENUM ('hat', 'outfit', 'background', 'emote', 'pet');

-- Create marketplace_items table
CREATE TABLE IF NOT EXISTS marketplace_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category item_category NOT NULL,
  price_gold INTEGER NOT NULL CHECK (price_gold > 0),
  sprite_url TEXT NOT NULL, -- Path to item sprite in storage
  preview_url TEXT, -- Optional preview image
  career_compatibility JSONB NOT NULL DEFAULT '{"type": "all"}', -- {"type": "all"} or {"type": "specific", "careers": ["doctor", "engineer"]}
  rarity VARCHAR(50) DEFAULT 'common', -- common, uncommon, rare, epic, legendary
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_marketplace_items_category ON marketplace_items(category);
CREATE INDEX idx_marketplace_items_active ON marketplace_items(is_active) WHERE is_active = true;
CREATE INDEX idx_marketplace_items_price ON marketplace_items(price_gold);
CREATE INDEX idx_marketplace_items_sort ON marketplace_items(sort_order);

-- Create function to check if item is compatible with career
CREATE OR REPLACE FUNCTION is_item_compatible(
  p_item_id UUID,
  p_career_path VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
  v_compatibility JSONB;
  v_type TEXT;
BEGIN
  SELECT career_compatibility INTO v_compatibility
  FROM marketplace_items
  WHERE id = p_item_id;

  v_type := v_compatibility->>'type';

  IF v_type = 'all' THEN
    RETURN true;
  ELSIF v_type = 'specific' THEN
    RETURN v_compatibility->'careers' @> to_jsonb(p_career_path);
  ELSE
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to get marketplace items for a student's career
CREATE OR REPLACE FUNCTION get_compatible_marketplace_items(p_student_id UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  description TEXT,
  category item_category,
  price_gold INTEGER,
  sprite_url TEXT,
  preview_url TEXT,
  career_compatibility JSONB,
  rarity VARCHAR,
  is_owned BOOLEAN,
  is_equipped BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mi.id,
    mi.name,
    mi.description,
    mi.category,
    mi.price_gold,
    mi.sprite_url,
    mi.preview_url,
    mi.career_compatibility,
    mi.rarity,
    CASE WHEN si.id IS NOT NULL THEN true ELSE false END as is_owned,
    CASE WHEN si.is_equipped THEN true ELSE false END as is_equipped
  FROM marketplace_items mi
  LEFT JOIN student_inventory si ON si.item_id = mi.id AND si.student_id = p_student_id
  WHERE mi.is_active = true
  ORDER BY mi.sort_order, mi.price_gold;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add RLS policies
ALTER TABLE marketplace_items ENABLE ROW LEVEL SECURITY;

-- Everyone can view active marketplace items
CREATE POLICY "Active marketplace items are viewable by everyone"
  ON marketplace_items FOR SELECT
  USING (is_active = true OR auth.jwt() ->> 'role' = 'admin');

-- Only admins can manage marketplace items
CREATE POLICY "Only admins can manage marketplace items"
  ON marketplace_items FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'admin' OR
    auth.jwt() ->> 'user_role' = 'admin'
  );

-- Add updated_at trigger
CREATE TRIGGER set_marketplace_items_updated_at
  BEFORE UPDATE ON marketplace_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE marketplace_items IS 'Catalog of purchasable cosmetic items for character customization';
COMMENT ON COLUMN marketplace_items.category IS 'Type of item: hat, outfit, background, emote, or pet';
COMMENT ON COLUMN marketplace_items.price_gold IS 'Cost in Gold coins (not Gems)';
COMMENT ON COLUMN marketplace_items.career_compatibility IS 'JSON defining which careers can use this item';
COMMENT ON COLUMN marketplace_items.rarity IS 'Visual rarity indicator (common, uncommon, rare, epic, legendary)';
COMMENT ON FUNCTION is_item_compatible IS 'Checks if a marketplace item is compatible with a given career path';
COMMENT ON FUNCTION get_compatible_marketplace_items IS 'Returns all marketplace items with ownership status for a student';
