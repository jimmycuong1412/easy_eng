-- Migration: Student Inventory Table
-- Description: Tracks items owned and equipped by students
-- Related to: Phase 10 - Character & Gamification System (T156)

-- Create student_inventory table
CREATE TABLE IF NOT EXISTS student_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
  is_equipped BOOLEAN DEFAULT false,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  gold_spent INTEGER NOT NULL CHECK (gold_spent > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each student can own an item only once
  UNIQUE (student_id, item_id)
);

-- Create indexes
CREATE INDEX idx_student_inventory_student ON student_inventory(student_id);
CREATE INDEX idx_student_inventory_item ON student_inventory(item_id);
CREATE INDEX idx_student_inventory_equipped ON student_inventory(student_id, is_equipped) WHERE is_equipped = true;
CREATE INDEX idx_student_inventory_purchased ON student_inventory(purchased_at DESC);

-- Create function to equip an item (unequips others in same category)
CREATE OR REPLACE FUNCTION equip_item(
  p_student_id UUID,
  p_item_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_item_category item_category;
  v_exists BOOLEAN;
BEGIN
  -- Check if student owns the item
  SELECT EXISTS (
    SELECT 1 FROM student_inventory
    WHERE student_id = p_student_id AND item_id = p_item_id
  ) INTO v_exists;

  IF NOT v_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Item not owned by student'
    );
  END IF;

  -- Get item category
  SELECT category INTO v_item_category
  FROM marketplace_items
  WHERE id = p_item_id;

  -- Unequip all items in same category for this student
  UPDATE student_inventory si
  SET is_equipped = false, updated_at = NOW()
  FROM marketplace_items mi
  WHERE si.item_id = mi.id
    AND si.student_id = p_student_id
    AND mi.category = v_item_category
    AND si.is_equipped = true;

  -- Equip the selected item
  UPDATE student_inventory
  SET is_equipped = true, updated_at = NOW()
  WHERE student_id = p_student_id AND item_id = p_item_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Item equipped successfully'
  );
END;
$$ LANGUAGE plpgsql;

-- Create function to unequip an item
CREATE OR REPLACE FUNCTION unequip_item(
  p_student_id UUID,
  p_item_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Check if student owns the item
  SELECT EXISTS (
    SELECT 1 FROM student_inventory
    WHERE student_id = p_student_id AND item_id = p_item_id
  ) INTO v_exists;

  IF NOT v_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Item not owned by student'
    );
  END IF;

  -- Unequip the item
  UPDATE student_inventory
  SET is_equipped = false, updated_at = NOW()
  WHERE student_id = p_student_id AND item_id = p_item_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Item unequipped successfully'
  );
END;
$$ LANGUAGE plpgsql;

-- Create function to get student's equipped items
CREATE OR REPLACE FUNCTION get_equipped_items(p_student_id UUID)
RETURNS TABLE (
  item_id UUID,
  name VARCHAR,
  category item_category,
  sprite_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mi.id,
    mi.name,
    mi.category,
    mi.sprite_url
  FROM student_inventory si
  JOIN marketplace_items mi ON mi.id = si.item_id
  WHERE si.student_id = p_student_id
    AND si.is_equipped = true;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add RLS policies
ALTER TABLE student_inventory ENABLE ROW LEVEL SECURITY;

-- Students can view their own inventory
CREATE POLICY "Students can view own inventory"
  ON student_inventory FOR SELECT
  USING (student_id = auth.uid());

-- Students can update their own inventory (equip/unequip)
CREATE POLICY "Students can update own inventory"
  ON student_inventory FOR UPDATE
  USING (student_id = auth.uid());

-- Only the purchase function can insert (prevents manual inventory additions)
CREATE POLICY "Inventory items added via purchase function only"
  ON student_inventory FOR INSERT
  WITH CHECK (
    student_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM marketplace_items
      WHERE id = item_id AND is_active = true
    )
  );

-- Admins can view all inventories
CREATE POLICY "Admins can view all inventories"
  ON student_inventory FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add updated_at trigger
CREATE TRIGGER set_student_inventory_updated_at
  BEFORE UPDATE ON student_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to purchase marketplace item with row-level locking (T161)
CREATE OR REPLACE FUNCTION purchase_marketplace_item(
  p_student_id UUID,
  p_item_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_item_price INTEGER;
  v_current_gold INTEGER;
  v_item_name VARCHAR;
  v_already_owned BOOLEAN;
  v_career_id UUID;
  v_item_compatible BOOLEAN;
BEGIN
  -- Use row-level locking to prevent concurrent purchase conflicts (Spec edge case 21)
  -- Lock the student's character record to prevent race conditions
  SELECT gold_balance, career_id INTO v_current_gold, v_career_id
  FROM student_characters
  WHERE student_id = p_student_id
  FOR UPDATE; -- Critical: prevents concurrent Gold modifications

  -- Check if student already owns this item
  SELECT EXISTS (
    SELECT 1 FROM student_inventory
    WHERE student_id = p_student_id AND item_id = p_item_id
  ) INTO v_already_owned;

  IF v_already_owned THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You already own this item'
    );
  END IF;

  -- Get item details and verify it's active
  SELECT price_gold, name INTO v_item_price, v_item_name
  FROM marketplace_items
  WHERE id = p_item_id AND is_active = true;

  IF v_item_price IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Item not found or unavailable'
    );
  END IF;

  -- Check career compatibility
  SELECT is_item_compatible(p_item_id, (
    SELECT slug FROM career_paths WHERE id = v_career_id
  )) INTO v_item_compatible;

  IF NOT v_item_compatible THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This item is not compatible with your career path'
    );
  END IF;

  -- Check if student has enough Gold
  IF v_current_gold < v_item_price THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient Gold',
      'required', v_item_price,
      'available', v_current_gold
    );
  END IF;

  -- Deduct Gold from student balance
  UPDATE student_characters
  SET
    gold_balance = gold_balance - v_item_price,
    updated_at = NOW()
  WHERE student_id = p_student_id;

  -- Add item to student inventory
  INSERT INTO student_inventory (student_id, item_id, gold_spent)
  VALUES (p_student_id, p_item_id, v_item_price);

  -- Log the Gold transaction
  INSERT INTO progression_transactions (
    student_id, transaction_type, amount, balance_after, reason
  ) VALUES (
    p_student_id,
    'gold_spent',
    -v_item_price,
    v_current_gold - v_item_price,
    'Purchased: ' || v_item_name
  );

  -- Return success with updated balance
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Purchase successful',
    'item_name', v_item_name,
    'gold_spent', v_item_price,
    'new_balance', v_current_gold - v_item_price
  );
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE student_inventory IS 'Tracks cosmetic items owned and equipped by students';
COMMENT ON COLUMN student_inventory.is_equipped IS 'Whether this item is currently equipped on the character';
COMMENT ON COLUMN student_inventory.gold_spent IS 'Amount of Gold spent to purchase this item (for transaction history)';
COMMENT ON FUNCTION equip_item IS 'Equips an item for a student, unequipping others in the same category';
COMMENT ON FUNCTION unequip_item IS 'Unequips an item from a student';
COMMENT ON FUNCTION get_equipped_items IS 'Returns all currently equipped items for a student';
COMMENT ON FUNCTION purchase_marketplace_item IS 'Purchases a marketplace item with row-level locking to prevent concurrent conflicts';
