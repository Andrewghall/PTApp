// Script to apply schema and seed data to Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lrysavxxoxiqwfhmvazy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyeXNhdnh4b3hpcXdmaG12YXp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5ODk1ODAsImV4cCI6MjA4NjU2NTU4MH0._zmVUawN8k9REd6ksdInqWy-HTYh6GXQZVvLw_yaAnk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('Checking if schema is applied...');
  
  // Try to query exercises table
  const { data: exercises, error: exErr } = await supabase.from('exercises').select('name').limit(3);
  if (exErr) {
    console.log('❌ exercises table not found:', exErr.message);
    console.log('\n⚠️  You need to run the schema SQL in Supabase SQL Editor.');
    console.log('1. Go to https://supabase.com/dashboard/project/lrysavxxoxiqwfhmvazy/sql');
    console.log('2. Paste the contents of supabase-schema-safe.sql');
    console.log('3. Click "Run"');
    console.log('4. Then re-run this script');
    return false;
  }
  console.log('✅ exercises table exists, found:', exercises.map(e => e.name).join(', '));

  // Check slots
  const { data: slots, error: slErr } = await supabase.from('slots').select('id').limit(1);
  if (slErr) {
    console.log('❌ slots table error:', slErr.message);
    return false;
  }
  console.log(`✅ slots table exists, ${slots.length} slots found`);

  // Check credit_packs
  const { data: packs, error: cpErr } = await supabase.from('credit_packs').select('name, credits, price');
  if (cpErr) {
    console.log('❌ credit_packs error:', cpErr.message);
    return false;
  }
  console.log('✅ credit_packs:', packs?.map(p => `${p.name} (${p.credits} credits, €${(p.price/100).toFixed(2)})`).join(', '));

  // Check profiles
  const { data: profiles, error: prErr } = await supabase.from('profiles').select('id').limit(1);
  if (prErr) {
    console.log('❌ profiles error:', prErr.message);
    return false;
  }
  console.log(`✅ profiles table exists`);

  return true;
}

async function seedSlots() {
  // Check if slots already exist
  const { data: existing } = await supabase.from('slots').select('id').limit(1);
  if (existing && existing.length > 0) {
    console.log('ℹ️  Slots already seeded, skipping');
    return;
  }

  console.log('\nSeeding time slots for the next 8 weeks...');
  
  const slots = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Generate slots for 8 weeks (Mon-Fri)
  for (let week = 0; week < 8; week++) {
    for (let day = 1; day <= 5; day++) { // Mon=1 to Fri=5
      const date = new Date(today);
      // Find next Monday from today, then add weeks and days
      const currentDay = today.getDay(); // 0=Sun, 1=Mon...
      const daysUntilMonday = currentDay === 0 ? 1 : (currentDay === 1 ? 0 : 8 - currentDay);
      date.setDate(today.getDate() + daysUntilMonday + (week * 7) + (day - 1));
      
      // Skip if date is in the past
      if (date < today) continue;
      
      // Morning slot: 7:30 - 9:30
      const morningStart = new Date(date);
      morningStart.setHours(7, 30, 0, 0);
      const morningEnd = new Date(date);
      morningEnd.setHours(9, 30, 0, 0);
      
      // Late morning slot: 9:30 - 11:30
      const lateMorningStart = new Date(date);
      lateMorningStart.setHours(9, 30, 0, 0);
      const lateMorningEnd = new Date(date);
      lateMorningEnd.setHours(11, 30, 0, 0);
      
      slots.push({
        start_time: morningStart.toISOString(),
        end_time: morningEnd.toISOString(),
        capacity: 6,
        booked_count: 0,
        status: 'available',
        location: 'Elevate Gym',
      });
      
      slots.push({
        start_time: lateMorningStart.toISOString(),
        end_time: lateMorningEnd.toISOString(),
        capacity: 6,
        booked_count: 0,
        status: 'available',
        location: 'Elevate Gym',
      });
    }
  }
  
  console.log(`Inserting ${slots.length} slots...`);
  
  // Insert in batches of 50
  for (let i = 0; i < slots.length; i += 50) {
    const batch = slots.slice(i, i + 50);
    const { error } = await supabase.from('slots').insert(batch);
    if (error) {
      console.log(`❌ Error inserting slots batch ${i}:`, error.message);
      return;
    }
  }
  
  console.log(`✅ Seeded ${slots.length} slots successfully`);
}

async function main() {
  const schemaOk = await checkSchema();
  if (!schemaOk) {
    process.exit(1);
  }
  
  await seedSlots();
  
  console.log('\n🎉 Database is ready!');
}

main().catch(console.error);
