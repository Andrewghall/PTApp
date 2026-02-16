-- Migration: Add profile image support
-- Adds column to store profile image URLs from Supabase Storage

-- Add profile_image_url column to client_profiles table
ALTER TABLE client_profiles
ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN client_profiles.profile_image_url IS 'URL to profile image stored in Supabase Storage';
