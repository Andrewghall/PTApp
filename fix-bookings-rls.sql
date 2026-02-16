-- Fix RLS policies for bookings table to allow clients to read their own bookings

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own bookings" ON bookings;
DROP POLICY IF EXISTS "Clients can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Allow read own bookings" ON bookings;

-- Create a comprehensive SELECT policy for bookings
CREATE POLICY "Clients can read their own bookings"
ON bookings
FOR SELECT
USING (
  auth.uid() IN (
    SELECT profiles.id
    FROM profiles
    JOIN client_profiles ON profiles.id = client_profiles.profiles_id
    WHERE client_profiles.id = bookings.client_id
  )
  OR
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);

-- Ensure RLS is enabled
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Also check slots table policies
DROP POLICY IF EXISTS "Allow read slots" ON slots;
DROP POLICY IF EXISTS "Users can view slots" ON slots;

CREATE POLICY "Anyone authenticated can read slots"
ON slots
FOR SELECT
TO authenticated
USING (true);

ALTER TABLE slots ENABLE ROW LEVEL SECURITY;

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('bookings', 'slots')
ORDER BY tablename, policyname;
