-- Comprehensive Seed Data for PT Business App
-- Run this AFTER the main schema is created

-- ============================================
-- 1. EXERCISES (Master List)
-- ============================================
INSERT INTO exercises (name, category, description) VALUES
-- Compound Movements
('Barbell Squat', 'legs', 'Traditional back squat with barbell'),
('Front Squat', 'legs', 'Squat with barbell in front rack position'),
('Box Squat', 'legs', 'Squat to a box or bench'),
('Deadlift', 'back', 'Conventional deadlift from floor'),
('Romanian Deadlift', 'back', 'Hip hinge movement with slight knee bend'),
('Bench Press', 'chest', 'Barbell bench press'),
('Incline Bench Press', 'chest', 'Bench press on incline'),
('Overhead Press', 'shoulders', 'Standing or seated overhead barbell press'),

-- Upper Body
('Pull-ups', 'back', 'Bodyweight pull-ups'),
('Barbell Row', 'back', 'Bent over barbell row'),
('Dumbbell Row', 'back', 'Single arm dumbbell row'),
('Lat Pulldown', 'back', 'Cable lat pulldown'),
('Dumbbell Bench Press', 'chest', 'Dumbbell variation of bench press'),
('Chest Fly', 'chest', 'Cable or dumbbell chest fly'),
('Lateral Raise', 'shoulders', 'Dumbbell lateral raise'),
('Face Pulls', 'shoulders', 'Cable face pulls'),

-- Lower Body
('Leg Press', 'legs', 'Machine leg press'),
('Lunges', 'legs', 'Walking or stationary lunges'),
('Bulgarian Split Squat', 'legs', 'Single leg squat with rear foot elevated'),
('Leg Curl', 'legs', 'Hamstring curl machine'),
('Leg Extension', 'legs', 'Quad extension machine'),
('Calf Raise', 'legs', 'Standing or seated calf raises'),

-- Core & Accessories
('Plank', 'core', 'Front plank hold'),
('Russian Twist', 'core', 'Seated twist with weight'),
('Bicep Curl', 'arms', 'Barbell or dumbbell bicep curl'),
('Tricep Extension', 'arms', 'Overhead or cable tricep extension'),
('Hammer Curl', 'arms', 'Dumbbell hammer grip curl');

-- ============================================
-- 2. CREDIT PACKS (Pricing Tiers)
-- ============================================
-- First delete any existing packs to avoid duplicates
DELETE FROM credit_packs;

INSERT INTO credit_packs (credits, price, discount_percent, is_active) VALUES
(1, 2500, 0, true),             -- Single session - £25.00 stored as 2500 pence
(5, 12000, 4, true),            -- 5 pack - £120.00 stored as 12000 pence (4% discount, £24/session)
(10, 22500, 10, true),          -- 10 pack - £225.00 stored as 22500 pence (10% discount, £22.50/session)
(20, 40000, 20, true);          -- 20 pack - £400.00 stored as 40000 pence (20% discount, £20/session)

-- ============================================
-- 3. PT SESSIONS/SLOTS (Next 4 weeks)
-- ============================================
-- Function to create slots programmatically
DO $$
DECLARE
  start_date DATE := CURRENT_DATE;
  slot_date DATE;
  day_of_week INT;
  week_num INT;
BEGIN
  -- Create slots for next 4 weeks (Monday-Friday only)
  FOR week_num IN 0..3 LOOP
    FOR day_num IN 0..6 LOOP
      slot_date := start_date + (week_num * 7 + day_num);
      day_of_week := EXTRACT(DOW FROM slot_date);

      -- Only create slots for Mon-Fri (1-5)
      IF day_of_week BETWEEN 1 AND 5 THEN
        -- Morning Session: 7:30-9:30
        INSERT INTO slots (start_time, end_time, capacity, booked_count, status, location)
        VALUES (
          slot_date + TIME '07:30',
          slot_date + TIME '09:30',
          6,
          0,
          'available',
          'Elevate Gym'
        );

        -- Late Morning Session: 9:30-11:30
        INSERT INTO slots (start_time, end_time, capacity, booked_count, status, location)
        VALUES (
          slot_date + TIME '09:30',
          slot_date + TIME '11:30',
          6,
          0,
          'available',
          'Elevate Gym'
        );
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- ============================================
-- 4. SAMPLE PROGRAMMES
-- ============================================
INSERT INTO programmes (name, description, created_by) VALUES
('Beginner Strength 3x/week', 'Full body strength program for beginners, 3 days per week', (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),
('5x5 Intermediate', 'Classic 5x5 strength building program', (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),
('Hypertrophy Upper/Lower', 'Muscle building split routine', (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1));

-- Beginner Programme Exercises
INSERT INTO programme_exercises (programme_id, exercise_id, sets, reps, order_index, notes)
SELECT
  (SELECT id FROM programmes WHERE name = 'Beginner Strength 3x/week'),
  e.id,
  3,
  10,
  ROW_NUMBER() OVER (),
  'Focus on form'
FROM exercises e
WHERE e.name IN ('Barbell Squat', 'Bench Press', 'Barbell Row', 'Overhead Press', 'Deadlift');

-- 5x5 Programme Exercises
INSERT INTO programme_exercises (programme_id, exercise_id, sets, reps, order_index, notes)
SELECT
  (SELECT id FROM programmes WHERE name = '5x5 Intermediate'),
  e.id,
  5,
  5,
  ROW_NUMBER() OVER (),
  'Progressive overload each session'
FROM exercises e
WHERE e.name IN ('Barbell Squat', 'Bench Press', 'Barbell Row', 'Overhead Press', 'Deadlift');

-- ============================================
-- 5. CONFIRMATION MESSAGE
-- ============================================
DO $$
DECLARE
  exercise_count INT;
  slot_count INT;
  pack_count INT;
  programme_count INT;
BEGIN
  SELECT COUNT(*) INTO exercise_count FROM exercises;
  SELECT COUNT(*) INTO slot_count FROM slots;
  SELECT COUNT(*) INTO pack_count FROM credit_packs;
  SELECT COUNT(*) INTO programme_count FROM programmes;

  RAISE NOTICE '====================================';
  RAISE NOTICE 'Seed Data Installation Complete!';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Exercises created: %', exercise_count;
  RAISE NOTICE 'Slots created: %', slot_count;
  RAISE NOTICE 'Credit packs created: %', pack_count;
  RAISE NOTICE 'Programmes created: %', programme_count;
  RAISE NOTICE '====================================';
END $$;

-- ============================================
-- NOTES FOR TESTING:
-- ============================================
-- 1. Create a test client account through the app signup
-- 2. Manually set role to 'admin' in profiles table for admin access
-- 3. Use admin portal to award credits to test clients
-- 4. Test booking system with real slots
-- 5. Log workouts and view analytics
