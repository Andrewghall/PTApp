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
import { HamburgerButton, HamburgerMenu } from '../components/HamburgerMenu';

// Brand colors
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
  OVERLAY: 'rgba(0, 0, 0, 0.8)',
};

interface AdminScreenProps {
  navigation: any;
}

const AdminScreen: React.FC<AdminScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'clients' | 'packs' | 'attendance' | 'settings'>('overview');
  const [todayBookings, setTodayBookings] = useState<any[]>([]);
  const [appSettings, setAppSettings] = useState<any>({});
  const [settingsForm, setSettingsForm] = useState({ lowCreditThreshold: '', cancellationWindowHours: '' });
  const [savingSettings, setSavingSettings] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [creditPacks, setCreditPacks] = useState<any[]>([]);
  const [showAddSlotModal, setShowAddSlotModal] = useState(false);
  const [showAddPackModal, setShowAddPackModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [businessMetrics, setBusinessMetrics] = useState<any>(null);
  const [newPack, setNewPack] = useState({ credits: '', price: '', discount: '' });
  const [creating, setCreating] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showAdjustCreditsModal, setShowAdjustCreditsModal] = useState(false);
  const [adjustCreditsAmount, setAdjustCreditsAmount] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [showEditPackModal, setShowEditPackModal] = useState(false);
  const [selectedPack, setSelectedPack] = useState<any>(null);
  const [editPackForm, setEditPackForm] = useState({ credits: '', price: '', discount: '' });

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

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      // Load business metrics for overview
      const { data: metrics } = await db.getBusinessMetrics();
      setBusinessMetrics(metrics);

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

  const createWeeklySlots = async () => {
    Alert.alert(
      'Create Weekly Schedule',
      'This will create slots for the next 4 weeks. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: async () => {
            try {
              const slotsToCreate = [];
              const startDate = new Date();

              // Create slots for 4 weeks (Mon-Fri)
              for (let week = 0; week < 4; week++) {
                for (let day = 0; day < 5; day++) {
                  // Mon-Fri
                  const slotDate = addDays(startDate, week * 7 + day);
                  if (slotDate.getDay() === 0 || slotDate.getDay() === 6) continue; // Skip weekends

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

              Alert.alert('Success', `Created ${slotsToCreate.length} slots`);
              loadAdminData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to create slots');
            }
          },
        },
      ]
    );
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
        // Subtract credits
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
        parseFloat(newPack.price) * 100, // Convert euros to cents
        parseFloat(newPack.discount || '0')
      );

      if (error) throw error;

      Alert.alert('Success', 'Credit pack created!');
      setShowAddPackModal(false);
      setNewPack({ credits: '', price: '', discount: '' });
      await loadAdminData(); // Refresh packs list
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
      price: (pack.price / 100).toString(), // Convert cents to euros for display
      discount: pack.discount_percent?.toString() || '0'
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
          price: parseFloat(editPackForm.price) * 100, // Convert euros to cents
          discount_percent: parseFloat(editPackForm.discount || '0')
        })
        .eq('id', selectedPack.id);

      if (error) throw error;

      Alert.alert('Success', 'Credit pack updated!');
      setShowEditPackModal(false);
      setSelectedPack(null);
      setEditPackForm({ credits: '', price: '', discount: '' });
      await loadAdminData(); // Refresh packs list
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update pack');
    } finally {
      setCreating(false);
    }
  };

  // Slot management handlers
  const handleEditSlot = (slot: any) => {
    setSelectedSlot(slot);
    setSlotForm({
      startTime: format(new Date(slot.start_time), 'yyyy-MM-dd\'T\'HH:mm'),
      endTime: format(new Date(slot.end_time), 'yyyy-MM-dd\'T\'HH:mm'),
      capacity: slot.capacity.toString()
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

      // Check if times changed for reschedule
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
          }
        }
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

      if (error) throw new Error(error.message || 'Failed to create client');

      const message = data?.emailSent
        ? `Account created for ${newClient.firstName}! A welcome email has been sent to ${newClient.email} with their login details.`
        : `Account created for ${newClient.firstName}!\n\nTemporary password: ${data?.tempPassword}\n\nPlease share this with the client securely. They will be prompted to change it on first login.`;

      Alert.alert('Client Created', message);

      setShowAddClientModal(false);
      setNewClient({ email: '', firstName: '', lastName: '', phone: '', dateOfBirth: '', gender: '' });
      await loadAdminData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create client');
    } finally {
      setAddingClient(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.GOLD} />
      </View>
    );
  }

  const getActiveTabTitle = () => {
    switch (activeTab) {
      case 'overview': return 'Overview';
      case 'schedule': return 'Schedule';
      case 'clients': return 'Clients';
      case 'packs': return 'Pricing';
      case 'attendance': return 'Attendance';
      case 'settings': return 'Settings';
      default: return 'Admin Portal';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header - clean, no banner */}
      <View style={styles.headerContainer}>
        <HamburgerButton onPress={() => setMenuVisible(true)} />
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Admin Portal</Text>
        </View>
      </View>

      {/* Tab Bar - Compact, sticky */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Ionicons name="stats-chart" size={16} color={activeTab === 'overview' ? COLORS.GOLD : COLORS.TEXT_MUTED} />
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'schedule' && styles.tabActive]}
          onPress={() => setActiveTab('schedule')}
        >
          <Ionicons name="calendar" size={16} color={activeTab === 'schedule' ? COLORS.GOLD : COLORS.TEXT_MUTED} />
          <Text style={[styles.tabText, activeTab === 'schedule' && styles.tabTextActive]}>Schedule</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'clients' && styles.tabActive]}
          onPress={() => setActiveTab('clients')}
        >
          <Ionicons name="people" size={16} color={activeTab === 'clients' ? COLORS.GOLD : COLORS.TEXT_MUTED} />
          <Text style={[styles.tabText, activeTab === 'clients' && styles.tabTextActive]}>Clients</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'packs' && styles.tabActive]}
          onPress={() => setActiveTab('packs')}
        >
          <Ionicons name="pricetag" size={16} color={activeTab === 'packs' ? COLORS.GOLD : COLORS.TEXT_MUTED} />
          <Text style={[styles.tabText, activeTab === 'packs' && styles.tabTextActive]}>Pricing</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'attendance' && styles.tabActive]}
          onPress={() => setActiveTab('attendance')}
        >
          <Ionicons name="checkmark-circle" size={16} color={activeTab === 'attendance' ? COLORS.GOLD : COLORS.TEXT_MUTED} />
          <Text style={[styles.tabText, activeTab === 'attendance' && styles.tabTextActive]}>Attendance</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'settings' && styles.tabActive]}
          onPress={() => setActiveTab('settings')}
        >
          <Ionicons name="cog" size={16} color={activeTab === 'settings' ? COLORS.GOLD : COLORS.TEXT_MUTED} />
          <Text style={[styles.tabText, activeTab === 'settings' && styles.tabTextActive]}>Settings</Text>
        </TouchableOpacity>
      </ScrollView>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Business Overview</Text>
              <Text style={styles.sectionSubtitle}>Key performance indicators</Text>

              {businessMetrics ? (
                <>
                  {/* KPI Grid */}
                  <View style={styles.kpiGrid}>
                    {/* Total Clients */}
                    <View style={styles.kpiCard}>
                      <View style={[styles.kpiIconContainer, { backgroundColor: 'rgba(200, 169, 78, 0.15)' }]}>
                        <Ionicons name="people" size={28} color={COLORS.GOLD} />
                      </View>
                      <Text style={styles.kpiValue}>{businessMetrics.totalClients || 0}</Text>
                      <Text style={styles.kpiLabel}>Total Clients</Text>
                    </View>

                    {/* Monthly Revenue */}
                    <View style={styles.kpiCard}>
                      <View style={[styles.kpiIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                        <Ionicons name="wallet" size={28} color={COLORS.GREEN} />
                      </View>
                      <Text style={styles.kpiValue}>{'\u20AC'}{businessMetrics.monthlyRevenue || 0}</Text>
                      <Text style={styles.kpiLabel}>Monthly Revenue</Text>
                    </View>

                    {/* Attendance Rate */}
                    <View style={styles.kpiCard}>
                      <View style={[styles.kpiIconContainer, { backgroundColor: 'rgba(200, 169, 78, 0.15)' }]}>
                        <Ionicons name="checkmark-circle" size={28} color={COLORS.GOLD} />
                      </View>
                      <Text style={styles.kpiValue}>{businessMetrics.attendanceRate || 0}%</Text>
                      <Text style={styles.kpiLabel}>Attendance Rate</Text>
                    </View>

                  </View>

                  {/* Block Bookings Button */}
                  <TouchableOpacity
                    style={styles.blockBookingsButton}
                    onPress={() => navigation.navigate('BlockBookings')}
                  >
                    <Ionicons name="repeat" size={24} color={COLORS.BG_DARK} />
                    <Text style={styles.blockBookingsButtonText}>Manage Block Bookings</Text>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.BG_DARK} />
                  </TouchableOpacity>

                  {/* Programme Assignments Button */}
                  <TouchableOpacity
                    style={[styles.blockBookingsButton, { backgroundColor: COLORS.GOLD_DIM }]}
                    onPress={() => navigation.navigate('ProgrammeAssignments')}
                  >
                    <Ionicons name="fitness" size={24} color={COLORS.BG_DARK} />
                    <Text style={styles.blockBookingsButtonText}>Programme Assignments</Text>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.BG_DARK} />
                  </TouchableOpacity>

                  {/* Client Messages Button */}
                  <TouchableOpacity
                    style={[styles.blockBookingsButton, { backgroundColor: COLORS.GREEN }]}
                    onPress={() => navigation.navigate('Messages')}
                  >
                    <Ionicons name="chatbubbles" size={24} color={COLORS.BG_DARK} />
                    <Text style={styles.blockBookingsButtonText}>Client Messages</Text>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.BG_DARK} />
                  </TouchableOpacity>

                  {/* Quick Stats */}
                  <View style={styles.quickStatsContainer}>
                    <Text style={styles.quickStatsTitle}>Quick Stats</Text>

                    <View style={styles.quickStatRow}>
                      <Ionicons name="calendar-outline" size={20} color={COLORS.TEXT_MUTED} />
                      <Text style={styles.quickStatLabel}>Upcoming Sessions</Text>
                      <Text style={styles.quickStatValue}>{slots.length}</Text>
                    </View>

                    <View style={styles.quickStatRow}>
                      <Ionicons name="person-outline" size={20} color={COLORS.TEXT_MUTED} />
                      <Text style={styles.quickStatLabel}>Active Clients</Text>
                      <Text style={styles.quickStatValue}>{clients.length}</Text>
                    </View>

                    <View style={styles.quickStatRow}>
                      <Ionicons name="trending-up-outline" size={20} color={COLORS.TEXT_MUTED} />
                      <Text style={styles.quickStatLabel}>Session Capacity</Text>
                      <Text style={styles.quickStatValue}>
                        {slots.reduce((sum, s) => sum + s.booked_count, 0)}/
                        {slots.reduce((sum, s) => sum + s.capacity, 0)}
                      </Text>
                    </View>
                  </View>

                </>
              ) : (
                <View style={styles.emptyMetrics}>
                  <ActivityIndicator size="large" color={COLORS.GOLD} />
                  <Text style={styles.emptyMetricsText}>Loading metrics...</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <>
            <View style={styles.actionBar}>
              <TouchableOpacity style={styles.primaryButton} onPress={createWeeklySlots}>
                <Ionicons name="add-circle" size={20} color={COLORS.BG_DARK} />
                <Text style={styles.primaryButtonText}>Create Weekly Slots</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Upcoming Sessions ({slots.length})</Text>
              {slots.map((slot) => (
                <View key={slot.id} style={styles.slotCard}>
                  <View style={styles.slotInfo}>
                    <Text style={styles.slotDate}>
                      {format(new Date(slot.start_time), 'EEE, MMM d')}
                    </Text>
                    <Text style={styles.slotTime}>
                      {format(new Date(slot.start_time), 'h:mm a')} -{' '}
                      {format(new Date(slot.end_time), 'h:mm a')}
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
                      style={styles.slotActionButtonEdit}
                    >
                      <Text style={styles.slotActionButtonEditText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteSlot(slot)}
                      style={styles.slotActionButtonDelete}
                    >
                      <Text style={styles.slotActionButtonDeleteText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Clients Tab */}
        {activeTab === 'clients' && (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.sectionTitle}>All Clients ({clients.length})</Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => setShowAddClientModal(true)}
              >
                <Ionicons name="person-add" size={18} color={COLORS.BG_DARK} />
                <Text style={styles.primaryButtonText}>Add Client</Text>
              </TouchableOpacity>
            </View>
            {clients.map((client) => (
              <View key={client.id} style={styles.clientCard}>
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>
                    {client.first_name} {client.last_name}
                  </Text>
                  <Text style={styles.clientEmail}>{client.profiles?.email}</Text>
                  <View style={styles.clientCredits}>
                    <Ionicons name="wallet" size={16} color={(client.credit_balances?.balance || 0) <= 2 ? COLORS.RED : COLORS.GOLD} />
                    <Text style={[
                      styles.clientCreditsText,
                      (client.credit_balances?.balance || 0) <= 2 && { color: COLORS.RED, fontWeight: "600" }
                    ]}>
                      {client.credit_balances?.balance || 0} credits
                      {(client.credit_balances?.balance || 0) <= 2 && " !!!"}
                    </Text>
                  </View>
                </View>
                <View style={styles.clientActions}>
                  <TouchableOpacity
                    style={styles.viewDetailsButton}
                    onPress={() => navigation.navigate('ClientDetails', { clientId: client.id })}
                  >
                    <Text style={styles.viewDetailsButtonText}>View Details</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.adjustButton}
                    onPress={() => adjustClientCredits(client)}
                  >
                    <Text style={styles.adjustButtonText}>Adjust Credits</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Pricing Tab */}
        {activeTab === 'packs' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Credit Packs</Text>
            <Text style={styles.sectionSubtitle}>
              Configure pricing without code changes
            </Text>

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
                  <Text style={styles.packPerCredit}>{'\u20AC'}25/session</Text>
                  <TouchableOpacity
                    style={styles.editPackButton}
                    onPress={() => handleEditPack(pack)}
                  >
                    <Text style={styles.editPackButtonText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={styles.addPackButton}
              onPress={() => setShowAddPackModal(true)}
            >
              <Ionicons name="add-circle-outline" size={20} color={COLORS.GOLD} />
              <Text style={styles.addPackText}>Add New Pack</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Sessions</Text>
            <Text style={styles.sectionSubtitle}>
              Confirm who attended today's sessions
            </Text>

            {todayBookings.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color={COLORS.TEXT_MUTED} />
                <Text style={styles.emptyStateText}>No sessions scheduled for today</Text>
              </View>
            ) : (
              todayBookings.map((booking: any) => (
                <View key={booking.id} style={styles.attendanceCard}>
                  <View style={styles.attendanceInfo}>
                    <Text style={styles.attendanceName}>
                      {booking.client_profiles?.first_name} {booking.client_profiles?.last_name}
                    </Text>
                    <Text style={styles.attendanceTime}>
                      {booking.slots?.start_time ? format(new Date(booking.slots.start_time), 'HH:mm') : ''} - {booking.slots?.end_time ? format(new Date(booking.slots.end_time), 'HH:mm') : ''}
                    </Text>
                  </View>
                  <View style={styles.attendanceActions}>
                    <TouchableOpacity
                      style={styles.attendedButton}
                      onPress={() => handleMarkAttended(booking.id)}
                    >
                      <Ionicons name="checkmark" size={20} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.noShowButton}
                      onPress={() => handleMarkNoShow(booking.id)}
                    >
                      <Ionicons name="close" size={20} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>App Settings</Text>
            <Text style={styles.sectionSubtitle}>
              Configure app behaviour
            </Text>

            <View style={styles.settingCard}>
              <Text style={styles.settingLabel}>Low Credit Threshold</Text>
              <Text style={styles.settingHint}>
                Users will be prompted to buy more sessions when their balance drops to this number or below
              </Text>
              <TextInput
                style={styles.modalInput}
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
                style={styles.modalInput}
                placeholder="e.g., 48"
                placeholderTextColor={COLORS.TEXT_MUTED}
                keyboardType="numeric"
                value={settingsForm.cancellationWindowHours}
                onChangeText={(text) => setSettingsForm({ ...settingsForm, cancellationWindowHours: text })}
              />
            </View>

            <TouchableOpacity
              style={[styles.modalCreateButton, savingSettings && styles.buyButtonDisabled]}
              onPress={handleSaveSettings}
              disabled={savingSettings}
            >
              {savingSettings ? (
                <ActivityIndicator color={COLORS.BG_DARK} />
              ) : (
                <Text style={styles.modalCreateButtonText}>Save Settings</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Add Client Modal */}
      <Modal visible={showAddClientModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Client</Text>
              <TouchableOpacity onPress={() => setShowAddClientModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.TEXT_MUTED} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalLabel}>Email *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="client@email.com"
                placeholderTextColor={COLORS.TEXT_MUTED}
                keyboardType="email-address"
                autoCapitalize="none"
                value={newClient.email}
                onChangeText={(text) => setNewClient({ ...newClient, email: text })}
              />

              <Text style={styles.modalLabel}>First Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="First name"
                placeholderTextColor={COLORS.TEXT_MUTED}
                value={newClient.firstName}
                onChangeText={(text) => setNewClient({ ...newClient, firstName: text })}
              />

              <Text style={styles.modalLabel}>Last Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Last name"
                placeholderTextColor={COLORS.TEXT_MUTED}
                value={newClient.lastName}
                onChangeText={(text) => setNewClient({ ...newClient, lastName: text })}
              />

              <Text style={styles.modalLabel}>Phone</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="+351 ..."
                placeholderTextColor={COLORS.TEXT_MUTED}
                keyboardType="phone-pad"
                value={newClient.phone}
                onChangeText={(text) => setNewClient({ ...newClient, phone: text })}
              />

              <Text style={styles.modalLabel}>Date of Birth</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.TEXT_MUTED}
                value={newClient.dateOfBirth}
                onChangeText={(text) => setNewClient({ ...newClient, dateOfBirth: text })}
              />

              <Text style={styles.modalLabel}>Gender</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {['male', 'female', 'other'].map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.genderButton,
                      newClient.gender === g && styles.genderButtonActive,
                    ]}
                    onPress={() => setNewClient({ ...newClient, gender: g })}
                  >
                    <Text style={[
                      styles.genderButtonText,
                      newClient.gender === g && styles.genderButtonTextActive,
                    ]}>
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={{ fontSize: 12, color: COLORS.TEXT_MUTED, marginBottom: 16 }}>
                A welcome email with login details will be sent to the client. They will be prompted to change their password on first login.
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalCreateButton, { margin: 20 }, addingClient && styles.buyButtonDisabled]}
              onPress={handleAddClient}
              disabled={addingClient}
            >
              {addingClient ? (
                <ActivityIndicator color={COLORS.BG_DARK} />
              ) : (
                <Text style={styles.modalCreateButtonText}>Create Client Account</Text>
              )}
            </TouchableOpacity>
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
                <Text style={styles.closeButtonText}>{'\u2715'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {selectedClient && (
                <>
                  <Text style={styles.clientModalName}>
                    {selectedClient.first_name} {selectedClient.last_name}
                  </Text>
                  <Text style={styles.currentBalanceText}>
                    Current Balance: {selectedClient.credit_balances?.balance || 0} credits
                  </Text>
                </>
              )}

              <Text style={styles.inputLabel}>Credits to Add/Subtract *</Text>
              <Text style={styles.inputHint}>Use positive numbers to add, negative to subtract (e.g., -5)</Text>
              <TextInput
                style={styles.modalInput}
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
                style={styles.modalCreateButton}
                onPress={handleAdjustCredits}
              >
                <Text style={styles.modalCreateButtonText}>Adjust Credits</Text>
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
                <Ionicons name="close" size={28} color={COLORS.TEXT_MUTED} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Number of Credits *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., 10"
                placeholderTextColor={COLORS.TEXT_MUTED}
                keyboardType="number-pad"
                value={newPack.credits}
                onChangeText={(text) => setNewPack({...newPack, credits: text})}
              />

              <Text style={styles.inputLabel}>Price ({'\u20AC'}) *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., 50.00"
                placeholderTextColor={COLORS.TEXT_MUTED}
                keyboardType="decimal-pad"
                value={newPack.price}
                onChangeText={(text) => setNewPack({...newPack, price: text})}
              />

              <Text style={styles.inputLabel}>Discount % (optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., 10"
                placeholderTextColor={COLORS.TEXT_MUTED}
                keyboardType="number-pad"
                value={newPack.discount}
                onChangeText={(text) => setNewPack({...newPack, discount: text})}
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
                style={styles.modalCreateButton}
                onPress={handleCreatePack}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color={COLORS.BG_DARK} />
                ) : (
                  <Text style={styles.modalCreateButtonText}>Create Pack</Text>
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
                <Text style={styles.closeButtonText}>{'\u2715'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Number of Credits *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., 10"
                placeholderTextColor={COLORS.TEXT_MUTED}
                keyboardType="number-pad"
                value={editPackForm.credits}
                onChangeText={(text) => setEditPackForm({...editPackForm, credits: text})}
              />

              <Text style={styles.inputLabel}>Price ({'\u20AC'}) *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., 50"
                placeholderTextColor={COLORS.TEXT_MUTED}
                keyboardType="decimal-pad"
                value={editPackForm.price}
                onChangeText={(text) => setEditPackForm({...editPackForm, price: text})}
              />

              <Text style={styles.inputLabel}>Discount %</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., 10"
                placeholderTextColor={COLORS.TEXT_MUTED}
                keyboardType="number-pad"
                value={editPackForm.discount}
                onChangeText={(text) => setEditPackForm({...editPackForm, discount: text})}
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
                style={styles.modalCreateButton}
                onPress={handleUpdatePack}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color={COLORS.BG_DARK} />
                ) : (
                  <Text style={styles.modalCreateButtonText}>Update Pack</Text>
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
                <Ionicons name="close" size={24} color={COLORS.TEXT_MUTED} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Start Time</Text>
              <TextInput
                style={styles.modalInput}
                value={slotForm.startTime}
                onChangeText={(text) => setSlotForm({ ...slotForm, startTime: text })}
                placeholder="YYYY-MM-DD HH:MM"
                placeholderTextColor={COLORS.TEXT_MUTED}
              />

              <Text style={styles.inputLabel}>End Time</Text>
              <TextInput
                style={styles.modalInput}
                value={slotForm.endTime}
                onChangeText={(text) => setSlotForm({ ...slotForm, endTime: text })}
                placeholder="YYYY-MM-DD HH:MM"
                placeholderTextColor={COLORS.TEXT_MUTED}
              />

              <Text style={styles.inputLabel}>Capacity</Text>
              <TextInput
                style={styles.modalInput}
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
                onPress={() => {
                  setShowSlotModal(false);
                  setSelectedSlot(null);
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCreateButton}
                onPress={handleUpdateSlot}
              >
                <Text style={styles.modalCreateButtonText}>Update Slot</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Hamburger Menu */}
      <HamburgerMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onLogout={async () => {
          await auth.signOut();
          navigation.navigate('Login');
        }}
        userRole="admin"
        unreadCount={0}
      />
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
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.BG_CARD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  tabBar: {
    backgroundColor: COLORS.BG_CARD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
    paddingHorizontal: 8,
    flexGrow: 0,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginRight: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.GOLD,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.TEXT_MUTED,
  },
  tabTextActive: {
    color: COLORS.GOLD,
    fontWeight: '600',
  },
  hamburgerIcon: {
    width: 24,
    height: 18,
    justifyContent: 'space-between',
  },
  hamburgerLine: {
    width: 24,
    height: 3,
    backgroundColor: COLORS.TEXT_WHITE,
    borderRadius: 2,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.TEXT_WHITE,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  dropdownMenu: {
    backgroundColor: COLORS.BG_CARD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  menuItemActive: {
    backgroundColor: 'rgba(200, 169, 78, 0.1)',
  },
  menuItemText: {
    fontSize: 16,
    color: COLORS.TEXT_MUTED,
    fontWeight: '500',
  },
  menuItemTextActive: {
    color: COLORS.GOLD,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    paddingTop: 16,
  },
  scrollContent: {
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },
  actionBar: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.BG_CARD,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.GOLD,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: COLORS.BG_DARK,
    fontSize: 16,
    fontWeight: '600',
  },
  blockBookingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.GOLD,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    gap: 8,
  },
  blockBookingsButtonText: {
    color: COLORS.BG_DARK,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.BG_CARD,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
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
  slotCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.BG_DARK,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  slotInfo: {
    flex: 1,
  },
  slotDate: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_WHITE,
  },
  slotTime: {
    fontSize: 14,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  slotStats: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  slotBooked: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.GOLD,
  },
  slotLabel: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
  },
  slotActions: {
    flexDirection: 'row',
    gap: 8,
  },
  slotActionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.BG_CARD,
  },
  slotActionButtonEdit: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(200, 169, 78, 0.1)',
    borderWidth: 1,
    borderColor: COLORS.GOLD,
  },
  slotActionButtonEditText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.GOLD,
  },
  slotActionButtonDelete: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: COLORS.RED,
  },
  slotActionButtonDeleteText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.RED,
  },
  clientCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.BG_DARK,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_WHITE,
  },
  clientEmail: {
    fontSize: 14,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  clientCredits: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  clientCreditsText: {
    fontSize: 14,
    color: COLORS.GOLD,
    fontWeight: '500',
  },
  clientActions: {
    flexDirection: 'row',
    gap: 8,
  },
  viewDetailsButton: {
    backgroundColor: COLORS.BG_CARD,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  viewDetailsButtonText: {
    fontSize: 14,
    color: COLORS.TEXT_WHITE,
    fontWeight: '600',
  },
  adjustButton: {
    backgroundColor: 'rgba(200, 169, 78, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.GOLD,
  },
  adjustButtonText: {
    fontSize: 14,
    color: COLORS.GOLD,
    fontWeight: '600',
  },
  packCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.BG_DARK,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  packInfo: {
    flex: 1,
  },
  packCredits: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT_WHITE,
  },
  packPrice: {
    fontSize: 24,
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
    fontSize: 14,
    color: COLORS.TEXT_MUTED,
  },
  editPackButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(200, 169, 78, 0.1)',
    borderWidth: 1,
    borderColor: COLORS.GOLD,
  },
  editPackButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.GOLD,
  },
  addPackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.BG_DARK,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.BORDER,
    borderStyle: 'dashed',
    gap: 8,
  },
  addPackText: {
    fontSize: 16,
    color: COLORS.GOLD,
    fontWeight: '600',
  },
  // Overview Dashboard Styles
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  kpiCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.BG_DARK,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  kpiIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.TEXT_WHITE,
    marginBottom: 4,
  },
  kpiValueSmall: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.TEXT_WHITE,
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    textAlign: 'center',
  },
  quickStatsContainer: {
    backgroundColor: COLORS.BG_DARK,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  quickStatsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_WHITE,
    marginBottom: 12,
  },
  quickStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  quickStatLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.TEXT_MUTED,
    marginLeft: 12,
  },
  quickStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_WHITE,
  },
  emptyMetrics: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyMetricsText: {
    fontSize: 16,
    color: COLORS.TEXT_MUTED,
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.OVERLAY,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.BG_CARD,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.TEXT_WHITE,
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_WHITE,
    marginBottom: 8,
    marginTop: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: COLORS.BG_DARK,
    color: COLORS.TEXT_WHITE,
  },
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
  modalButtonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
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
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_MUTED,
  },
  modalCreateButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: COLORS.GOLD,
    alignItems: 'center',
  },
  modalCreateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.BG_DARK,
  },
  closeButtonText: {
    fontSize: 28,
    color: COLORS.TEXT_MUTED,
    fontWeight: '300',
  },
  clientModalName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT_WHITE,
    marginBottom: 8,
  },
  currentBalanceText: {
    fontSize: 15,
    color: COLORS.TEXT_MUTED,
    marginBottom: 20,
  },
  inputHint: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    marginTop: 4,
    marginBottom: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.TEXT_MUTED,
    marginTop: 12,
  },
  attendanceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.BG_DARK,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  attendanceInfo: {
    flex: 1,
  },
  attendanceName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_WHITE,
  },
  attendanceTime: {
    fontSize: 14,
    color: COLORS.TEXT_MUTED,
    marginTop: 4,
  },
  attendanceActions: {
    flexDirection: 'row',
    gap: 8,
  },
  attendedButton: {
    backgroundColor: COLORS.GREEN,
    padding: 10,
    borderRadius: 8,
  },
  noShowButton: {
    backgroundColor: COLORS.RED,
    padding: 10,
    borderRadius: 8,
  },
  settingCard: {
    backgroundColor: COLORS.BG_DARK,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  settingLabel: {
    fontSize: 16,
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
  buyButtonDisabled: {
    backgroundColor: '#4a4a4a',
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
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.TEXT_WHITE,
    marginBottom: 6,
    marginTop: 8,
  },
});

export default AdminScreen;
