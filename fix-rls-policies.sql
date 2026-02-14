-- Fix missing RLS INSERT/UPDATE policies
-- Run this in Supabase SQL Editor

-- Allow users to create their own client profile (needed for signup)
CREATE POLICY "Users can create own client profile" 
  ON client_profiles FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- Allow users to create their own credit balance
CREATE POLICY "Users can create own credit balance" 
  ON credit_balances FOR INSERT 
  WITH CHECK (client_id IN (
    SELECT id FROM client_profiles WHERE user_id = auth.uid()
  ));

-- Allow users to create own credit transactions
CREATE POLICY "Users can create own transactions" 
  ON credit_transactions FOR INSERT 
  WITH CHECK (client_id IN (
    SELECT id FROM client_profiles WHERE user_id = auth.uid()
  ));

-- Allow users to create own payments
CREATE POLICY "Users can create own payments" 
  ON payments FOR INSERT 
  WITH CHECK (client_id IN (
    SELECT id FROM client_profiles WHERE user_id = auth.uid()
  ));

-- Allow users to update own credit balance (for purchases)
CREATE POLICY "Users can update own credit balance" 
  ON credit_balances FOR UPDATE 
  USING (client_id IN (
    SELECT id FROM client_profiles WHERE user_id = auth.uid()
  ));

-- Allow users to update own bookings (for cancellation)
CREATE POLICY "Users can update own bookings" 
  ON bookings FOR UPDATE 
  USING (client_id IN (
    SELECT id FROM client_profiles WHERE user_id = auth.uid()
  ));

-- Allow slot booked_count to be updated by authenticated users
CREATE POLICY "Authenticated users can update slots" 
  ON slots FOR UPDATE 
  USING (auth.role() = 'authenticated');

-- Allow viewing credit packs
CREATE POLICY "Everyone can view credit packs" 
  ON credit_packs FOR SELECT 
  USING (is_active = true);
