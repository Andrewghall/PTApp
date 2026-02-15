-- Migration: Create default admin account
-- This creates a default admin user for initial login
--
-- Default Admin Credentials:
-- Email: admin@ptapp.com
-- Password: PTAdmin2024!
--
-- IMPORTANT: Change these credentials after first login!

-- Note: This assumes you're using Supabase Auth
-- You'll need to create the user through Supabase Auth first, then run this migration

-- Step 1: Create the auth user in Supabase Dashboard:
-- Go to Authentication > Users > Add User
-- Email: admin@ptapp.com
-- Password: PTAdmin2024!
-- Auto-confirm: Yes

-- Step 2: After creating the auth user, run this SQL to set up the profile:

-- Update the profile to admin role (find by email)
UPDATE profiles
SET role = 'admin'
WHERE email = 'admin@ptapp.com';

-- If the profile doesn't exist yet, you may need to create it manually:
-- Replace 'USER_ID_FROM_AUTH' with the actual user ID from the auth.users table

-- INSERT INTO profiles (user_id, email, role)
-- SELECT id, email, 'admin'
-- FROM auth.users
-- WHERE email = 'admin@ptapp.com'
-- ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- Verify the admin user was created:
SELECT p.id, p.email, p.role, p.created_at
FROM profiles p
WHERE p.email = 'admin@ptapp.com';
