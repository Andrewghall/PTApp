-- Seed time slots for the next 8 weeks (Mon-Fri, 2 sessions per day)
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/lrysavxxoxiqwfhmvazy/sql

-- Clear existing data
DELETE FROM bookings;
DELETE FROM slots;

-- Generate slots using generate_series
-- Morning slots: 7:30 - 9:30
INSERT INTO slots (start_time, end_time, capacity, booked_count, status, location)
SELECT 
  (d + interval '7 hours 30 minutes') AT TIME ZONE 'Europe/Lisbon',
  (d + interval '9 hours 30 minutes') AT TIME ZONE 'Europe/Lisbon',
  6, 0, 'available', 'Elevate Gym'
FROM generate_series(
  CURRENT_DATE,
  CURRENT_DATE + interval '8 weeks',
  interval '1 day'
) AS d
WHERE EXTRACT(DOW FROM d) BETWEEN 1 AND 5; -- Mon=1 to Fri=5

-- Late morning slots: 9:30 - 11:30
INSERT INTO slots (start_time, end_time, capacity, booked_count, status, location)
SELECT 
  (d + interval '9 hours 30 minutes') AT TIME ZONE 'Europe/Lisbon',
  (d + interval '11 hours 30 minutes') AT TIME ZONE 'Europe/Lisbon',
  6, 0, 'available', 'Elevate Gym'
FROM generate_series(
  CURRENT_DATE,
  CURRENT_DATE + interval '8 weeks',
  interval '1 day'
) AS d
WHERE EXTRACT(DOW FROM d) BETWEEN 1 AND 5;

-- Verify
SELECT COUNT(*) as total_slots FROM slots;
SELECT start_time, end_time, capacity, status, location FROM slots ORDER BY start_time LIMIT 10;
