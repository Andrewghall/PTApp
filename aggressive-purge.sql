-- AGGRESSIVE DATABASE PURGE - This will wipe EVERYTHING
-- Run this if the previous purge didn't work

-- First, let's see what tables exist and drop them all
DO $$
DECLARE
    table_record RECORD;
BEGIN
    -- Drop all tables in the public schema
    FOR table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(table_record.table_name) || ' CASCADE';
        RAISE NOTICE 'Dropped table: %', table_record.table_name;
    END LOOP;
END $$;

-- Drop all triggers
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT trigger_name, event_object_table
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(trigger_record.trigger_name) || ' ON public.' || quote_ident(trigger_record.event_object_table);
        RAISE NOTICE 'Dropped trigger: %', trigger_record.trigger_name;
    END LOOP;
END $$;

-- Drop all functions
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT routine_name
        FROM information_schema.routines 
        WHERE routine_schema = 'public'
        AND routine_type = 'FUNCTION'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(func_record.routine_name) || ' CASCADE';
        RAISE NOTICE 'Dropped function: %', func_record.routine_name;
    END LOOP;
END $$;

-- Drop all types
DO $$
DECLARE
    type_record RECORD;
BEGIN
    FOR type_record IN 
        SELECT t.typname
        FROM pg_type t 
        JOIN pg_namespace n ON t.typnamespace = n.oid 
        WHERE n.nspname = 'public'
        AND t.typtype = 'e'
    LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(type_record.typname) || ' CASCADE';
        RAISE NOTICE 'Dropped type: %', type_record.typname;
    END LOOP;
END $$;

-- Also drop any triggers on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- One final sweep - drop any remaining common tables
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

-- Drop functions again to be sure
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Drop types again to be sure
DROP TYPE IF EXISTS referral_status CASCADE;
DROP TYPE IF EXISTS exercise_category CASCADE;
DROP TYPE IF EXISTS booking_status CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- Database should now be completely empty
-- Check with: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
