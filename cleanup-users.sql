-- Clean up orphaned user data so auth users can be deleted
-- Run this in Supabase SQL Editor

-- Delete credit balances linked to client profiles
DELETE FROM credit_balances WHERE client_id IN (
  SELECT id FROM client_profiles
);

-- Delete credit transactions linked to client profiles  
DELETE FROM credit_transactions WHERE client_id IN (
  SELECT id FROM client_profiles
);

-- Delete bookings linked to client profiles
DELETE FROM bookings WHERE client_id IN (
  SELECT id FROM client_profiles
);

-- Delete payments linked to client profiles
DELETE FROM payments WHERE client_id IN (
  SELECT id FROM client_profiles
);

-- Delete workouts linked to client profiles
DELETE FROM workouts WHERE client_id IN (
  SELECT id FROM client_profiles
);

-- Delete client profiles
DELETE FROM client_profiles;

-- Delete profiles
DELETE FROM profiles;

-- Now you can delete the user from Authentication > Users in the dashboard
