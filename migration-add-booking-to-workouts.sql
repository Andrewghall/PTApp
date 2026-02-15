-- Migration: Link workouts to bookings
-- This allows workouts to be associated with PT session appointments

-- Add booking_id column to workouts table
ALTER TABLE workouts
ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_workouts_booking_id ON workouts(booking_id);

-- Optional: Try to auto-link existing workouts to bookings by matching dates
-- This will link workouts to bookings where the workout date matches the booking slot date
UPDATE workouts w
SET booking_id = b.id
FROM bookings b
INNER JOIN slots s ON b.slot_id = s.id
WHERE w.booking_id IS NULL
  AND w.client_id = b.client_id
  AND w.date = DATE(s.start_time)
  AND b.status = 'booked';
