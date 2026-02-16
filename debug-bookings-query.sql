-- Debug query to check bookings data
-- Run this in Supabase SQL Editor to verify your bookings exist

-- 1. Check total bookings count
SELECT COUNT(*) as total_bookings FROM bookings;

-- 2. Check bookings with status 'booked'
SELECT COUNT(*) as booked_count FROM bookings WHERE status = 'booked';

-- 3. Show all bookings with full details
SELECT
  b.id,
  b.client_id,
  b.slot_id,
  b.status,
  b.created_at,
  s.start_time,
  s.end_time,
  s.location,
  cp.first_name,
  cp.last_name
FROM bookings b
LEFT JOIN slots s ON b.slot_id = s.id
LEFT JOIN client_profiles cp ON b.client_id = cp.id
WHERE b.status = 'booked'
ORDER BY s.start_time ASC;

-- 4. Check if there are any future bookings
SELECT
  b.id,
  b.client_id,
  b.status,
  s.start_time,
  s.end_time,
  cp.first_name,
  cp.last_name
FROM bookings b
LEFT JOIN slots s ON b.slot_id = s.id
LEFT JOIN client_profiles cp ON b.client_id = cp.id
WHERE b.status = 'booked'
  AND s.start_time > NOW()
ORDER BY s.start_time ASC;

-- 5. Check client_profiles to see what client_ids exist
SELECT id, first_name, last_name FROM client_profiles;

-- 6. Check for any RLS policy issues (this shows which policies exist)
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('bookings', 'slots', 'client_profiles');
