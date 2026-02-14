-- Targeted purge for remaining types
-- This will clean up any types that survived the aggressive purge

-- Drop all custom types that might still exist
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS booking_status CASCADE;
DROP TYPE IF EXISTS exercise_category CASCADE;
DROP TYPE IF EXISTS referral_status CASCADE;

-- Also check for any remaining triggers on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop any remaining functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Final check for any remaining tables
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS client_profiles CASCADE;
DROP TABLE IF EXISTS credit_balances CASCADE;
DROP TABLE IF EXISTS credit_transactions CASCADE;
DROP TABLE IF EXISTS slots CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS workouts CASCADE;
DROP TABLE IF EXISTS workout_exercises CASCADE;
DROP TABLE IF EXISTS set_entries CASCADE;
DROP TABLE IF EXISTS programmes CASCADE;
DROP TABLE IF EXISTS programme_exercises CASCADE;
DROP TABLE IF EXISTS programme_assignments CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS credit_packs CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS exercises CASCADE;

-- Database should now be completely clean
-- You can now run the simple schema
