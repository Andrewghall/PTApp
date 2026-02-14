-- Complete final cleanup - tables AND types
-- This will get everything that's still hanging around

-- First, disable RLS on any existing tables
DO $$
BEGIN
    EXECUTE 'ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE IF EXISTS client_profiles DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE IF EXISTS credit_balances DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE IF EXISTS credit_transactions DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE IF EXISTS slots DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE IF EXISTS bookings DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE IF EXISTS workouts DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE IF EXISTS workout_exercises DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE IF EXISTS set_entries DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE IF EXISTS programmes DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE IF EXISTS programme_exercises DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE IF EXISTS programme_assignments DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE IF EXISTS referrals DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE IF EXISTS credit_packs DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE IF EXISTS payments DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE IF EXISTS exercises DISABLE ROW LEVEL SECURITY';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Some RLS alterations failed, continuing...';
END $$;

-- Drop all tables using system catalog
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    LOOP
        BEGIN
            EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(table_record.table_name) || ' CASCADE';
            RAISE NOTICE 'Dropped table: %', table_record.table_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not drop table %: %', table_record.table_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- Drop all types using system catalog
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
        BEGIN
            EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(type_record.typname) || ' CASCADE';
            RAISE NOTICE 'Dropped type: %', type_record.typname;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not drop type %: %', type_record.typname, SQLERRM;
        END;
    END LOOP;
END $$;

-- Manual cleanup of specific objects
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Final manual table drops
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

-- Final manual type drops
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS booking_status CASCADE;
DROP TYPE IF EXISTS exercise_category CASCADE;
DROP TYPE IF EXISTS referral_status CASCADE;

-- Show what's left
SELECT 'Tables remaining:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';

SELECT 'Types remaining:' as info;
SELECT typname 
FROM pg_type t 
JOIN pg_namespace n ON t.typnamespace = n.oid 
WHERE n.nspname = 'public' 
AND t.typtype = 'e';
