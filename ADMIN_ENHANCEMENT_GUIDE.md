# Admin Screen Enhancement - Quick Reference Guide

This guide shows exactly how to use the database functions that are already implemented for the admin portal enhancements.

## Overview Dashboard Tab

```typescript
// Load business metrics
const loadOverviewData = async () => {
  const { data } = await db.getBusinessMetrics();

  // data contains:
  // - totalClients: number
  // - genderSplit: { male: number, female: number, other: number }
  // - monthlyRevenue: number (in £)
  // - attendanceRate: number (percentage)

  setMetrics(data);
};
```

**UI Layout:**
```
┌─────────────────────────────────────┐
│  Total Clients    │  Monthly Revenue │
│       24          │       £1,250     │
├─────────────────────────────────────┤
│  Attendance Rate  │   Gender Split   │
│       87%         │   M:14 F:9 O:1   │
└─────────────────────────────────────┘
```

## Enhanced Clients Tab

```typescript
// When client card is clicked
const handleClientClick = async (client: any) => {
  const { data } = await db.getClientPerformance(client.id);

  // data contains:
  // - workouts: array of workout objects with exercises and sets
  // - bookings: array of booking objects with slots
  // - attendanceRate: number (percentage)
  // - totalWorkouts: number
  // - totalBookings: number

  // Navigate to client detail screen or show modal
  navigation.navigate('ClientDetail', { clientData: data, client });
};
```

## Enhanced Schedule Tab

### Edit Slot
```typescript
const handleEditSlot = async (slot: any, newData: any) => {
  // newData can contain: start_time, end_time, location, capacity
  const { data, error } = await db.updateSlot(slot.id, newData);

  if (error) {
    Alert.alert('Error', error.message);
  } else {
    Alert.alert('Success', 'Slot updated');
    loadSlots(); // Refresh
  }
};
```

### Delete Slot
```typescript
const handleDeleteSlot = async (slot: any) => {
  Alert.alert(
    'Delete Slot',
    'This will refund all booked clients and send notifications. Continue?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await db.deleteSlot(slot.id);

          if (error) {
            Alert.alert('Error', error.message);
          } else {
            Alert.alert(
              'Success',
              'Slot deleted. Clients have been refunded and notified.'
            );
            loadSlots();
          }
        },
      },
    ]
  );
};
```

### Reschedule Slot
```typescript
const handleRescheduleSlot = async (slotId: string, newStartTime: string, newEndTime: string) => {
  const { error } = await db.rescheduleSlot(slotId, newStartTime, newEndTime);

  if (error) {
    Alert.alert('Error', error.message);
  } else {
    Alert.alert('Success', 'Slot rescheduled. Clients have been notified.');
    loadSlots();
  }
};
```

## Messages Tab (Admin)

```typescript
// Load all admin messages
const loadAdminMessages = async (adminUserId: string) => {
  const { data } = await db.getMessages(adminUserId);

  // data is array of message objects with sender/recipient info
  // Group by conversation similar to MessagingScreen

  setMessages(data);
};

// Send message to client
const sendMessageToClient = async (adminId: string, clientId: string, content: string) => {
  const { data, error } = await db.sendMessage(adminId, clientId, content);

  if (!error) {
    loadAdminMessages(adminId); // Refresh
  }
};

// Get unread count
const loadUnreadCount = async (adminId: string) => {
  const { count } = await db.getUnreadCount(adminId);
  setUnreadCount(count || 0);
};
```

## Session Notes Tab

```typescript
// List all completed bookings (candidates for notes)
const loadCompletedSessions = async () => {
  const { data } = await supabase
    .from('bookings')
    .select('*, slots(*), client_profiles(first_name, last_name)')
    .eq('status', 'booked')
    .lt('slots.end_time', new Date().toISOString())
    .order('slots.start_time', { ascending: false });

  setCompletedSessions(data || []);

  // For each, check if note exists
  for (const booking of data || []) {
    const { data: note } = await db.getSessionNote(booking.id);
    // Store notes in state
  }
};

// Create new session note
const createNote = async (bookingId: string, notes: string, rating: number, focus: string) => {
  const { data, error } = await db.createSessionNote(
    bookingId,
    notes,
    rating, // 1-5
    focus
  );

  if (!error) {
    Alert.alert('Success', 'Session notes saved');
    loadCompletedSessions();
  }
};

// Update existing note
const updateNote = async (noteId: string, updates: any) => {
  // updates can contain: pt_notes, performance_rating, next_session_focus
  const { data, error } = await db.updateSessionNote(noteId, updates);

  if (!error) {
    Alert.alert('Success', 'Notes updated');
  }
};
```

## Waitlist Tab

