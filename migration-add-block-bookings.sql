-- Migration: Add block booking / recurring booking functionality
-- This allows PT to pre-book recurring sessions for regular clients

-- Create block_bookings table to store recurring booking patterns
CREATE TABLE IF NOT EXISTS block_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES client_profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  day_of_week INTEGER NOT NULL, -- 0 = Sunday, 1 = Monday, etc.
  time_slot TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT DEFAULT 'active', -- active, paused, completed, cancelled
  created_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_block_bookings_client_id ON block_bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_block_bookings_status ON block_bookings(status);

-- Add is_block_booking flag to bookings table to distinguish auto-generated bookings
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS block_booking_id UUID REFERENCES block_bookings(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookings_block_booking_id ON bookings(block_booking_id);

-- Function to generate bookings from a block booking pattern
CREATE OR REPLACE FUNCTION generate_block_bookings(block_booking_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  block_record RECORD;
  current_date DATE;
  session_start TIMESTAMP WITH TIME ZONE;
  session_end TIMESTAMP WITH TIME ZONE;
  slot_uuid UUID;
  bookings_created INTEGER := 0;
BEGIN
  -- Get the block booking record
  SELECT * INTO block_record FROM block_bookings WHERE id = block_booking_uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Block booking not found';
  END IF;

  -- Loop through dates from start to end
  current_date := block_record.start_date;

  WHILE current_date <= block_record.end_date LOOP
    -- Check if current_date matches the day of week
    IF EXTRACT(DOW FROM current_date) = block_record.day_of_week THEN
      -- Create timestamp for this session
      session_start := current_date + block_record.time_slot;
      session_end := session_start + (block_record.duration_minutes || ' minutes')::INTERVAL;

      -- Create or find the slot
      INSERT INTO slots (start_time, end_time, capacity, booked_count, status)
      VALUES (session_start, session_end, 6, 0, 'available')
      ON CONFLICT DO NOTHING
      RETURNING id INTO slot_uuid;

      -- If slot already exists, get its ID
      IF slot_uuid IS NULL THEN
        SELECT id INTO slot_uuid FROM slots
        WHERE start_time = session_start AND end_time = session_end
        LIMIT 1;
      END IF;

      -- Create booking for this slot
      INSERT INTO bookings (slot_id, client_id, status, block_booking_id)
      VALUES (slot_uuid, block_record.client_id, 'booked', block_booking_uuid)
      ON CONFLICT DO NOTHING;

      -- Update slot booked count
      UPDATE slots
      SET booked_count = booked_count + 1
      WHERE id = slot_uuid;

      bookings_created := bookings_created + 1;
    END IF;

    -- Move to next day
    current_date := current_date + INTERVAL '1 day';
  END LOOP;

  RETURN bookings_created;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate bookings when a block booking is created
CREATE OR REPLACE FUNCTION trigger_generate_block_bookings()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    PERFORM generate_block_bookings(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_generate_block_bookings
AFTER INSERT ON block_bookings
FOR EACH ROW
EXECUTE FUNCTION trigger_generate_block_bookings();
