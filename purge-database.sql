-- Complete database purge - removes all data but keeps the database
-- This will delete ALL existing tables, data, and start fresh

-- Disable RLS first so we can drop everything
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS client_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS credit_balances DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS credit_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS slots DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workouts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workout_exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS set_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS programmes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS programme_exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS programme_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS referrals DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS credit_packs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments DISABLE ROW LEVEL SECURITY;

-- Drop all triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop all tables in dependency order
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS credit_packs CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS set_entries CASCADE;
DROP TABLE IF EXISTS workout_exercises CASCADE;
DROP TABLE IF EXISTS workouts CASCADE;
DROP TABLE IF EXISTS programme_assignments CASCADE;
DROP TABLE IF EXISTS programme_exercises CASCADE;
DROP TABLE IF EXISTS programmes CASCADE;
DROP TABLE IF EXISTS exercises CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS slots CASCADE;
DROP TABLE IF EXISTS credit_transactions CASCADE;
DROP TABLE IF EXISTS credit_balances CASCADE;
DROP TABLE IF EXISTS client_profiles CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Drop all custom types
DROP TYPE IF EXISTS referral_status CASCADE;
DROP TYPE IF EXISTS exercise_category CASCADE;
DROP TYPE IF EXISTS booking_status CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- Database is now completely purged and ready for fresh setup
-- You can now run the simple schema to recreate everything
