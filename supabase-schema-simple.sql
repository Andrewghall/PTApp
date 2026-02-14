-- Simple database setup - just create tables without cleanup
-- This will work on an empty database

-- Create custom types first
CREATE TYPE user_role AS ENUM ('client', 'admin');
CREATE TYPE transaction_type AS ENUM ('purchase', 'consume', 'refund', 'comp', 'referral');
CREATE TYPE booking_status AS ENUM ('booked', 'attended', 'no_show', 'cancelled');
CREATE TYPE exercise_category AS ENUM ('Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Other');
CREATE TYPE referral_status AS ENUM ('pending', 'completed', 'rewarded');

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  role user_role DEFAULT 'client',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Client Profiles
CREATE TABLE client_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  goals TEXT,
  injury_notes TEXT,
  emergency_contact TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Credit Balances
CREATE TABLE credit_balances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES client_profiles(id) ON DELETE CASCADE,
  balance INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id)
);

-- Credit Transactions
CREATE TABLE credit_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES client_profiles(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  amount INTEGER NOT NULL,
  description TEXT NOT NULL,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Slots (PT sessions)
CREATE TABLE slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  capacity INTEGER DEFAULT 6,
  booked_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'available',
  location TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bookings
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_id UUID REFERENCES slots(id) ON DELETE CASCADE,
  client_id UUID REFERENCES client_profiles(id) ON DELETE CASCADE,
  status booking_status DEFAULT 'booked',
  credits_used INTEGER DEFAULT 1,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exercises
CREATE TABLE exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category exercise_category NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name)
);

-- Programmes
CREATE TABLE programmes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Programme Exercises
CREATE TABLE programme_exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  programme_id UUID REFERENCES programmes(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  prescribed_sets INTEGER NOT NULL,
  prescribed_reps TEXT NOT NULL,
  prescribed_weight INTEGER,
  notes TEXT,
  order_index INTEGER NOT NULL,
  UNIQUE(programme_id, exercise_id)
);

-- Programme Assignments
CREATE TABLE programme_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES client_profiles(id) ON DELETE CASCADE,
  programme_id UUID REFERENCES programmes(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  UNIQUE(client_id, programme_id)
);

-- Workouts
CREATE TABLE workouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES client_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  programme_id UUID REFERENCES programmes(id),
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workout Exercises
CREATE TABLE workout_exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  UNIQUE(workout_id, exercise_id)
);

-- Set Entries
CREATE TABLE set_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_exercise_id UUID REFERENCES workout_exercises(id) ON DELETE CASCADE,
  weight INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  notes TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referrals
CREATE TABLE referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID REFERENCES client_profiles(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES client_profiles(id) ON DELETE SET NULL,
  status referral_status DEFAULT 'pending',
  reward_credits INTEGER DEFAULT 0,
  reward_transaction_id UUID REFERENCES credit_transactions(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit Packs
CREATE TABLE credit_packs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  credits INTEGER NOT NULL,
  price INTEGER NOT NULL, -- in pence
  discount_percent INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES client_profiles(id) ON DELETE CASCADE,
  credit_pack_id UUID REFERENCES credit_packs(id),
  amount INTEGER NOT NULL, -- in pence
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  transaction_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE set_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE programme_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE programme_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Simple RLS Policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own client profile" ON client_profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own client profile" ON client_profiles FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can view own credit balance" ON credit_balances FOR SELECT USING (client_id IN (
  SELECT id FROM client_profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Users can view own transactions" ON credit_transactions FOR SELECT USING (client_id IN (
  SELECT id FROM client_profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Everyone can view available slots" ON slots FOR SELECT USING (status = 'available');

CREATE POLICY "Users can view own bookings" ON bookings FOR SELECT USING (client_id IN (
  SELECT id FROM client_profiles WHERE user_id = auth.uid()
));
CREATE POLICY "Users can create own bookings" ON bookings FOR INSERT WITH CHECK (client_id IN (
  SELECT id FROM client_profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Users can view own workouts" ON workouts FOR SELECT USING (client_id IN (
  SELECT id FROM client_profiles WHERE user_id = auth.uid()
));
CREATE POLICY "Users can manage own workouts" ON workouts FOR ALL USING (client_id IN (
  SELECT id FROM client_profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Everyone can view exercises" ON exercises FOR SELECT USING (true);
CREATE POLICY "Everyone can view programmes" ON programmes FOR SELECT USING (is_active = true);

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'client');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert initial exercises
INSERT INTO exercises (name, category, description) VALUES
('Bench Press', 'Chest', 'Classic chest exercise with barbell'),
('Squat', 'Legs', 'Fundamental lower body compound movement'),
('Deadlift', 'Back', 'Full body posterior chain exercise'),
('Overhead Press', 'Shoulders', 'Shoulder press with barbell'),
('Barbell Row', 'Back', 'Horizontal pulling movement'),
('Pull-ups', 'Back', 'Bodyweight vertical pulling'),
('Dips', 'Chest', 'Bodyweight chest and triceps exercise'),
('Lunges', 'Legs', 'Single leg lower body exercise'),
('Bicep Curls', 'Arms', 'Arm isolation for biceps'),
('Tricep Pushdown', 'Arms', 'Cable triceps isolation'),
('Plank', 'Core', 'Core stability exercise'),
('Crunches', 'Core', 'Abdominal isolation exercise'),
('Leg Press', 'Legs', 'Machine leg exercise'),
('Leg Curl', 'Legs', 'Hamstring isolation'),
('Leg Extension', 'Legs', 'Quadriceps isolation'),
('Lateral Raises', 'Shoulders', 'Shoulder side delt isolation'),
('Front Raises', 'Shoulders', 'Shoulder front delt isolation'),
('Face Pulls', 'Shoulders', 'Rear delt and upper back exercise'),
('Hammer Curls', 'Arms', 'Bicep variation with neutral grip'),
('Skull Crushers', 'Arms', 'Lying triceps extension'),
('Russian Twist', 'Core', 'Rotational core exercise'),
('Leg Raises', 'Core', 'Hanging leg raise for lower abs'),
('Treadmill', 'Cardio', 'Cardio machine running'),
('Cycling', 'Cardio', 'Stationary bike cardio'),
('Rowing', 'Cardio', 'Rowing machine cardio'),
('Elliptical', 'Cardio', 'Elliptical trainer cardio');

-- Insert default credit packs
INSERT INTO credit_packs (name, credits, price, discount_percent, is_active) VALUES
('Single Session', 1, 2500, NULL, true), -- £25.00
('5 Sessions', 5, 12500, NULL, true), -- £125.00
('10 Sessions', 10, 22500, 10, true), -- £225.00 (10% discount)
('20 Sessions', 20, 40000, 20, true); -- £400.00 (20% discount)

-- Create a sample programme
INSERT INTO programmes (name, description, is_active) VALUES
('Beginner Full Body', '3-day full body routine for beginners', true)
RETURNING id;

-- Get the programme ID and add exercises
WITH programme_id AS (
  SELECT id FROM programmes WHERE name = 'Beginner Full Body' LIMIT 1
)
INSERT INTO programme_exercises (programme_id, exercise_id, prescribed_sets, prescribed_reps, order_index)
SELECT 
  p.id,
  e.id,
  3,
  '8-12',
  ROW_NUMBER() OVER (ORDER BY e.name)
FROM programme_id p, exercises e 
WHERE e.name IN ('Bench Press', 'Squat', 'Barbell Row', 'Overhead Press', 'Bicep Curls');
