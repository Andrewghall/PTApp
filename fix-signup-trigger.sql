-- Fix signup: move client_profiles + credit_balances creation into the trigger
-- This bypasses RLS since the trigger runs as SECURITY DEFINER
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_client_id UUID;
BEGIN
  -- Create profile row
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'client');

  -- Create client_profiles row using metadata from signup
  INSERT INTO public.client_profiles (user_id, first_name, last_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(new.raw_user_meta_data->>'last_name', '')
  )
  RETURNING id INTO new_client_id;

  -- Create credit_balances row with 0 balance
  INSERT INTO public.credit_balances (client_id, balance)
  VALUES (new_client_id, 0);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
