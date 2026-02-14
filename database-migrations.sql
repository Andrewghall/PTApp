-- PT App Feature Expansion - Database Migrations
-- Run this in Supabase SQL Editor to add new tables and columns

-- 1. Messages table for in-app messaging
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Session notes for PT feedback
CREATE TABLE IF NOT EXISTS session_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE UNIQUE NOT NULL,
  pt_notes TEXT NOT NULL,
  performance_rating INTEGER CHECK (performance_rating BETWEEN 1 AND 5),
  next_session_focus TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Waitlist for full sessions
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_id UUID REFERENCES slots(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES client_profiles(id) ON DELETE CASCADE NOT NULL,
  position INTEGER NOT NULL,
  notified BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(slot_id, client_id)
);

-- 4. Extend existing referrals table
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS credited BOOLEAN DEFAULT false;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS credit_amount INTEGER DEFAULT 2500;  -- £25 in pence

-- 5. Add notifications table for slot changes
CREATE TABLE IF NOT EXISTS slot_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_id UUID REFERENCES slots(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('slot_deleted', 'slot_rescheduled', 'slot_updated')),
  old_start_time TIMESTAMP WITH TIME ZONE,
  new_start_time TIMESTAMP WITH TIME ZONE,
  message TEXT,
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Add new fields to client_profiles
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- 7. Add attendance tracking to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS attended BOOLEAN DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS attended_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS no_show BOOLEAN DEFAULT false;

-- 8. Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for new tables (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_messages_updated_at') THEN
        CREATE TRIGGER update_messages_updated_at
        BEFORE UPDATE ON messages
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_session_notes_updated_at') THEN
        CREATE TRIGGER update_session_notes_updated_at
        BEFORE UPDATE ON session_notes
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_waitlist_updated_at') THEN
        CREATE TRIGGER update_waitlist_updated_at
        BEFORE UPDATE ON waitlist
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_slot_notifications_updated_at') THEN
        CREATE TRIGGER update_slot_notifications_updated_at
        BEFORE UPDATE ON slot_notifications
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 9. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(recipient_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_waitlist_slot ON waitlist(slot_id, position);
CREATE INDEX IF NOT EXISTS idx_session_notes_booking ON session_notes(booking_id);
CREATE INDEX IF NOT EXISTS idx_slot_notifications_booking ON slot_notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_slot_notifications_sent ON slot_notifications(sent) WHERE sent = false;
CREATE INDEX IF NOT EXISTS idx_bookings_attended ON bookings(attended) WHERE attended IS NOT NULL;

-- 10. Add Row Level Security (RLS) policies

-- Messages RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages" ON messages
  FOR SELECT USING (
    auth.uid() IN (sender_id, recipient_id)
  );

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
  );

CREATE POLICY "Recipients can update read status" ON messages
  FOR UPDATE USING (
    auth.uid() = recipient_id
  );

-- Session Notes RLS
ALTER TABLE session_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all session notes" ON session_notes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Clients can view their own session notes" ON session_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings
      JOIN client_profiles ON bookings.client_id = client_profiles.id
      WHERE bookings.id = session_notes.booking_id
      AND client_profiles.user_id = auth.uid()
    )
  );

-- Waitlist RLS
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all waitlist entries" ON waitlist
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Clients can view and manage their own waitlist entries" ON waitlist
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM client_profiles
      WHERE client_profiles.id = waitlist.client_id
      AND client_profiles.user_id = auth.uid()
    )
  );

-- Slot Notifications RLS
ALTER TABLE slot_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all notifications" ON slot_notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Clients can view their own notifications" ON slot_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings
      JOIN client_profiles ON bookings.client_id = client_profiles.id
      WHERE bookings.id = slot_notifications.booking_id
      AND client_profiles.user_id = auth.uid()
    )
  );

-- Migration complete
-- Next steps:
-- 1. Run this script in Supabase SQL Editor
-- 2. Verify all tables were created successfully
-- 3. Check that indexes and triggers are in place
-- 4. Proceed to Phase 2: Update supabase.ts with helper functions
