-- Migration: 053_gem_purchase_system.sql
-- Description: Add gem purchase system — students buy gems with real money,
--              then use gems to pay for classes (gems-only booking flow).
-- Date: 2024-02-21

-- ============================================================
-- 1. Extend gem_transaction_type enum with purchase types
-- ============================================================
ALTER TYPE gem_transaction_type ADD VALUE IF NOT EXISTS 'gem_purchase';
ALTER TYPE gem_transaction_type ADD VALUE IF NOT EXISTS 'gem_purchase_refund';
ALTER TYPE gem_transaction_type ADD VALUE IF NOT EXISTS 'booking_payment';   -- full gem payment for a class

-- Update the positive/negative constraint to include new types
-- (PostgreSQL doesn't allow modifying CHECK constraints directly, so drop + re-add)
ALTER TABLE gem_transactions DROP CONSTRAINT IF EXISTS positive_earned;

ALTER TABLE gem_transactions ADD CONSTRAINT positive_earned CHECK (
  (amount > 0 AND transaction_type IN (
    'first_booking_bonus',
    'class_completion',
    'referral_bonus',
    'daily_login',
    'quiz_completion',
    'homework_submission',
    'admin_grant',
    'gem_purchase',
    'gem_purchase_refund'
  )) OR (amount < 0 AND transaction_type IN (
    'booking_discount',
    'booking_payment',
    'admin_deduction'
  ))
);

-- ============================================================
-- 2. Gem packages table — defines what students can purchase
-- ============================================================
CREATE TABLE IF NOT EXISTS gem_packages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  gems        INTEGER      NOT NULL CHECK (gems > 0),
  price_vnd   INTEGER      NOT NULL CHECK (price_vnd > 0),   -- price in VND
  price_usd   DECIMAL(10,2) NOT NULL CHECK (price_usd > 0),  -- price in USD
  bonus_gems  INTEGER      NOT NULL DEFAULT 0 CHECK (bonus_gems >= 0),  -- bonus on top
  is_popular  BOOLEAN      NOT NULL DEFAULT FALSE,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  sort_order  INTEGER      NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Seed with default packages
INSERT INTO gem_packages (name, gems, price_vnd, price_usd, bonus_gems, is_popular, sort_order) VALUES
  ('Starter',   100,   25000,  1.00,   0,  FALSE, 1),
  ('Basic',     500,  115000,  4.99,   0,  FALSE, 2),
  ('Popular',  1000,  229000,  9.99,  50,  TRUE,  3),
  ('Value',    2500,  549000, 24.99, 250,  FALSE, 4),
  ('Pro',      5000, 1079000, 49.99, 750,  FALSE, 5),
  ('Ultimate', 10000,1999000, 89.99,2000,  FALSE, 6)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. Gem purchases table — tracks each real-money gem purchase
-- ============================================================
CREATE TABLE IF NOT EXISTS gem_purchases (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id        UUID        REFERENCES gem_packages(id) ON DELETE SET NULL,

  -- What was purchased
  gems_amount       INTEGER     NOT NULL CHECK (gems_amount > 0),
  bonus_gems        INTEGER     NOT NULL DEFAULT 0 CHECK (bonus_gems >= 0),
  total_gems        INTEGER     GENERATED ALWAYS AS (gems_amount + bonus_gems) STORED,

  -- Payment details
  payment_method    VARCHAR(50) NOT NULL CHECK (payment_method IN ('stripe','vnpay','momo','zalopay')),
  payment_status    VARCHAR(50) NOT NULL DEFAULT 'pending'
                    CHECK (payment_status IN ('pending','processing','completed','failed','refunded')),
  payment_amount    DECIMAL(10,2) NOT NULL CHECK (payment_amount > 0),
  payment_currency  VARCHAR(3)  NOT NULL DEFAULT 'VND',
  payment_intent_id VARCHAR(255),
  payment_url       TEXT,
  gateway_response  JSONB,

  -- Idempotency
  idempotency_key   VARCHAR(255) UNIQUE,

  -- Timestamps
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ
);

CREATE INDEX idx_gem_purchases_user      ON gem_purchases(user_id);
CREATE INDEX idx_gem_purchases_status    ON gem_purchases(payment_status);
CREATE INDEX idx_gem_purchases_created   ON gem_purchases(created_at DESC);
CREATE INDEX idx_gem_purchases_idempotent ON gem_purchases(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TRIGGER update_gem_purchases_updated_at
  BEFORE UPDATE ON gem_purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. Relax bookings constraints for gems-only payment
--
--    OLD: final_price >= 5.00 (blocked gem-only bookings)
--    NEW: final_price >= 0    (gems can cover 100% of price)
--         payment_method column to distinguish gem vs real-money
-- ============================================================

-- Add payment_method to bookings (gems | stripe | vnpay | momo | zalopay)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50)
  NOT NULL DEFAULT 'gems'
  CHECK (payment_method IN ('gems','stripe','vnpay','momo','zalopay'));

-- Drop the $5 floor constraint — gems can pay full price
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS valid_minimum_price;
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS valid_final_price;

-- Replace with a looser constraint: final_price >= 0
ALTER TABLE bookings ADD CONSTRAINT valid_final_price_v2
  CHECK (final_price >= 0);

-- Drop the $5 floor check on the column itself
ALTER TABLE bookings ALTER COLUMN final_price DROP NOT NULL;
ALTER TABLE bookings ALTER COLUMN final_price SET NOT NULL;
-- Re-add without the inline check (column constraint was >= 5.00 via table constraint above)

-- Gems discount constraint: when paying with gems, full price can be covered
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS valid_discount_percentage;
-- New constraint: gems discount ≤ original_price (can pay up to 100% with gems)
ALTER TABLE bookings ADD CONSTRAINT valid_discount_percentage_v2
  CHECK (gems_discount_amount <= original_price);

-- gems_discount_amount = gems_used / 100 (keeping existing rate: 100 gems = 1 USD)
-- Note: The valid_gems_discount CHECK stays the same

-- ============================================================
-- 5. RLS policies for new tables
-- ============================================================

ALTER TABLE gem_packages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE gem_purchases ENABLE ROW LEVEL SECURITY;

-- gem_packages: anyone can read active packages
CREATE POLICY "gem_packages_read_all"
  ON gem_packages FOR SELECT
  USING (is_active = TRUE);

-- gem_packages: admin can manage
CREATE POLICY "gem_packages_admin_all"
  ON gem_packages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- gem_purchases: users see own purchases
CREATE POLICY "gem_purchases_own_select"
  ON gem_purchases FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "gem_purchases_own_insert"
  ON gem_purchases FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- System/admin can update (for webhook processing)
CREATE POLICY "gem_purchases_admin_update"
  ON gem_purchases FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

COMMENT ON TABLE gem_packages  IS 'Purchasable gem bundles with real money';
COMMENT ON TABLE gem_purchases IS 'Records of student gem purchase transactions';
COMMENT ON COLUMN gem_purchases.total_gems IS 'gems_amount + bonus_gems (computed)';
COMMENT ON COLUMN bookings.payment_method IS 'How the booking was paid: gems (default) or real money provider';
