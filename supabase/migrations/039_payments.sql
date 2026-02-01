-- Migration: Create payments table
-- Purpose: Track all payment transactions for class bookings
-- Related to: Phase 13 - Payment Integration (T195)

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  transaction_id VARCHAR(255) NOT NULL UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('stripe', 'vnpay', 'momo', 'zalopay')),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  payment_url TEXT,
  gateway_response JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX idx_payments_transaction_id ON public.payments(transaction_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_created_at ON public.payments(created_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payments_updated_at();

-- Row Level Security policies
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Students can read their own payment records
CREATE POLICY "Students can read own payments"
  ON public.payments
  FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM public.bookings WHERE student_id = auth.uid()
    )
  );

-- Only service role can create payment records
CREATE POLICY "Service role can insert payments"
  ON public.payments
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Only service role can update payment records
CREATE POLICY "Service role can update payments"
  ON public.payments
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- Admins can view all payments
CREATE POLICY "Admins can view all payments"
  ON public.payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Comments
COMMENT ON TABLE public.payments IS 'Stores payment transaction records for class bookings';
COMMENT ON COLUMN public.payments.booking_id IS 'Reference to the booking being paid for';
COMMENT ON COLUMN public.payments.transaction_id IS 'Unique transaction ID from payment gateway';
COMMENT ON COLUMN public.payments.amount IS 'Payment amount (can be negative for refunds)';
COMMENT ON COLUMN public.payments.currency IS 'Currency code (USD, VND, etc.)';
COMMENT ON COLUMN public.payments.payment_method IS 'Payment gateway used (stripe, vnpay, momo, zalopay)';
COMMENT ON COLUMN public.payments.status IS 'Current payment status';
COMMENT ON COLUMN public.payments.payment_url IS 'Redirect URL for completing payment (for redirect-based gateways)';
COMMENT ON COLUMN public.payments.gateway_response IS 'Raw response from payment gateway';
COMMENT ON COLUMN public.payments.metadata IS 'Additional metadata (refund reason, etc.)';
