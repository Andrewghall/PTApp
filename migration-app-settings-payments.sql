-- Migration: App Settings table + Payments Stripe columns
-- Run this in Supabase SQL Editor

-- 1. Create app_settings table
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- 2. Insert default settings
INSERT INTO app_settings (key, value, description) VALUES
  ('low_credit_threshold', '2', 'Credit balance at or below which users see a buy-more prompt'),
  ('cancellation_window_hours', '48', 'Hours before session start when cancellation forfeits credit'),
  ('stripe_payment_count', '0', 'Running count of completed payments for payout alternation')
ON CONFLICT (key) DO NOTHING;

-- 3. Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies
CREATE POLICY "Anyone can read settings" ON app_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can update settings" ON app_settings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert settings" ON app_settings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 5. Add Stripe columns to payments table
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- 6. Index for idempotency checks
CREATE INDEX IF NOT EXISTS idx_payments_stripe_session
  ON payments (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;
