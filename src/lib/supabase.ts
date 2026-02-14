import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase URL and anon key
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper functions for authentication
export const auth = {
  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  onAuthStateChange: (callback: (event: any, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// Database table helpers
export const db = {
  // Client Profiles
  getClientProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('client_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    return { data, error };
  },

  createClientProfile: async (profile: any) => {
    const { data, error } = await supabase
      .from('client_profiles')
      .insert([profile])
      .select()
      .single();
    return { data, error };
  },

  updateClientProfile: async (userId: string, updates: any) => {
    const { data, error } = await supabase
      .from('client_profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();
    return { data, error };
  },

  // Credits
  getCreditBalance: async (clientId: string) => {
    const { data, error } = await supabase
      .from('credit_balances')
      .select('*')
      .eq('client_id', clientId)
      .single();
    return { data, error };
  },

  updateCreditBalance: async (clientId: string, balance: number) => {
    const { data, error } = await supabase
      .from('credit_balances')
      .update({ balance })
      .eq('client_id', clientId)
      .select()
      .single();
    return { data, error };
  },

  createCreditTransaction: async (transaction: any) => {
    const { data, error } = await supabase
      .from('credit_transactions')
      .insert([transaction])
      .select()
      .single();
    return { data, error };
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

  // Slots
  getAvailableSlots: async (startDate: string, endDate: string) => {
    const { data, error } = await supabase
      .from('slots')
      .select('*')
      .gte('start_time', startDate)
      .lte('end_time', endDate)
      .eq('status', 'available')
      .order('start_time');
    return { data, error };
  },

  createBooking: async (booking: any) => {
    const { data, error } = await supabase
      .from('bookings')
      .insert([booking])
      .select()
      .single();
    return { data, error };
  },

  getClientBookings: async (clientId: string) => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        slots (
          start_time,
          end_time,
          location,
          capacity
        )
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  // Workouts
  createWorkout: async (workout: any) => {
    const { data, error } = await supabase
      .from('workouts')
      .insert([workout])
      .select()
      .single();
    return { data, error };
  },

  getClientWorkouts: async (clientId: string, limit = 20) => {
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: false })
      .limit(limit);
    return { data, error };
  },

  // Exercises
  getExercises: async () => {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .order('name');
    return { data, error };
  },

  // Programmes
  getClientProgramme: async (clientId: string) => {
    const { data, error } = await supabase
      .from('programme_assignments')
      .select(`
        *,
        programmes (
          *,
          programme_exercises (
            *,
            exercises (
              name,
              category
            )
          )
        )
      `)
      .eq('client_id', clientId)
      .eq('is_active', true)
      .single();
    return { data, error };
  },
};

export default supabase;
