import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Auth helpers ──────────────────────────────────────────
export const auth = {
  signUp: async (email: string, password: string, firstName: string, lastName: string) => {
    // Create auth user with metadata — the DB trigger (SECURITY DEFINER)
    // handles creating profiles, client_profiles, and credit_balances rows
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName },
      },
    });
    return { data, error };
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    return { session, error };
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// ── Database helpers ──────────────────────────────────────
export const db = {
  // ── Client Profile ──
  getClientProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('client_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    return { data, error };
  },

  updateClientProfile: async (profileId: string, updates: any) => {
    const { data, error } = await supabase
      .from('client_profiles')
      .update(updates)
      .eq('id', profileId)
      .select()
      .single();
    return { data, error };
  },

  // ── Credits ──
  getCreditBalance: async (clientId: string) => {
    const { data, error } = await supabase
      .from('credit_balances')
      .select('balance')
      .eq('client_id', clientId)
      .single();
    return { data, error };
  },

  addCredits: async (clientId: string, amount: number, description: string) => {
    // Get current balance
    const { data: bal } = await supabase
      .from('credit_balances')
      .select('balance')
      .eq('client_id', clientId)
      .single();
    const current = bal?.balance ?? 0;
    // Update balance
    const { error: upErr } = await supabase
      .from('credit_balances')
      .update({ balance: current + amount })
      .eq('client_id', clientId);
    if (upErr) return { error: upErr };
    // Record transaction
    const { error: txErr } = await supabase
      .from('credit_transactions')
      .insert([{ client_id: clientId, type: 'purchase', amount, description }]);
    return { error: txErr };
  },

  deductCredit: async (clientId: string, description: string) => {
    const { data: bal } = await supabase
      .from('credit_balances')
      .select('balance')
      .eq('client_id', clientId)
      .single();
    const current = bal?.balance ?? 0;
    if (current <= 0) return { error: { message: 'No credits remaining' } };
    const { error: upErr } = await supabase
      .from('credit_balances')
      .update({ balance: current - 1 })
      .eq('client_id', clientId);
    if (upErr) return { error: upErr };
    const { error: txErr } = await supabase
      .from('credit_transactions')
      .insert([{ client_id: clientId, type: 'consume', amount: -1, description }]);
    return { error: txErr };
  },

  refundCredit: async (clientId: string, description: string) => {
    const { data: bal } = await supabase
      .from('credit_balances')
      .select('balance')
      .eq('client_id', clientId)
      .single();
    const current = bal?.balance ?? 0;
    const { error: upErr } = await supabase
      .from('credit_balances')
      .update({ balance: current + 1 })
      .eq('client_id', clientId);
    if (upErr) return { error: upErr };
    const { error: txErr } = await supabase
      .from('credit_transactions')
      .insert([{ client_id: clientId, type: 'refund', amount: 1, description }]);
    return { error: txErr };
  },

  getCreditTransactions: async (clientId: string, limit = 50) => {
    const { data, error } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return { data, error };
  },

  // ── Slots ──
  getSlots: async (startDate: string, endDate: string) => {
    const { data, error } = await supabase
      .from('slots')
      .select('*')
      .gte('start_time', startDate)
      .lte('start_time', endDate)
      .eq('status', 'available')
      .order('start_time');
    return { data, error };
  },

  // ── Bookings ──
  createBooking: async (slotId: string, clientId: string) => {
    // Insert booking
    const { data, error } = await supabase
      .from('bookings')
      .insert([{ slot_id: slotId, client_id: clientId, status: 'booked', credits_used: 1 }])
      .select()
      .single();
    if (error) return { data, error };
    // Increment booked_count on slot
    const { data: slot } = await supabase.from('slots').select('booked_count').eq('id', slotId).single();
    await supabase.from('slots').update({ booked_count: (slot?.booked_count ?? 0) + 1 }).eq('id', slotId);
    return { data, error: null };
  },

  cancelBooking: async (bookingId: string, slotId: string) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', bookingId);
    if (error) return { error };
    // Decrement booked_count
    const { data: slot } = await supabase.from('slots').select('booked_count').eq('id', slotId).single();
    await supabase.from('slots').update({ booked_count: Math.max(0, (slot?.booked_count ?? 1) - 1) }).eq('id', slotId);
    return { error: null };
  },

  getClientBookings: async (clientId: string, status?: string) => {
    let query = supabase
      .from('bookings')
      .select(`*, slots (id, start_time, end_time, location, capacity, booked_count)`)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    return { data, error };
  },

  // ── Exercises ──
  getExercises: async () => {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .order('category, name');
    return { data, error };
  },

  // ── Workouts ──
  createWorkout: async (clientId: string, date: string, programmeId?: string) => {
    const { data, error } = await supabase
      .from('workouts')
      .insert([{ client_id: clientId, date, programme_id: programmeId || null }])
      .select()
      .single();
    return { data, error };
  },

  addWorkoutExercise: async (workoutId: string, exerciseId: string, orderIndex: number) => {
    const { data, error } = await supabase
      .from('workout_exercises')
      .insert([{ workout_id: workoutId, exercise_id: exerciseId, order_index: orderIndex }])
      .select()
      .single();
    return { data, error };
  },

  addSetEntry: async (workoutExerciseId: string, weight: number, reps: number, notes?: string) => {
    const { data, error } = await supabase
      .from('set_entries')
      .insert([{ workout_exercise_id: workoutExerciseId, weight, reps, notes }])
      .select()
      .single();
    return { data, error };
  },

  getClientWorkouts: async (clientId: string, limit = 20) => {
    const { data, error } = await supabase
      .from('workouts')
      .select(`
        *,
        workout_exercises (
          *,
          exercises ( id, name, category ),
          set_entries ( id, weight, reps, notes, timestamp )
        )
      `)
      .eq('client_id', clientId)
      .order('date', { ascending: false })
      .limit(limit);
    return { data, error };
  },

  // ── Programmes ──
  getClientProgramme: async (clientId: string) => {
    const { data, error } = await supabase
      .from('programme_assignments')
      .select(`
        *,
        programmes (
          *,
          programme_exercises (
            *,
            exercises ( name, category )
          )
        )
      `)
      .eq('client_id', clientId)
      .eq('is_active', true)
      .single();
    return { data, error };
  },

  // ── Credit Packs ──
  getCreditPacks: async () => {
    const { data, error } = await supabase
      .from('credit_packs')
      .select('*')
      .eq('is_active', true)
      .order('credits');
    return { data, error };
  },

  // ── Payments ──
  createPayment: async (clientId: string, creditPackId: string, amount: number, method: string) => {
    const { data, error } = await supabase
      .from('payments')
      .insert([{ client_id: clientId, credit_pack_id: creditPackId, amount, status: 'completed', payment_method: method }])
      .select()
      .single();
    return { data, error };
  },
};

export default supabase;
