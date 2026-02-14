-- Forceful type removal using system catalogs
-- This will aggressively remove any remaining custom types

-- Connect to pg_catalog and remove types directly
DO $$
DECLARE
    type_record RECORD;
BEGIN
    -- Drop all custom enum types in public schema
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
    
    -- Also try to drop specific types we know about
    BEGIN
        DROP TYPE IF EXISTS public.user_role CASCADE;
        RAISE NOTICE 'Dropped user_role type';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'user_role type already gone or could not drop';
    END;
    
    BEGIN
        DROP TYPE IF EXISTS public.transaction_type CASCADE;
        RAISE NOTICE 'Dropped transaction_type type';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'transaction_type type already gone or could not drop';
    END;
    
    BEGIN
        DROP TYPE IF EXISTS public.booking_status CASCADE;
        RAISE NOTICE 'Dropped booking_status type';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'booking_status type already gone or could not drop';
    END;
    
    BEGIN
        DROP TYPE IF EXISTS public.exercise_category CASCADE;
        RAISE NOTICE 'Dropped exercise_category type';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'exercise_category type already gone or could not drop';
    END;
    
    BEGIN
        DROP TYPE IF EXISTS public.referral_status CASCADE;
        RAISE NOTICE 'Dropped referral_status type';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'referral_status type already gone or could not drop';
    END;
END $$;

-- Also clean up any remaining functions or triggers
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Show what types are left
SELECT typname 
FROM pg_type t 
JOIN pg_namespace n ON t.typnamespace = n.oid 
WHERE n.nspname = 'public' 
AND t.typtype = 'e';
