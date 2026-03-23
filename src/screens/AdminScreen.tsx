import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase, db, auth } from '../lib/supabase';
import { format, addDays, setHours, setMinutes } from 'date-fns';

const COLORS = {
  BG_DARK: '#0a0a0a',
  BG_CARD: '#141414',
  GOLD: '#c8a94e',
  GOLD_DIM: '#a8893e',
  BORDER: '#2a2a2a',
  TEXT_WHITE: '#ffffff',
  TEXT_MUTED: '#9ca3af',
  GREEN: '#10b981',
  RED: '#ef4444',
  OVERLAY: 'rgba(0, 0, 0, 0.85)',
};

type TabKey = 'today' | 'schedule' | 'clients' | 'pricing' | 'finance' | 'settings';

interface AdminScreenProps {
  navigation: any;
  onLogout?: () => void;
}

const AdminScreen: React.FC<AdminScreenProps> = ({ navigation, onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('today');
  const [todayBookings, setTodayBookings] = useState<any[]>([]);
  const [appSettings, setAppSettings] = useState<any>({});
  const [settingsForm, setSettingsForm] = useState({ lowCreditThreshold: '', cancellationWindowHours: '' });
  const [savingSettings, setSavingSettings] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [creditPacks, setCreditPacks] = useState<any[]>([]);
  const [showAddPackModal, setShowAddPackModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [newPack, setNewPack] = useState({ credits: '', price: '', discount: '' });
  const [creating, setCreating] = useState(false);
  const [showAdjustCreditsModal, setShowAdjustCreditsModal] = useState(false);
  const [adjustCreditsAmount, setAdjustCreditsAmount] = useState('');
  const [showEditPackModal, setShowEditPackModal] = useState(false);
  const [selectedPack, setSelectedPack] = useState<any>(null);
  const [editPackForm, setEditPackForm] = useState({ credits: '', price: '', discount: '' });

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Finance state
  const [payments, setPayments] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [weeklyRevenue, setWeeklyRevenue] = useState(0);
  const [dailyRevenue, setDailyRevenue] = useState(0);

  // Bank account state
  const [bankAccount1Form, setBankAccount1Form] = useState({ iban: '', accountHolderName: '' });
  const [bankAccount2Form, setBankAccount2Form] = useState({ iban: '', accountHolderName: '' });
  const [savingBank1, setSavingBank1] = useState(false);
  const [savingBank2, setSavingBank2] = useState(false);
  const [savedBankAccounts, setSavedBankAccounts] = useState<{ slot1?: string; slot2?: string }>({});

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Client selection state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [deletingClients, setDeletingClients] = useState(false);

  // Add Client state
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [addingClient, setAddingClient] = useState(false);
  const [newClient, setNewClient] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
  });

  // Slot management state
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [slotForm, setSlotForm] = useState({ startTime: '', endTime: '', capacity: '' });

  // Create weekly slots weeks picker
  const [showWeeksModal, setShowWeeksModal] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      // Load all clients (exclude admins)
      const { data: clientsData } = await supabase
        .from('client_profiles')
        .select(`
          *,
          credit_balances (balance),
          profiles!inner (email, role)
        `)
        .eq('profiles.role', 'client')
        .order('first_name');
      setClients(clientsData || []);

      // Load upcoming slots
      const today = new Date().toISOString();
      const nextWeek = addDays(new Date(), 14).toISOString();
      const { data: slotsData } = await supabase
        .from('slots')
        .select('*')
        .gte('start_time', today)
        .lte('start_time', nextWeek)
        .order('start_time');
      setSlots(slotsData || []);

      // Load credit packs
      const { data: packsData } = await db.getCreditPacks();
      setCreditPacks(packsData || []);

      // Load today's bookings for attendance
      const { data: todayData } = await db.getTodayBookings();
      setTodayBookings(todayData || []);

      // Load ALL payments for finance (no limit — this is the income statement)
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*, client_profiles(first_name, last_name)')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });
      setPayments(paymentsData || []);

      const total = (paymentsData || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      setTotalRevenue(total);

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthly = (paymentsData || [])
        .filter((p: any) => p.created_at >= monthStart)
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      setMonthlyRevenue(monthly);

      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekly = (paymentsData || [])
        .filter((p: any) => p.created_at >= weekStart.toISOString())
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      setWeeklyRevenue(weekly);

      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const daily = (paymentsData || [])
        .filter((p: any) => p.created_at >= dayStart)
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      setDailyRevenue(daily);

      // Load saved bank account IDs from app_settings
      const { data: bankSettings } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['bank_account_id_1', 'bank_account_id_2']);
      if (bankSettings) {
        const saved: { slot1?: string; slot2?: string } = {};
        bankSettings.forEach((s: any) => {
          const val = typeof s.value === 'string' ? s.value.replace(/"/g, '') : String(s.value);
          if (s.key === 'bank_account_id_1') saved.slot1 = val;
          if (s.key === 'bank_account_id_2') saved.slot2 = val;
        });
        setSavedBankAccounts(saved);
      }

      // Load app settings
      const { data: settingsData } = await db.getAllAppSettings();
      if (settingsData) {
        const map: any = {};
        settingsData.forEach((s: any) => { map[s.key] = s.value; });
        setAppSettings(map);
        setSettingsForm({
          lowCreditThreshold: String(map.low_credit_threshold || 2),
          cancellationWindowHours: String(map.cancellation_window_hours || 48),
        });
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttended = async (bookingId: string) => {
    try {
      await db.markSessionAttended(bookingId);
      Alert.alert('Success', 'Marked as attended');
      loadAdminData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update');
    }
  };

  const handleMarkNoShow = async (bookingId: string) => {
    Alert.alert(
      'Mark No Show',
      'This client will lose their session credit. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm No Show',
          style: 'destructive',
          onPress: async () => {
            try {
              await db.markSessionNoShow(bookingId);
              Alert.alert('Done', 'Marked as no-show. Credit forfeited.');
              loadAdminData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to update');
            }
          },
        },
      ]
    );
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await db.updateAppSetting('low_credit_threshold', parseInt(settingsForm.lowCreditThreshold) || 2);
      await db.updateAppSetting('cancellation_window_hours', parseInt(settingsForm.cancellationWindowHours) || 48);
      Alert.alert('Saved', 'Settings updated successfully');
      loadAdminData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const createWeeklySlots = async (numWeeks: number) => {
    setShowWeeksModal(false);
    try {
      const slotsToCreate = [];
      const startDate = new Date();

      for (let week = 0; week < numWeeks; week++) {
        for (let day = 0; day < 7; day++) {
          const slotDate = addDays(startDate, week * 7 + day);
          if (slotDate.getDay() === 0 || slotDate.getDay() === 6) continue;

          // Morning session: 7:30-9:30
          const morningStart = setMinutes(setHours(slotDate, 7), 30);
          const morningEnd = setMinutes(setHours(slotDate, 9), 30);
          slotsToCreate.push({
            start_time: morningStart.toISOString(),
            end_time: morningEnd.toISOString(),
            capacity: 6,
            booked_count: 0,
            status: 'available',
            location: 'Elevate Gym',
          });

          // Late morning session: 9:30-11:30
          const lateStart = setMinutes(setHours(slotDate, 9), 30);
          const lateEnd = setMinutes(setHours(slotDate, 11), 30);
          slotsToCreate.push({
            start_time: lateStart.toISOString(),
            end_time: lateEnd.toISOString(),
            capacity: 6,
            booked_count: 0,
            status: 'available',
            location: 'Elevate Gym',
          });
        }
      }

      const { error } = await supabase.from('slots').insert(slotsToCreate);
      if (error) throw error;

      Alert.alert('Success', `Created ${slotsToCreate.length} slots for ${numWeeks} weeks`);
      loadAdminData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create slots');
    }
  };

  const adjustClientCredits = (client: any) => {
    setSelectedClient(client);
    setAdjustCreditsAmount('');
    setShowAdjustCreditsModal(true);
  };

  const handleAdjustCredits = async () => {
    if (!selectedClient) return;

    const amount = parseInt(adjustCreditsAmount || '0');
    if (isNaN(amount) || amount === 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid number');
      return;
    }

    try {
      if (amount > 0) {
        await db.addCredits(selectedClient.id, amount, `Admin adjustment: +${amount}`);
      } else {
        const { data: bal } = await supabase
          .from('credit_balances')
          .select('balance')
          .eq('client_id', selectedClient.id)
          .single();
        const current = bal?.balance || 0;
        await supabase
          .from('credit_balances')
          .update({ balance: Math.max(0, current + amount) })
          .eq('client_id', selectedClient.id);
        await supabase.from('credit_transactions').insert([
          {
            client_id: selectedClient.id,
            type: 'consume',
            amount,
            description: `Admin adjustment: ${amount}`,
          },
        ]);
      }
      Alert.alert('Success', 'Credits adjusted');
      setShowAdjustCreditsModal(false);
      setSelectedClient(null);
      setAdjustCreditsAmount('');
      loadAdminData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to adjust credits');
    }
  };

  const handleCreatePack = async () => {
    if (!newPack.credits || !newPack.price) {
      Alert.alert('Error', 'Please fill in credits and price');
      return;
    }

    setCreating(true);
    try {
      const { error } = await db.createCreditPack(
        parseInt(newPack.credits),
        parseFloat(newPack.price) * 100,
        parseFloat(newPack.discount || '0')
      );

      if (error) throw error;

      Alert.alert('Success', 'Credit pack created!');
      setShowAddPackModal(false);
      setNewPack({ credits: '', price: '', discount: '' });
      await loadAdminData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create pack');
    } finally {
      setCreating(false);
    }
  };

  const handleEditPack = (pack: any) => {
    setSelectedPack(pack);
    setEditPackForm({
      credits: pack.credits.toString(),
      price: (pack.price / 100).toString(),
      discount: pack.discount_percent?.toString() || '0',
    });
    setShowEditPackModal(true);
  };

  const handleUpdatePack = async () => {
    if (!selectedPack || !editPackForm.credits || !editPackForm.price) {
      Alert.alert('Error', 'Please fill in credits and price');
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase
        .from('credit_packs')
        .update({
          credits: parseInt(editPackForm.credits),
          price: parseFloat(editPackForm.price) * 100,
          discount_percent: parseFloat(editPackForm.discount || '0'),
        })
        .eq('id', selectedPack.id);

      if (error) throw error;

      Alert.alert('Success', 'Credit pack updated!');
      setShowEditPackModal(false);
      setSelectedPack(null);
      setEditPackForm({ credits: '', price: '', discount: '' });
      await loadAdminData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update pack');
    } finally {
      setCreating(false);
    }
  };

  const handleEditSlot = (slot: any) => {
    setSelectedSlot(slot);
    setSlotForm({
      startTime: format(new Date(slot.start_time), 'yyyy-MM-dd\'T\'HH:mm'),
      endTime: format(new Date(slot.end_time), 'yyyy-MM-dd\'T\'HH:mm'),
      capacity: slot.capacity.toString(),
    });
    setShowSlotModal(true);
  };

  const handleUpdateSlot = async () => {
    if (!selectedSlot) return;

    try {
      const updates: any = {};

      if (slotForm.capacity !== selectedSlot.capacity.toString()) {
        updates.capacity = parseInt(slotForm.capacity);
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await db.updateSlot(selectedSlot.id, updates);
        if (error) throw error;
      }

      const newStartTime = new Date(slotForm.startTime).toISOString();
      const newEndTime = new Date(slotForm.endTime).toISOString();

      if (newStartTime !== selectedSlot.start_time || newEndTime !== selectedSlot.end_time) {
        const { error } = await db.rescheduleSlot(selectedSlot.id, newStartTime, newEndTime);
        if (error) throw error;
      }

      Alert.alert('Success', 'Slot updated successfully');
      setShowSlotModal(false);
      setSelectedSlot(null);
      await loadAdminData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update slot');
    }
  };

  const handleDeleteSlot = (slot: any) => {
    Alert.alert(
      'Delete Slot',
      `This slot has ${slot.booked_count} booking(s). Are you sure you want to delete it?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await db.deleteSlot(slot.id);
              if (error) throw error;

              Alert.alert('Success', 'Slot deleted successfully');
              await loadAdminData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete slot');
            }
          },
        },
      ]
    );
  };

  const handleAddClient = async () => {
    if (!newClient.email || !newClient.firstName || !newClient.lastName) {
      Alert.alert('Missing Fields', 'Email, first name and last name are required');
      return;
    }

    setAddingClient(true);
    try {
      const { data, error } = await db.adminCreateClient({
        email: newClient.email.trim().toLowerCase(),
        firstName: newClient.firstName.trim(),
        lastName: newClient.lastName.trim(),
        phone: newClient.phone.trim(),
        dateOfBirth: newClient.dateOfBirth.trim(),
        gender: newClient.gender,
      });

      if (error) {
        const errMsg = typeof error === 'string' ? error : error.message || JSON.stringify(error);
        throw new Error(errMsg);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const message = `Account created! An invite email has been sent to ${newClient.email} with a link to set their password.`;

      setShowAddClientModal(false);
      setNewClient({ email: '', firstName: '', lastName: '', phone: '', dateOfBirth: '', gender: '' });
      await loadAdminData();

      Alert.alert('Client Created', message);
    } catch (error: any) {
      const msg = error.message || 'Failed to create client';
      Alert.alert('Error Creating Client', msg);
    } finally {
      setAddingClient(false);
    }
  };

  const handleDeleteSelectedClients = () => {
    const count = selectedClientIds.size;
    if (count === 0) return;
    Alert.alert(
      'Delete Clients',
      `Are you sure you want to permanently delete ${count} client${count > 1 ? 's' : ''}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingClients(true);
            try {
              // Get user_ids for selected client_profile ids
              const selectedClients = clients.filter(c => selectedClientIds.has(c.id));
              const userIds = selectedClients.map(c => c.user_id).filter(Boolean);
              const { data, error } = await db.deleteClients(userIds);
              if (error) throw new Error(error.message);
              setSelectedClientIds(new Set());
              setSelectMode(false);
              await loadAdminData();
              Alert.alert('Done', `${data?.deleted?.length || count} client${count > 1 ? 's' : ''} deleted.`);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete clients');
            } finally {
              setDeletingClients(false);
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    await auth.signOut();
    if (onLogout) {
      onLogout();
    } else {
      navigation.navigate('Login');
    }
  };

  const handleSetupBankAccount = async (slot: 1 | 2) => {
    const form = slot === 1 ? bankAccount1Form : bankAccount2Form;
    if (!form.iban.trim() || !form.accountHolderName.trim()) {
      showToast('IBAN and account holder name are required', 'error');
      return;
    }

    if (slot === 1) setSavingBank1(true);
    else setSavingBank2(true);

    try {
      const { data, error } = await db.setupBankAccount({
        iban: form.iban.trim().replace(/\s/g, ''),
        accountHolderName: form.accountHolderName.trim(),
        bankAccountSlot: slot,
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      showToast(`Bank account ${slot} saved! (${data?.last4 ? `ending ${data.last4}` : 'confirmed'})`, 'success');
      if (slot === 1) setBankAccount1Form({ iban: '', accountHolderName: '' });
      else setBankAccount2Form({ iban: '', accountHolderName: '' });
      await loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save bank account', 'error');
    } finally {
      if (slot === 1) setSavingBank1(false);
      else setSavingBank2(false);
    }
  };

  // Group today's bookings by time slot
  const groupedBookings = todayBookings.reduce((groups: any, booking: any) => {
    const timeKey = booking.slots?.start_time
      ? `${format(new Date(booking.slots.start_time), 'HH:mm')} - ${format(new Date(booking.slots.end_time), 'HH:mm')}`
      : 'Unknown';
    if (!groups[timeKey]) groups[timeKey] = [];
    groups[timeKey].push(booking);
    return groups;
  }, {});

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.GOLD} />
      </View>
    );
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'schedule', label: 'Schedule' },
    { key: 'clients', label: 'Clients' },
    { key: 'pricing', label: 'Pricing' },
    { key: 'finance', label: 'Finance' },
    { key: 'settings', label: 'Settings' },
  ];

  return (
    <SafeAreaView style={styles.container}>

      {/* Toast Notification */}
      {toast && (
        <View style={[styles.toastContainer, toast.type === 'error' ? styles.toastError : styles.toastSuccess]}>
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Elevate Gym Admin</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Today Tab */}
        {activeTab === 'today' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Bookings</Text>
            <Text style={styles.sectionSubtitle}>
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </Text>

            {todayBookings.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color={COLORS.TEXT_MUTED} />
                <Text style={styles.emptyStateText}>No sessions scheduled for today</Text>
              </View>
            ) : (
              Object.entries(groupedBookings).map(([timeSlot, bookings]: [string, any]) => (
                <View key={timeSlot} style={styles.timeSlotGroup}>
                  <Text style={styles.timeSlotHeader}>{timeSlot}</Text>
                  {bookings.map((booking: any) => (
                    <View key={booking.id} style={styles.bookingCard}>
                      <View style={styles.bookingInfo}>
                        <Text style={styles.bookingName}>
                          {booking.client_profiles?.first_name} {booking.client_profiles?.last_name}
                        </Text>
                        <Text style={styles.bookingStatus}>
                          {booking.status === 'attended' ? 'Attended' : booking.status === 'no_show' ? 'No Show' : 'Booked'}
                        </Text>
                      </View>
                      {booking.status === 'confirmed' || booking.status === 'booked' ? (
                        <View style={styles.bookingActions}>
                          <TouchableOpacity
                            style={styles.attendedButton}
                            onPress={() => handleMarkAttended(booking.id)}
                          >
                            <Text style={styles.attendedButtonText}>Attended</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.noShowButton}
                            onPress={() => handleMarkNoShow(booking.id)}
                          >
                            <Text style={styles.noShowButtonText}>No-Show</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={[
                          styles.statusBadge,
                          booking.status === 'attended' ? styles.statusAttended : styles.statusNoShow,
                        ]}>
                          <Text style={styles.statusBadgeText}>
                            {booking.status === 'attended' ? 'Attended' : 'No Show'}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              ))
            )}
          </View>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <>
            <View style={styles.section}>
              <TouchableOpacity style={styles.goldButton} onPress={() => setShowWeeksModal(true)}>
                <Text style={styles.goldButtonText}>Create Weekly Slots</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Upcoming Sessions ({slots.length})</Text>
              {slots.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="calendar-outline" size={48} color={COLORS.TEXT_MUTED} />
                  <Text style={styles.emptyStateText}>No upcoming sessions</Text>
                </View>
              ) : (
                slots.map((slot) => (
                  <View key={slot.id} style={styles.slotCard}>
                    <View style={styles.slotInfo}>
                      <Text style={styles.slotDate}>
                        {format(new Date(slot.start_time), 'EEE, MMM d')}
                      </Text>
                      <Text style={styles.slotTime}>
                        {format(new Date(slot.start_time), 'h:mm a')} - {format(new Date(slot.end_time), 'h:mm a')}
                      </Text>
                    </View>
                    <View style={styles.slotStats}>
                      <Text style={styles.slotBooked}>
                        {slot.booked_count}/{slot.capacity}
                      </Text>
                      <Text style={styles.slotLabel}>booked</Text>
                    </View>
                    <View style={styles.slotActions}>
                      <TouchableOpacity
                        onPress={() => handleEditSlot(slot)}
                        style={styles.outlineButtonGold}
                      >
                        <Text style={styles.outlineButtonGoldText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteSlot(slot)}
                        style={styles.outlineButtonRed}
                      >
                        <Text style={styles.outlineButtonRedText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {/* Clients Tab */}
        {activeTab === 'clients' && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Clients ({clients.length})</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {clients.length > 0 && (
                  <TouchableOpacity
                    style={[styles.goldButtonSmall, selectMode && { backgroundColor: COLORS.BG_CARD }]}
                    onPress={() => {
                      setSelectMode(!selectMode);
                      setSelectedClientIds(new Set());
                    }}
                  >
                    <Text style={[styles.goldButtonSmallText, selectMode && { color: COLORS.TEXT_MUTED }]}>
                      {selectMode ? 'Cancel' : 'Select'}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.goldButtonSmall}
                  onPress={() => setShowAddClientModal(true)}
                >
                  <Text style={styles.goldButtonSmallText}>Add Client</Text>
                </TouchableOpacity>
              </View>
            </View>

            {selectMode && selectedClientIds.size > 0 && (
              <TouchableOpacity
                style={[styles.goldButtonSmall, { backgroundColor: COLORS.RED, marginBottom: 12, alignSelf: 'flex-start' }]}
                onPress={handleDeleteSelectedClients}
                disabled={deletingClients}
              >
                <Text style={[styles.goldButtonSmallText, { color: '#fff' }]}>
                  {deletingClients ? 'Deleting...' : `Delete Selected (${selectedClientIds.size})`}
                </Text>
              </TouchableOpacity>
            )}

            {clients.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color={COLORS.TEXT_MUTED} />
                <Text style={styles.emptyStateText}>No clients yet</Text>
              </View>
            ) : (
              clients.map((client) => {
                const isSelected = selectedClientIds.has(client.id);
                return (
                  <TouchableOpacity
                    key={client.id}
                    activeOpacity={selectMode ? 0.7 : 1}
                    onPress={selectMode ? () => {
                      const next = new Set(selectedClientIds);
                      if (isSelected) next.delete(client.id);
                      else next.add(client.id);
                      setSelectedClientIds(next);
                    } : undefined}
                    style={[styles.clientCard, isSelected && { borderColor: COLORS.RED, borderWidth: 1.5 }]}
                  >
                    {selectMode && (
                      <View style={{
                        width: 22, height: 22, borderRadius: 11,
                        borderWidth: 2, borderColor: isSelected ? COLORS.RED : COLORS.TEXT_MUTED,
                        backgroundColor: isSelected ? COLORS.RED : 'transparent',
                        alignItems: 'center', justifyContent: 'center', marginRight: 10,
                        alignSelf: 'center',
                      }}>
                        {isSelected && <Ionicons name="checkmark" size={13} color="#fff" />}
                      </View>
                    )}
                    <View style={styles.clientInfo}>
                      <Text style={styles.clientName}>
                        {client.first_name} {client.last_name}
                      </Text>
                      <Text style={styles.clientEmail}>{client.profiles?.email}</Text>
                      <View style={styles.clientCredits}>
                        <Ionicons
                          name="wallet"
                          size={14}
                          color={(client.credit_balances?.balance || 0) <= 2 ? COLORS.RED : COLORS.GOLD}
                        />
                        <Text style={[
                          styles.clientCreditsText,
                          (client.credit_balances?.balance || 0) <= 2 && styles.clientCreditsLow,
                        ]}>
                          {client.credit_balances?.balance || 0} credits
                        </Text>
                      </View>
                    </View>
                    {!selectMode && (
                      <View style={styles.clientActions}>
                        <TouchableOpacity
                          style={styles.outlineButtonWhite}
                          onPress={() => navigation.navigate('ClientDetails', { clientId: client.id })}
                        >
                          <Text style={styles.outlineButtonWhiteText}>View Details</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.outlineButtonGold}
                          onPress={() => adjustClientCredits(client)}
                        >
                          <Text style={styles.outlineButtonGoldText}>Adjust Credits</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* Pricing Tab */}
        {activeTab === 'pricing' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Credit Packs</Text>
            <Text style={styles.sectionSubtitle}>Configure pricing without code changes</Text>

            {creditPacks.map((pack) => (
              <View key={pack.id} style={styles.packCard}>
                <View style={styles.packInfo}>
                  <Text style={styles.packCredits}>{pack.credits} Credits</Text>
                  <Text style={styles.packPrice}>{'\u20AC'}{Math.round(pack.price / 100)}</Text>
                  {pack.discount_percent > 0 && (
                    <Text style={styles.packDiscount}>{pack.discount_percent}% off</Text>
                  )}
                </View>
                <View style={styles.packActions}>
                  <Text style={styles.packPerCredit}>
                    {'\u20AC'}{(pack.price / 100 / pack.credits).toFixed(0)}/session
                  </Text>
                  <TouchableOpacity
                    style={styles.outlineButtonGold}
                    onPress={() => handleEditPack(pack)}
                  >
                    <Text style={styles.outlineButtonGoldText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={styles.dashedButton}
              onPress={() => setShowAddPackModal(true)}
            >
              <Text style={styles.dashedButtonText}>Add New Pack</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Finance Tab */}
        {activeTab === 'finance' && (
          <View>
            {/* Revenue Overview */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Revenue Overview</Text>
              <Text style={styles.sectionSubtitle}>{format(new Date(), 'MMMM yyyy')}</Text>

              <View style={styles.revenueGrid}>
                <View style={styles.revenueCard}>
                  <Text style={styles.revenueLabel}>Today</Text>
                  <Text style={styles.revenueAmount}>€{(dailyRevenue / 100).toFixed(2)}</Text>
                </View>
                <View style={styles.revenueCard}>
                  <Text style={styles.revenueLabel}>This Week</Text>
                  <Text style={styles.revenueAmount}>€{(weeklyRevenue / 100).toFixed(2)}</Text>
                </View>
                <View style={styles.revenueCard}>
                  <Text style={styles.revenueLabel}>This Month</Text>
                  <Text style={styles.revenueAmount}>€{(monthlyRevenue / 100).toFixed(2)}</Text>
                </View>
                <View style={[styles.revenueCard, styles.revenueCardGold]}>
                  <Text style={styles.revenueLabel}>All Time</Text>
                  <Text style={[styles.revenueAmount, styles.revenueAmountGold]}>€{(totalRevenue / 100).toFixed(2)}</Text>
                </View>
              </View>
            </View>

            {/* Bank Accounts */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bank Accounts</Text>
              <Text style={styles.sectionSubtitle}>Payments alternate between these two accounts</Text>

              {/* Bank Account 1 */}
              <View style={styles.bankAccountBlock}>
                <View style={styles.bankAccountHeaderRow}>
                  <Text style={styles.bankAccountTitle}>Account 1</Text>
                  {savedBankAccounts.slot1 && (
                    <View style={styles.bankAccountBadge}>
                      <Text style={styles.bankAccountBadgeText}>Configured</Text>
                    </View>
                  )}
                </View>
                {savedBankAccounts.slot1 && (
                  <Text style={styles.bankAccountId}>ID: {savedBankAccounts.slot1}</Text>
                )}
                <Text style={styles.inputLabel}>IBAN</Text>
                <TextInput
                  style={styles.input}
                  placeholder="PT50 0000 0000 0000 0000 0000 0"
                  placeholderTextColor={COLORS.TEXT_MUTED}
                  autoCapitalize="characters"
                  value={bankAccount1Form.iban}
                  onChangeText={(t) => setBankAccount1Form({ ...bankAccount1Form, iban: t })}
                />
                <Text style={styles.inputLabel}>Account Holder Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Name on account"
                  placeholderTextColor={COLORS.TEXT_MUTED}
                  value={bankAccount1Form.accountHolderName}
                  onChangeText={(t) => setBankAccount1Form({ ...bankAccount1Form, accountHolderName: t })}
                />
                <TouchableOpacity
                  style={[styles.goldButton, savingBank1 && styles.buttonDisabled]}
                  onPress={() => handleSetupBankAccount(1)}
                  disabled={savingBank1}
                >
                  {savingBank1 ? (
                    <ActivityIndicator color={COLORS.BG_DARK} />
                  ) : (
                    <Text style={styles.goldButtonText}>{savedBankAccounts.slot1 ? 'Update Account 1' : 'Save Account 1'}</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Bank Account 2 */}
              <View style={[styles.bankAccountBlock, { marginTop: 16 }]}>
                <View style={styles.bankAccountHeaderRow}>
                  <Text style={styles.bankAccountTitle}>Account 2</Text>
                  {savedBankAccounts.slot2 && (
                    <View style={styles.bankAccountBadge}>
                      <Text style={styles.bankAccountBadgeText}>Configured</Text>
                    </View>
                  )}
                </View>
                {savedBankAccounts.slot2 && (
                  <Text style={styles.bankAccountId}>ID: {savedBankAccounts.slot2}</Text>
                )}
                <Text style={styles.inputLabel}>IBAN</Text>
                <TextInput
                  style={styles.input}
                  placeholder="PT50 0000 0000 0000 0000 0000 0"
                  placeholderTextColor={COLORS.TEXT_MUTED}
                  autoCapitalize="characters"
                  value={bankAccount2Form.iban}
                  onChangeText={(t) => setBankAccount2Form({ ...bankAccount2Form, iban: t })}
                />
                <Text style={styles.inputLabel}>Account Holder Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Name on account"
                  placeholderTextColor={COLORS.TEXT_MUTED}
                  value={bankAccount2Form.accountHolderName}
                  onChangeText={(t) => setBankAccount2Form({ ...bankAccount2Form, accountHolderName: t })}
                />
                <TouchableOpacity
                  style={[styles.goldButton, savingBank2 && styles.buttonDisabled]}
                  onPress={() => handleSetupBankAccount(2)}
                  disabled={savingBank2}
                >
                  {savingBank2 ? (
                    <ActivityIndicator color={COLORS.BG_DARK} />
                  ) : (
                    <Text style={styles.goldButtonText}>{savedBankAccounts.slot2 ? 'Update Account 2' : 'Save Account 2'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Recent Payments */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Payments</Text>
              {payments.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="card-outline" size={48} color={COLORS.TEXT_MUTED} />
                  <Text style={styles.emptyStateText}>No payments yet</Text>
                </View>
              ) : (
                payments.map((p: any) => (
                  <View key={p.id} style={styles.paymentRow}>
                    <View style={styles.paymentInfo}>
                      <Text style={styles.paymentName}>
                        {p.client_profiles?.first_name} {p.client_profiles?.last_name}
                      </Text>
                      <Text style={styles.paymentDate}>
                        {format(new Date(p.created_at), 'dd MMM yyyy, HH:mm')}
                      </Text>
                    </View>
                    <Text style={styles.paymentAmount}>€{(p.amount / 100).toFixed(2)}</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>App Settings</Text>
            <Text style={styles.sectionSubtitle}>Configure app behaviour</Text>

            <View style={styles.settingCard}>
              <Text style={styles.settingLabel}>Low Credit Threshold</Text>
              <Text style={styles.settingHint}>
                Users will be prompted to buy more sessions when their balance drops to this number or below
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 2"
                placeholderTextColor={COLORS.TEXT_MUTED}
                keyboardType="numeric"
                value={settingsForm.lowCreditThreshold}
                onChangeText={(text) => setSettingsForm({ ...settingsForm, lowCreditThreshold: text })}
              />
            </View>

            <View style={styles.settingCard}>
              <Text style={styles.settingLabel}>Cancellation Window (Hours)</Text>
              <Text style={styles.settingHint}>
                Clients must cancel at least this many hours before the session to keep their credit
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 48"
                placeholderTextColor={COLORS.TEXT_MUTED}
                keyboardType="numeric"
                value={settingsForm.cancellationWindowHours}
                onChangeText={(text) => setSettingsForm({ ...settingsForm, cancellationWindowHours: text })}
              />
            </View>

            <TouchableOpacity
              style={[styles.goldButton, savingSettings && styles.buttonDisabled]}
              onPress={handleSaveSettings}
              disabled={savingSettings}
            >
              {savingSettings ? (
                <ActivityIndicator color={COLORS.BG_DARK} />
              ) : (
                <Text style={styles.goldButtonText}>Save Settings</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Weeks Picker Modal */}
      <Modal visible={showWeeksModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Weekly Slots</Text>
              <TouchableOpacity onPress={() => setShowWeeksModal(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={28} color={COLORS.TEXT_WHITE} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>How many weeks of slots?</Text>
              {[4, 8, 12, 26].map((weeks) => (
                <TouchableOpacity
                  key={weeks}
                  style={styles.weeksOption}
                  onPress={() => createWeeklySlots(weeks)}
                >
                  <Text style={styles.weeksOptionText}>{weeks} weeks</Text>
                  <Text style={styles.weeksOptionSub}>~{weeks * 10} slots (Mon-Fri, 2/day)</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowWeeksModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Client Modal */}
      <Modal visible={showAddClientModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Client</Text>
              <TouchableOpacity onPress={() => setShowAddClientModal(false)}>
                <Ionicons name="close" size={28} color={COLORS.TEXT_WHITE} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                style={styles.input}
                placeholder="client@email.com"
                placeholderTextColor={COLORS.TEXT_MUTED}
                keyboardType="email-address"
                autoCapitalize="none"
                value={newClient.email}
                onChangeText={(text) => setNewClient({ ...newClient, email: text })}
              />

              <Text style={styles.inputLabel}>First Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="First name"
                placeholderTextColor={COLORS.TEXT_MUTED}
                value={newClient.firstName}
                onChangeText={(text) => setNewClient({ ...newClient, firstName: text })}
              />

              <Text style={styles.inputLabel}>Last Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Last name"
                placeholderTextColor={COLORS.TEXT_MUTED}
                value={newClient.lastName}
                onChangeText={(text) => setNewClient({ ...newClient, lastName: text })}
              />

              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="+351 ..."
                placeholderTextColor={COLORS.TEXT_MUTED}
                keyboardType="phone-pad"
                value={newClient.phone}
                onChangeText={(text) => setNewClient({ ...newClient, phone: text })}
              />

              <Text style={styles.inputLabel}>Date of Birth</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.TEXT_MUTED}
                value={newClient.dateOfBirth}
                onChangeText={(text) => setNewClient({ ...newClient, dateOfBirth: text })}
              />

              <Text style={styles.inputLabel}>Gender</Text>
              <View style={styles.genderRow}>
                {['male', 'female'].map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.genderButton, newClient.gender === g && styles.genderButtonActive]}
                    onPress={() => setNewClient({ ...newClient, gender: g })}
                  >
                    <Text style={[styles.genderButtonText, newClient.gender === g && styles.genderButtonTextActive]}>
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputHint}>
                A welcome email with login details will be sent to the client. They will be prompted to change their password on first login.
              </Text>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowAddClientModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalGoldButton, addingClient && styles.buttonDisabled]}
                onPress={handleAddClient}
                disabled={addingClient}
              >
                {addingClient ? (
                  <ActivityIndicator color={COLORS.BG_DARK} />
                ) : (
                  <Text style={styles.modalGoldButtonText}>Create Client</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Adjust Credits Modal */}
      <Modal visible={showAdjustCreditsModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adjust Credits</Text>
              <TouchableOpacity onPress={() => setShowAdjustCreditsModal(false)}>
                <Ionicons name="close" size={28} color={COLORS.TEXT_WHITE} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {selectedClient && (
                <>
                  <Text style={styles.modalClientName}>
                    {selectedClient.first_name} {selectedClient.last_name}
                  </Text>
                  <Text style={styles.modalClientBalance}>
                    Current Balance: {selectedClient.credit_balances?.balance || 0} credits
                  </Text>
                </>
              )}

              <Text style={styles.inputLabel}>Credits to Add/Subtract *</Text>
              <Text style={styles.inputHint}>Use positive numbers to add, negative to subtract (e.g., -5)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 10 or -5"
                placeholderTextColor={COLORS.TEXT_MUTED}
                keyboardType="numeric"
                value={adjustCreditsAmount}
                onChangeText={setAdjustCreditsAmount}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowAdjustCreditsModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalGoldButton}
                onPress={handleAdjustCredits}
              >
                <Text style={styles.modalGoldButtonText}>Adjust Credits</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Pack Modal */}
      <Modal visible={showAddPackModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Credit Pack</Text>
              <TouchableOpacity onPress={() => setShowAddPackModal(false)}>
                <Ionicons name="close" size={28} color={COLORS.TEXT_WHITE} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Number of Credits *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 10"
                placeholderTextColor={COLORS.TEXT_MUTED}
                keyboardType="number-pad"
                value={newPack.credits}
                onChangeText={(text) => setNewPack({ ...newPack, credits: text })}
              />

              <Text style={styles.inputLabel}>Price ({'\u20AC'}) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 50.00"
                placeholderTextColor={COLORS.TEXT_MUTED}
                keyboardType="decimal-pad"
                value={newPack.price}
                onChangeText={(text) => setNewPack({ ...newPack, price: text })}
              />

              <Text style={styles.inputLabel}>Discount % (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 10"
                placeholderTextColor={COLORS.TEXT_MUTED}
                keyboardType="number-pad"
                value={newPack.discount}
                onChangeText={(text) => setNewPack({ ...newPack, discount: text })}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowAddPackModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalGoldButton, creating && styles.buttonDisabled]}
                onPress={handleCreatePack}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color={COLORS.BG_DARK} />
                ) : (
                  <Text style={styles.modalGoldButtonText}>Create Pack</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Pack Modal */}
      <Modal visible={showEditPackModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Credit Pack</Text>
              <TouchableOpacity onPress={() => setShowEditPackModal(false)}>
                <Ionicons name="close" size={28} color={COLORS.TEXT_WHITE} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Number of Credits *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 10"
                placeholderTextColor={COLORS.TEXT_MUTED}
                keyboardType="number-pad"
                value={editPackForm.credits}
                onChangeText={(text) => setEditPackForm({ ...editPackForm, credits: text })}
              />

              <Text style={styles.inputLabel}>Price ({'\u20AC'}) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 50"
                placeholderTextColor={COLORS.TEXT_MUTED}
                keyboardType="decimal-pad"
                value={editPackForm.price}
                onChangeText={(text) => setEditPackForm({ ...editPackForm, price: text })}
              />

              <Text style={styles.inputLabel}>Discount %</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 10"
                placeholderTextColor={COLORS.TEXT_MUTED}
                keyboardType="number-pad"
                value={editPackForm.discount}
                onChangeText={(text) => setEditPackForm({ ...editPackForm, discount: text })}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowEditPackModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalGoldButton, creating && styles.buttonDisabled]}
                onPress={handleUpdatePack}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color={COLORS.BG_DARK} />
                ) : (
                  <Text style={styles.modalGoldButtonText}>Update Pack</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Slot Modal */}
      <Modal visible={showSlotModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Slot</Text>
              <TouchableOpacity onPress={() => { setShowSlotModal(false); setSelectedSlot(null); }}>
                <Ionicons name="close" size={28} color={COLORS.TEXT_WHITE} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Start Time</Text>
              <TextInput
                style={styles.input}
                value={slotForm.startTime}
                onChangeText={(text) => setSlotForm({ ...slotForm, startTime: text })}
                placeholder="YYYY-MM-DD HH:MM"
                placeholderTextColor={COLORS.TEXT_MUTED}
              />

              <Text style={styles.inputLabel}>End Time</Text>
              <TextInput
                style={styles.input}
                value={slotForm.endTime}
                onChangeText={(text) => setSlotForm({ ...slotForm, endTime: text })}
                placeholder="YYYY-MM-DD HH:MM"
                placeholderTextColor={COLORS.TEXT_MUTED}
              />

              <Text style={styles.inputLabel}>Capacity</Text>
              <TextInput
                style={styles.input}
                value={slotForm.capacity}
                onChangeText={(text) => setSlotForm({ ...slotForm, capacity: text })}
                placeholder="6"
                placeholderTextColor={COLORS.TEXT_MUTED}
                keyboardType="number-pad"
              />

              {selectedSlot && selectedSlot.booked_count > 0 && (
                <Text style={styles.warningText}>
                  This slot has {selectedSlot.booked_count} booking(s). Clients will be notified of changes.
                </Text>
              )}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => { setShowSlotModal(false); setSelectedSlot(null); }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalGoldButton}
                onPress={handleUpdateSlot}
              >
                <Text style={styles.modalGoldButtonText}>Update Slot</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BG_DARK,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BG_DARK,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.BG_CARD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.TEXT_WHITE,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.GOLD,
  },

  // Tab Bar
  tabBar: {
    backgroundColor: COLORS.BG_CARD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
    flexGrow: 0,
  },
  tabBarContent: {
    paddingHorizontal: 12,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.GOLD,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.TEXT_MUTED,
  },
  tabTextActive: {
    color: COLORS.GOLD,
    fontWeight: '600',
  },

  // Scroll
  scrollView: {
    flex: 1,
    paddingTop: 16,
  },
  scrollContent: {
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 32,
  },

  // Sections
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.BG_CARD,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT_WHITE,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.TEXT_MUTED,
    marginBottom: 16,
  },

  // Buttons
  goldButton: {
    backgroundColor: COLORS.GOLD,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  goldButtonText: {
    color: COLORS.BG_DARK,
    fontSize: 16,
    fontWeight: '600',
  },
  goldButtonSmall: {
    backgroundColor: COLORS.GOLD,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  goldButtonSmallText: {
    color: COLORS.BG_DARK,
    fontSize: 14,
    fontWeight: '600',
  },
  outlineButtonGold: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(200, 169, 78, 0.1)',
    borderWidth: 1,
    borderColor: COLORS.GOLD,
  },
  outlineButtonGoldText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.GOLD,
  },
  outlineButtonRed: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: COLORS.RED,
  },
  outlineButtonRedText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.RED,
  },
  outlineButtonWhite: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  outlineButtonWhiteText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.TEXT_WHITE,
  },
  dashedButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.BG_DARK,
    borderRadius: 10,
    padding: 14,
    borderWidth: 2,
    borderColor: COLORS.BORDER,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  dashedButtonText: {
    fontSize: 15,
    color: COLORS.GOLD,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#4a4a4a',
  },

  // Today tab
  timeSlotGroup: {
    marginBottom: 16,
  },
  timeSlotHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.GOLD,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  bookingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.BG_DARK,
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.TEXT_WHITE,
  },
  bookingStatus: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  bookingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  attendedButton: {
    backgroundColor: COLORS.GREEN,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  attendedButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.TEXT_WHITE,
  },
  noShowButton: {
    backgroundColor: COLORS.RED,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  noShowButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.TEXT_WHITE,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusAttended: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusNoShow: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.TEXT_MUTED,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 15,
    color: COLORS.TEXT_MUTED,
    marginTop: 12,
  },

  // Slot cards
  slotCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.BG_DARK,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  slotInfo: {
    flex: 1,
  },
  slotDate: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.TEXT_WHITE,
  },
  slotTime: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  slotStats: {
    alignItems: 'flex-end',
    marginRight: 10,
  },
  slotBooked: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.GOLD,
  },
  slotLabel: {
    fontSize: 11,
    color: COLORS.TEXT_MUTED,
  },
  slotActions: {
    flexDirection: 'row',
    gap: 6,
  },

  // Client cards
  clientCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.BG_DARK,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.TEXT_WHITE,
  },
  clientEmail: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  clientCredits: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  clientCreditsText: {
    fontSize: 13,
    color: COLORS.GOLD,
    fontWeight: '500',
  },
  clientCreditsLow: {
    color: COLORS.RED,
    fontWeight: '600',
  },
  clientActions: {
    flexDirection: 'column',
    gap: 6,
    alignItems: 'flex-end',
  },

  // Pack cards
  packCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.BG_DARK,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  packInfo: {
    flex: 1,
  },
  packCredits: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.TEXT_WHITE,
  },
  packPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.GOLD,
    marginTop: 4,
  },
  packDiscount: {
    fontSize: 12,
    color: COLORS.GREEN,
    fontWeight: '600',
    marginTop: 4,
  },
  packActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  packPerCredit: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
  },

  // Settings
  settingCard: {
    backgroundColor: COLORS.BG_DARK,
    padding: 16,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.TEXT_WHITE,
    marginBottom: 4,
  },
  settingHint: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    marginBottom: 12,
    lineHeight: 18,
  },

  // Inputs
  input: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: COLORS.BG_DARK,
    color: COLORS.TEXT_WHITE,
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_WHITE,
    marginBottom: 6,
    marginTop: 12,
  },
  inputHint: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginTop: 4,
    marginBottom: 8,
  },

  // Weeks picker
  weeksOption: {
    backgroundColor: COLORS.BG_DARK,
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  weeksOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_WHITE,
  },
  weeksOptionSub: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },

  // Gender buttons
  genderRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    alignItems: 'center',
    backgroundColor: COLORS.BG_DARK,
  },
  genderButtonActive: {
    borderColor: COLORS.GOLD,
    backgroundColor: 'rgba(200, 169, 78, 0.1)',
  },
  genderButtonText: {
    fontSize: 14,
    color: COLORS.TEXT_MUTED,
  },
  genderButtonTextActive: {
    color: COLORS.GOLD,
    fontWeight: '600',
  },

  // Toast
  toastContainer: {
    position: 'absolute',
    bottom: 32,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 10,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  toastSuccess: {
    backgroundColor: '#10b981',
  },
  toastError: {
    backgroundColor: '#ef4444',
  },
  toastText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Finance
  revenueGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  revenueCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.BG_DARK,
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    alignItems: 'center',
  },
  revenueCardGold: {
    borderColor: COLORS.GOLD_DIM,
  },
  revenueLabel: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  revenueAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.TEXT_WHITE,
  },
  revenueAmountGold: {
    color: COLORS.GOLD,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentName: {
    fontSize: 15,
    color: COLORS.TEXT_WHITE,
    fontWeight: '500',
  },
  paymentDate: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.GREEN,
  },
  bankAccountBlock: {
    backgroundColor: COLORS.BG_DARK,
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  bankAccountHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  bankAccountTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_WHITE,
  },
  bankAccountBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.GREEN,
  },
  bankAccountBadgeText: {
    fontSize: 11,
    color: COLORS.GREEN,
    fontWeight: '600',
  },
  bankAccountId: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginBottom: 12,
    fontFamily: 'monospace',
  },

  // Warning
  warningText: {
    fontSize: 13,
    color: COLORS.GOLD,
    backgroundColor: 'rgba(200, 169, 78, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.GOLD_DIM,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.OVERLAY,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.BG_CARD,
    borderRadius: 14,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT_WHITE,
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  modalCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.TEXT_MUTED,
  },
  modalGoldButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: COLORS.GOLD,
    alignItems: 'center',
  },
  modalGoldButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.BG_DARK,
  },
  modalClientName: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.TEXT_WHITE,
    marginBottom: 6,
  },
  modalClientBalance: {
    fontSize: 14,
    color: COLORS.TEXT_MUTED,
    marginBottom: 16,
  },
});

export default AdminScreen;
