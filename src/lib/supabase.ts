import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Auth helpers ──────────────────────────────────────────
export const auth = {
  signUp: async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    phone: string,
    dateOfBirth: string,
    gender?: string,
    referralCode?: string
  ) => {
    // Create auth user with metadata — the DB trigger (SECURITY DEFINER)
    // handles creating profiles, client_profiles, and credit_balances rows
    const redirectUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081';
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone,
          date_of_birth: dateOfBirth,
          gender: gender || null,
          referral_code: referralCode || null,
        },
        emailRedirectTo: redirectUrl,
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

  getAllClients: async () => {
    const { data, error} = await supabase
      .from('client_profiles')
      .select('id, first_name, last_name, email, gender')
      .order('first_name');
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

  // ── Block Bookings ──
  createBlockBooking: async (
    clientId: string,
    startDate: string,
    endDate: string,
    dayOfWeek: number,
    timeSlot: string,
    durationMinutes: number = 60,
    createdBy: string,
    notes?: string
  ) => {
    const { data, error } = await supabase
      .from('block_bookings')
      .insert([{
        client_id: clientId,
        start_date: startDate,
        end_date: endDate,
        day_of_week: dayOfWeek,
        time_slot: timeSlot,
        duration_minutes: durationMinutes,
        created_by: createdBy,
        notes,
        status: 'active'
      }])
      .select()
      .single();
    return { data, error };
  },

  getClientBlockBookings: async (clientId: string) => {
    const { data, error } = await supabase
      .from('block_bookings')
      .select('*')
      .eq('client_id', clientId)
      .order('start_date', { ascending: false });
    return { data, error };
  },

  getAllBlockBookings: async () => {
    const { data, error } = await supabase
      .from('block_bookings')
      .select(`
        *,
        client_profiles:client_id (id, first_name, last_name, email)
      `)
      .order('start_date', { ascending: false });
    return { data, error };
  },

  updateBlockBookingStatus: async (blockBookingId: string, status: string) => {
    const { data, error } = await supabase
      .from('block_bookings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', blockBookingId)
      .select()
      .single();
    return { data, error };
  },

  deleteBlockBooking: async (blockBookingId: string) => {
    const { error } = await supabase
      .from('block_bookings')
      .delete()
      .eq('id', blockBookingId);
    return { error };
  },

  extendBlockBooking: async (blockBookingId: string, newEndDate: string) => {
    const { data, error } = await supabase
      .from('block_bookings')
      .update({ end_date: newEndDate, updated_at: new Date().toISOString() })
      .eq('id', blockBookingId)
      .select()
      .single();

    // Trigger will automatically generate new bookings for the extended period
    return { data, error };
  },

  updateBlockBookingDay: async (blockBookingId: string, newDayOfWeek: number, newTimeSlot: string) => {
    const { data, error } = await supabase
      .from('block_bookings')
      .update({
        day_of_week: newDayOfWeek,
        time_slot: newTimeSlot,
        updated_at: new Date().toISOString()
      })
      .eq('id', blockBookingId)
      .select()
      .single();
    return { data, error };
  },

  // Admin booking without credit deduction
  createAdminBooking: async (slotId: string, clientId: string) => {
    // Insert booking without deducting credit
    const { data, error } = await supabase
      .from('bookings')
      .insert([{
        slot_id: slotId,
        client_id: clientId,
        status: 'booked',
        credits_used: 0  // Admin bookings don't deduct credits immediately
      }])
      .select()
      .single();
    if (error) return { data, error };

    // Increment booked_count on slot
    const { data: slot } = await supabase.from('slots').select('booked_count').eq('id', slotId).single();
    await supabase.from('slots').update({ booked_count: (slot?.booked_count ?? 0) + 1 }).eq('id', slotId);
    return { data, error: null };
  },

  // Check if client has low credits (2 or fewer)
  hasLowCredits: async (clientId: string): Promise<boolean> => {
    const { data } = await supabase
      .from('credit_balances')
      .select('balance')
      .eq('client_id', clientId)
      .single();
    return (data?.balance ?? 0) <= 2;
  },

  // ── Workout Management ──
  updateWorkoutExercise: async (workoutExerciseId: string, updates: { order_index?: number }) => {
    const { data, error } = await supabase
      .from('workout_exercises')
      .update(updates)
      .eq('id', workoutExerciseId)
      .select()
      .single();
    return { data, error };
  },

  deleteWorkoutExercise: async (workoutExerciseId: string) => {
    const { error } = await supabase
      .from('workout_exercises')
      .delete()
      .eq('id', workoutExerciseId);
    return { error };
  },

  deleteSetEntry: async (setId: string) => {
    const { error } = await supabase
      .from('set_entries')
      .delete()
      .eq('id', setId);
    return { error };
  },

  // ── Attendance Tracking ──
  markSessionAttended: async (bookingId: string, attended: boolean) => {
    const { data, error } = await supabase
      .from('bookings')
      .update({ attended, updated_at: new Date().toISOString() })
      .eq('id', bookingId)
      .select()
      .single();
    return { data, error };
  },

  markSessionNoShow: async (bookingId: string) => {
    const { data, error } = await supabase
      .from('bookings')
      .update({ no_show: true, attended: false, updated_at: new Date().toISOString() })
      .eq('id', bookingId)
      .select()
      .single();
    return { data, error };
  },

  // ── Credit Pack Management ──
  createCreditPack: async (credits: number, price: number, discountPercent: number = 0, isActive: boolean = true) => {
    const { data, error } = await supabase
      .from('credit_packs')
      .insert([{ credits, price, discount_percent: discountPercent, is_active: isActive }])
      .select()
      .single();
    return { data, error };
  },

  updateCreditPack: async (packId: string, updates: any) => {
    const { data, error } = await supabase
      .from('credit_packs')
      .update(updates)
      .eq('id', packId)
      .select()
      .single();
    return { data, error };
  },

  deleteCreditPack: async (packId: string) => {
    // Soft delete by marking inactive
    const { data, error } = await supabase
      .from('credit_packs')
      .update({ is_active: false })
      .eq('id', packId)
      .select()
      .single();
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

  getAllProgrammes: async () => {
    const { data, error } = await supabase
      .from('programmes')
      .select(`
        *,
        programme_exercises (
          *,
          exercises ( name, category )
        )
      `)
      .eq('is_active', true)
      .order('name');
    return { data, error };
  },

  assignProgrammeToClient: async (clientId: string, programmeId: string, notes?: string) => {
    const { data, error } = await supabase
      .from('programme_assignments')
      .insert([{ client_id: clientId, programme_id: programmeId, notes: notes || null, is_active: true }])
      .select()
      .single();
    return { data, error };
  },

  unassignProgrammeFromClient: async (assignmentId: string) => {
    const { data, error } = await supabase
      .from('programme_assignments')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', assignmentId)
      .select()
      .single();
    return { data, error };
  },

  getAllProgrammeAssignments: async () => {
    const { data, error } = await supabase
      .from('programme_assignments')
      .select(`
        *,
        client_profiles (
          id,
          profiles ( first_name, last_name, email )
        ),
        programmes ( name, description )
      `)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false });
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

  // ── MESSAGING ──
  getMessages: async (userId: string, recipientId?: string) => {
    let query = supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id(id, first_name, last_name, role),
        recipient:recipient_id(id, first_name, last_name, role)
      `)
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (recipientId) {
      query = query.or(`and(sender_id.eq.${userId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${userId})`);
    }

    return await query;
  },

  sendMessage: async (senderId: string, recipientId: string, content: string) => {
    // Send the message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert([{ sender_id: senderId, recipient_id: recipientId, content }])
      .select()
      .single();

    if (messageError) return { data: null, error: messageError };

    // Create a notification for the recipient
    try {
      // Get sender info
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('email, role')
        .eq('id', senderId)
        .single();

      const senderName = senderProfile?.role === 'admin' ? 'Your PT' : 'Client';
      const truncatedContent = content.length > 50 ? content.substring(0, 50) + '...' : content;

      await supabase.from('slot_notifications').insert([{
        client_id: recipientId,
        notification_type: 'new_message',
        message: `${senderName}: ${truncatedContent}`,
        read: false,
      }]);
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
      // Don't fail the message send if notification fails
    }

    return { data: message, error: null };
  },

  markMessageAsRead: async (messageId: string) => {
    return await supabase
      .from('messages')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', messageId);
  },

  getUnreadCount: async (userId: string) => {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('read', false);
    return { count };
  },

  // ── SESSION NOTES ──
  getSessionNote: async (bookingId: string) => {
    return await supabase
      .from('session_notes')
      .select('*')
      .eq('booking_id', bookingId)
      .single();
  },

  createSessionNote: async (bookingId: string, ptNotes: string, rating?: number, focus?: string) => {
    return await supabase
      .from('session_notes')
      .insert([{
        booking_id: bookingId,
        pt_notes: ptNotes,
        performance_rating: rating,
        next_session_focus: focus
      }])
      .select()
      .single();
  },

  updateSessionNote: async (noteId: string, updates: any) => {
    return await supabase
      .from('session_notes')
      .update(updates)
      .eq('id', noteId)
      .select()
      .single();
  },

  // ── WAITLIST ──
  joinWaitlist: async (slotId: string, clientId: string) => {
    // Get next position
    const { data: waitlist } = await supabase
      .from('waitlist')
      .select('position')
      .eq('slot_id', slotId)
      .order('position', { ascending: false })
      .limit(1);

    const nextPosition = waitlist && waitlist.length > 0 ? waitlist[0].position + 1 : 1;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    return await supabase
      .from('waitlist')
      .insert([{
        slot_id: slotId,
        client_id: clientId,
        position: nextPosition,
        expires_at: expiresAt.toISOString()
      }])
      .select()
      .single();
  },

  getWaitlistPosition: async (slotId: string, clientId: string) => {
    return await supabase
      .from('waitlist')
      .select('*')
      .eq('slot_id', slotId)
      .eq('client_id', clientId)
      .single();
  },

  getWaitlistForSlot: async (slotId: string) => {
    return await supabase
      .from('waitlist')
      .select(`
        *,
        client:client_id(first_name, last_name, phone)
      `)
      .eq('slot_id', slotId)
      .order('position', { ascending: true });
  },

  removeFromWaitlist: async (waitlistId: string) => {
    return await supabase
      .from('waitlist')
      .delete()
      .eq('id', waitlistId);
  },

  leaveWaitlist: async (waitlistId: string) => {
    return await supabase
      .from('waitlist')
      .delete()
      .eq('id', waitlistId);
  },

  getClientWaitlist: async (clientId: string) => {
    return await supabase
      .from('waitlist')
      .select(`
        *,
        slots:slot_id(id, start_time, end_time, location)
      `)
      .eq('client_id', clientId)
      .eq('status', 'waiting')
      .order('created_at', { ascending: false });
  },

  // ── REFERRALS ──
  createReferralCode: async (referrerId: string) => {
    const code = `PT${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    return await supabase
      .from('referrals')
      .insert([{
        referrer_id: referrerId,
        referral_code: code,
        status: 'pending'
      }])
      .select()
      .single();
  },

  getReferralByCode: async (code: string) => {
    return await supabase
      .from('referrals')
      .select('*')
      .eq('referral_code', code)
      .single();
  },

  getReferralStats: async (userId: string) => {
    const { data: referrals } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', userId);

    const pending = referrals?.filter(r => r.status === 'pending').length || 0;
    const completed = referrals?.filter(r => r.status === 'completed').length || 0;
    const totalEarned = completed * 25; // £25 per referral

    return { data: { pending, completed, totalEarned, referrals }, error: null };
  },

  awardReferralCredit: async (referralId: string, referrerId: string, referredId: string) => {
    // Award credit to both parties
    await db.addCredits(referrerId, 1, 'Referral reward');
    await db.addCredits(referredId, 1, 'Welcome referral bonus');

    // Mark referral as credited
    return await supabase
      .from('referrals')
      .update({ status: 'completed', credited: true })
      .eq('id', referralId);
  },

  // ── ADMIN - SLOT MANAGEMENT ──
  updateSlot: async (slotId: string, updates: any) => {
    return await supabase
      .from('slots')
      .update(updates)
      .eq('id', slotId)
      .select()
      .single();
  },

  deleteSlot: async (slotId: string) => {
    // Get affected bookings first
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*, client_profiles(*), slots(*)')
      .eq('slot_id', slotId)
      .eq('status', 'booked');

    // Create notifications for affected clients
    if (bookings && bookings.length > 0) {
      const notifications = bookings.map((booking: any) => ({
        slot_id: slotId,
        booking_id: booking.id,
        notification_type: 'slot_deleted',
        old_start_time: booking.slots.start_time,
        message: `Your session on ${new Date(booking.slots.start_time).toLocaleString()} has been cancelled by your PT. Your session credit has been refunded.`
      }));

      await supabase.from('slot_notifications').insert(notifications);

      // Refund credits to all affected clients
      for (const booking of bookings) {
        const startDate = new Date(booking.slots.start_time);
        const dateStr = startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        await db.refundCredit(booking.client_id, `Refund for cancelled session on ${dateStr}`);
      }
    }

    // Delete the slot (cascades to bookings)
    return await supabase
      .from('slots')
      .delete()
      .eq('id', slotId);
  },

  rescheduleSlot: async (slotId: string, newStartTime: string, newEndTime: string) => {
    // Get old slot data and bookings
    const { data: slot } = await supabase
      .from('slots')
      .select('*, bookings(*, client_profiles(*))')
      .eq('id', slotId)
      .single();

    if (!slot) throw new Error('Slot not found');

    // Create notifications
    if (slot.bookings && slot.bookings.length > 0) {
      const notifications = slot.bookings.map((booking: any) => ({
        slot_id: slotId,
        booking_id: booking.id,
        notification_type: 'slot_rescheduled',
        old_start_time: slot.start_time,
        new_start_time: newStartTime,
        message: `Your session has been rescheduled from ${new Date(slot.start_time).toLocaleString()} to ${new Date(newStartTime).toLocaleString()}`
      }));

      await supabase.from('slot_notifications').insert(notifications);
    }

    // Update slot
    return await supabase
      .from('slots')
      .update({ start_time: newStartTime, end_time: newEndTime })
      .eq('id', slotId)
      .select()
      .single();
  },

  // ── ADMIN - WORKOUT MANAGEMENT ──
  updateClientWorkoutSet: async (setId: string, weight?: number, reps?: number, notes?: string) => {
    const updates: any = {};
    if (weight !== undefined) updates.weight = weight;
    if (reps !== undefined) updates.reps = reps;
    if (notes !== undefined) updates.notes = notes;

    return await supabase
      .from('set_entries')
      .update(updates)
      .eq('id', setId)
      .select()
      .single();
  },

  // ── ADMIN - ANALYTICS ──
  getBusinessMetrics: async () => {
    // Total active clients
    const { count: totalClients } = await supabase
      .from('client_profiles')
      .select('*', { count: 'exact', head: true });

    // Gender split
    const { data: genderData } = await supabase
      .from('client_profiles')
      .select('gender');

    const genderSplit = {
      male: genderData?.filter(c => c.gender === 'male').length || 0,
      female: genderData?.filter(c => c.gender === 'female').length || 0,
      other: genderData?.filter(c => c.gender === 'other' || c.gender === 'prefer_not_to_say').length || 0
    };

    // Revenue (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: transactions } = await supabase
      .from('credit_transactions')
      .select('amount, description')
      .gte('created_at', thirtyDaysAgo)
      .ilike('description', '%Purchased%');

    const monthlyRevenue = transactions?.reduce((sum, t) => {
      const match = t.description.match(/£(\d+)/);
      return sum + (match ? parseInt(match[1]) : 0);
    }, 0) || 0;

    // Attendance rate
    const { data: bookings } = await supabase
      .from('bookings')
      .select('attended, status')
      .eq('status', 'booked')
      .not('attended', 'is', null);

    const attended = bookings?.filter(b => b.attended === true).length || 0;
    const total = bookings?.length || 1;
    const attendanceRate = Math.round((attended / total) * 100);

    return {
      data: {
        totalClients,
        genderSplit,
        monthlyRevenue,
        attendanceRate
      },
      error: null
    };
  },

  getClientPerformance: async (clientId: string) => {
    const { data: workouts } = await supabase
      .from('workouts')
      .select(`
        *,
        workout_exercises(
          *,
          exercises(name, category),
          set_entries(weight, reps)
        )
      `)
      .eq('client_id', clientId)
      .order('date', { ascending: false });

    const { data: bookings } = await supabase
      .from('bookings')
      .select('*, slots(*)')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    const attendanceRate = bookings ?
      Math.round((bookings.filter(b => b.attended === true).length / bookings.length) * 100) : 0;

    return {
      data: {
        workouts,
        bookings,
        attendanceRate,
        totalWorkouts: workouts?.length || 0,
        totalBookings: bookings?.length || 0
      },
      error: null
    };
  },

  // ── NOTIFICATIONS ──
  getClientNotifications: async (clientId: string) => {
    return await supabase
      .from('slot_notifications')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
  },

  getUnreadNotificationCount: async (clientId: string) => {
    const { count } = await supabase
      .from('slot_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('read', false);
    return { count };
  },

  markNotificationAsRead: async (notificationId: string) => {
    return await supabase
      .from('slot_notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);
  },

  markAllNotificationsAsRead: async (clientId: string) => {
    return await supabase
      .from('slot_notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('client_id', clientId)
      .eq('read', false);
  },
};

export default supabase;