```typescript
// Load all active waitlists
const loadWaitlists = async () => {
  // First, find all slots that are full
  const { data: fullSlots } = await supabase
    .from('slots')
    .select('*')
    .gte('booked_count', 'capacity')
    .gte('start_time', new Date().toISOString())
    .order('start_time');

  // For each full slot, get waitlist
  const waitlists = [];
  for (const slot of fullSlots || []) {
    const { data } = await db.getWaitlistForSlot(slot.id);
    if (data && data.length > 0) {
      waitlists.push({
        slot,
        entries: data
      });
    }
  }

  setWaitlists(waitlists);
};

// Remove from waitlist
const removeFromWaitlist = async (waitlistId: string) => {
  const { error } = await db.removeFromWaitlist(waitlistId);

  if (!error) {
    Alert.alert('Success', 'Removed from waitlist');
    loadWaitlists();
  }
};

// Clear expired entries
const clearExpired = async () => {
  const { data: expired } = await supabase
    .from('waitlist')
    .select('id')
    .lt('expires_at', new Date().toISOString());

  for (const entry of expired || []) {
    await db.removeFromWaitlist(entry.id);
  }

  Alert.alert('Success', `Cleared ${expired?.length || 0} expired entries`);
  loadWaitlists();
};
```

## Referrals Tab

```typescript
// Load all referrals
const loadAllReferrals = async () => {
  const { data } = await supabase
    .from('referrals')
    .select(`
      *,
      referrer:referrer_id(first_name, last_name),
      referred:referred_id(first_name, last_name)
    `)
    .order('created_at', { ascending: false });

  const pending = data?.filter(r => r.status === 'pending') || [];
  const completed = data?.filter(r => r.status === 'completed') || [];

  setPendingReferrals(pending);
  setCompletedReferrals(completed);
};

// Award referral credit
const awardCredit = async (referral: any) => {
  if (!referral.referred_id) {
    Alert.alert('Error', 'Referred user not yet signed up');
    return;
  }

  const { error } = await db.awardReferralCredit(
    referral.id,
    referral.referrer_id,
    referral.referred_id
  );

  if (!error) {
    Alert.alert('Success', 'Credits awarded to both parties!');
    loadAllReferrals();
  }
};
```

## Analytics Tab

### Revenue Trend (Last 30 Days)
```typescript
const loadRevenueTrend = async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from('credit_transactions')
    .select('created_at, description')
    .gte('created_at', thirtyDaysAgo)
    .ilike('description', '%Purchased%')
    .order('created_at');

  // Group by day and sum revenue
  const dailyRevenue = data?.reduce((acc, t) => {
    const day = format(new Date(t.created_at), 'MMM d');
    const match = t.description.match(/£(\d+)/);
    const amount = match ? parseInt(match[1]) : 0;

    if (!acc[day]) acc[day] = 0;
    acc[day] += amount;
    return acc;
  }, {});

  setRevenueTrend(dailyRevenue);
};
```

### Session Utilization
```typescript
const loadUtilization = async () => {
  const { data: slots } = await supabase
    .from('slots')
    .select('capacity, booked_count')
    .gte('start_time', new Date().toISOString());

  const totalCapacity = slots?.reduce((sum, s) => sum + s.capacity, 0) || 1;
  const totalBooked = slots?.reduce((sum, s) => sum + s.booked_count, 0) || 0;

  const utilizationRate = Math.round((totalBooked / totalCapacity) * 100);
  setUtilizationRate(utilizationRate);
};
```

### Most Active Clients
```typescript
const loadActiveClients = async () => {
  const { data } = await supabase
    .from('workouts')
    .select('client_id, client_profiles(first_name, last_name)')
    .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  // Count workouts per client
  const counts = data?.reduce((acc, w) => {
    const key = w.client_id;
    if (!acc[key]) {
      acc[key] = {
        client: w.client_profiles,
        count: 0
      };
    }
    acc[key].count++;
    return acc;
  }, {});

  // Sort by count
  const sorted = Object.values(counts || {})
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 10);

  setActiveClients(sorted);
};
```

## Edit Workout Sets (from Clients Detail)

```typescript
const handleUpdateSet = async (setId: string, weight?: number, reps?: number, notes?: string) => {
  const { error } = await db.updateClientWorkoutSet(setId, weight, reps, notes);

  if (!error) {
    Alert.alert('Success', 'Set updated');
    // Reload client performance data
  }
};
```

## Sample Tab Structure

```typescript
const AdminEnhanced = () => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'clients' | 'schedule' | 'messages' | 'notes' | 'waitlist' | 'referrals' | 'analytics'
  >('overview');

  const tabs = [
    { id: 'overview', name: 'Overview', icon: 'stats-chart' },
    { id: 'clients', name: 'Clients', icon: 'people' },
    { id: 'schedule', name: 'Schedule', icon: 'calendar' },
    { id: 'messages', name: 'Messages', icon: 'mail' },
    { id: 'notes', name: 'Notes', icon: 'document-text' },
    { id: 'waitlist', name: 'Waitlist', icon: 'hourglass' },
    { id: 'referrals', name: 'Referrals', icon: 'gift' },
    { id: 'analytics', name: 'Analytics', icon: 'trending-up' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      {/* Tab Bar - use horizontal ScrollView for 8 tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id as any)}
          >
            <Ionicons name={tab.icon} size={20} />
            <Text>{tab.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <ScrollView>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'clients' && <ClientsTab />}
        {/* ... etc */}
      </ScrollView>
    </SafeAreaView>
  );
};
```

## Styling Tips

- Reuse existing styles from current AdminScreen
- Use same color scheme: #3b82f6 (blue), #10b981 (green), #ef4444 (red)
- Card pattern: white background, borderRadius: 12, shadow, padding: 16
- Consistent spacing: 16px margins, 8px gaps
- Icon sizes: 20-24px for tabs, 16px for inline, 32-48px for headers
