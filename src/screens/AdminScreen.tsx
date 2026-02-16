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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase, db, auth } from '../lib/supabase';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { HamburgerButton, HamburgerMenu } from '../components/HamburgerMenu';

// Import the logo banner image
const logoBanner = require('../../logo banner.png');

interface AdminScreenProps {
  navigation: any;
}

const AdminScreen: React.FC<AdminScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'clients' | 'packs'>('overview');
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

      // Load all clients
      const { data: clientsData } = await supabase
        .from('client_profiles')
        .select(`
          *,
          credit_balances (balance),
          profiles (email)
        `)
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
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const getActiveTabTitle = () => {
    switch (activeTab) {
      case 'overview': return 'Overview';
      case 'schedule': return 'Schedule';
      case 'clients': return 'Clients';
      case 'packs': return 'Pricing';
      default: return 'Admin Portal';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Hero Banner */}
      <Image source={logoBanner} style={styles.heroBanner} resizeMode="cover" />

      {/* Header with Menu */}
      <View style={styles.headerContainer}>
        <HamburgerButton onPress={() => setMenuVisible(true)} />
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>{getActiveTabTitle()}</Text>
          <Text style={styles.headerSubtitle}>Admin Portal</Text>
        </View>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setShowMenu(!showMenu)}
        >
          <Ionicons name="filter" size={24} color="#1f2937" />
        </TouchableOpacity>
      </View>

      {/* Dropdown Menu */}
      {showMenu && (
        <View style={styles.dropdownMenu}>
          <TouchableOpacity
            style={[styles.menuItem, activeTab === 'overview' && styles.menuItemActive]}
            onPress={() => { setActiveTab('overview'); setShowMenu(false); }}
          >
            <Ionicons name="stats-chart" size={20} color={activeTab === 'overview' ? '#3b82f6' : '#6b7280'} />
            <Text style={[styles.menuItemText, activeTab === 'overview' && styles.menuItemTextActive]}>Overview</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, activeTab === 'schedule' && styles.menuItemActive]}
            onPress={() => { setActiveTab('schedule'); setShowMenu(false); }}
          >
            <Ionicons name="calendar" size={20} color={activeTab === 'schedule' ? '#3b82f6' : '#6b7280'} />
            <Text style={[styles.menuItemText, activeTab === 'schedule' && styles.menuItemTextActive]}>Schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, activeTab === 'clients' && styles.menuItemActive]}
            onPress={() => { setActiveTab('clients'); setShowMenu(false); }}
          >
            <Ionicons name="people" size={20} color={activeTab === 'clients' ? '#3b82f6' : '#6b7280'} />
            <Text style={[styles.menuItemText, activeTab === 'clients' && styles.menuItemTextActive]}>Clients</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, activeTab === 'packs' && styles.menuItemActive]}
            onPress={() => { setActiveTab('packs'); setShowMenu(false); }}
          >
            <Ionicons name="pricetag" size={20} color={activeTab === 'packs' ? '#3b82f6' : '#6b7280'} />
            <Text style={[styles.menuItemText, activeTab === 'packs' && styles.menuItemTextActive]}>Pricing</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
                      <View style={[styles.kpiIconContainer, { backgroundColor: '#eff6ff' }]}>
                        <Ionicons name="people" size={28} color="#3b82f6" />
                      </View>
                      <Text style={styles.kpiValue}>{businessMetrics.totalClients || 0}</Text>
                      <Text style={styles.kpiLabel}>Total Clients</Text>
                    </View>

                    {/* Monthly Revenue */}
                    <View style={styles.kpiCard}>
                      <View style={[styles.kpiIconContainer, { backgroundColor: '#ecfdf5' }]}>
                        <Ionicons name="wallet" size={28} color="#10b981" />
                      </View>
                      <Text style={styles.kpiValue}>€{businessMetrics.monthlyRevenue || 0}</Text>
                      <Text style={styles.kpiLabel}>Monthly Revenue</Text>
                    </View>

                    {/* Attendance Rate */}
                    <View style={styles.kpiCard}>
                      <View style={[styles.kpiIconContainer, { backgroundColor: '#fef3c7' }]}>
                        <Ionicons name="checkmark-circle" size={28} color="#f59e0b" />
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
                    <Ionicons name="repeat" size={24} color="white" />
                    <Text style={styles.blockBookingsButtonText}>Manage Block Bookings</Text>
                    <Ionicons name="chevron-forward" size={20} color="white" />
                  </TouchableOpacity>

                  {/* Programme Assignments Button */}
                  <TouchableOpacity
                    style={[styles.blockBookingsButton, { backgroundColor: '#8b5cf6' }]}
                    onPress={() => navigation.navigate('ProgrammeAssignments')}
                  >
                    <Ionicons name="fitness" size={24} color="white" />
                    <Text style={styles.blockBookingsButtonText}>Programme Assignments</Text>
                    <Ionicons name="chevron-forward" size={20} color="white" />
                  </TouchableOpacity>

                  {/* Client Messages Button */}
                  <TouchableOpacity
                    style={[styles.blockBookingsButton, { backgroundColor: '#10b981' }]}
                    onPress={() => navigation.navigate('Messages')}
                  >
                    <Ionicons name="chatbubbles" size={24} color="white" />
                    <Text style={styles.blockBookingsButtonText}>Client Messages</Text>
                    <Ionicons name="chevron-forward" size={20} color="white" />
                  </TouchableOpacity>

                  {/* Quick Stats */}
                  <View style={styles.quickStatsContainer}>
                    <Text style={styles.quickStatsTitle}>Quick Stats</Text>

                    <View style={styles.quickStatRow}>
                      <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                      <Text style={styles.quickStatLabel}>Upcoming Sessions</Text>
                      <Text style={styles.quickStatValue}>{slots.length}</Text>
                    </View>

                    <View style={styles.quickStatRow}>
                      <Ionicons name="person-outline" size={20} color="#6b7280" />
                      <Text style={styles.quickStatLabel}>Active Clients</Text>
                      <Text style={styles.quickStatValue}>{clients.length}</Text>
                    </View>

                    <View style={styles.quickStatRow}>
                      <Ionicons name="trending-up-outline" size={20} color="#6b7280" />
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
                  <ActivityIndicator size="large" color="#3b82f6" />
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
                <Ionicons name="add-circle" size={20} color="white" />
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
            <Text style={styles.sectionTitle}>All Clients ({clients.length})</Text>
            {clients.map((client) => (
              <View key={client.id} style={styles.clientCard}>
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>
                    {client.first_name} {client.last_name}
                  </Text>
                  <Text style={styles.clientEmail}>{client.profiles?.email}</Text>
                  <View style={styles.clientCredits}>
                    <Ionicons name="wallet" size={16} color={(client.credit_balances?.balance || 0) <= 2 ? "#ef4444" : "#3b82f6"} />
                    <Text style={[
                      styles.clientCreditsText,
                      (client.credit_balances?.balance || 0) <= 2 && { color: "#ef4444", fontWeight: "600" }
                    ]}>
                      {client.credit_balances?.balance || 0} credits
                      {(client.credit_balances?.balance || 0) <= 2 && " ⚠️"}
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
                  <Text style={styles.packPrice}>€{Math.round(pack.price / 100)}</Text>
                  {pack.discount_percent > 0 && (
                    <Text style={styles.packDiscount}>{pack.discount_percent}% off</Text>
                  )}
                </View>
                <View style={styles.packActions}>
                  <Text style={styles.packPerCredit}>€25/session</Text>
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
              <Ionicons name="add-circle-outline" size={20} color="#3b82f6" />
              <Text style={styles.addPackText}>Add New Pack</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Adjust Credits Modal */}
      <Modal visible={showAdjustCreditsModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adjust Credits</Text>
              <TouchableOpacity onPress={() => setShowAdjustCreditsModal(false)}>
                <Text style={styles.closeButtonText}>✕</Text>
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
                <Ionicons name="close" size={28} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Number of Credits *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., 10"
                keyboardType="number-pad"
                value={newPack.credits}
                onChangeText={(text) => setNewPack({...newPack, credits: text})}
              />

              <Text style={styles.inputLabel}>Price (€) *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., 50.00"
                keyboardType="decimal-pad"
                value={newPack.price}
                onChangeText={(text) => setNewPack({...newPack, price: text})}
              />

              <Text style={styles.inputLabel}>Discount % (optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., 10"
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
                  <ActivityIndicator color="white" />
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
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Number of Credits *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., 10"
                keyboardType="number-pad"
                value={editPackForm.credits}
                onChangeText={(text) => setEditPackForm({...editPackForm, credits: text})}
              />

              <Text style={styles.inputLabel}>Price (€) *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., 50"
                keyboardType="decimal-pad"
                value={editPackForm.price}
                onChangeText={(text) => setEditPackForm({...editPackForm, price: text})}
              />

              <Text style={styles.inputLabel}>Discount %</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., 10"
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
                  <ActivityIndicator color="white" />
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
            <Text style={styles.modalTitle}>Edit Slot</Text>

            <Text style={styles.inputLabel}>Start Time</Text>
            <TextInput
              style={styles.modalInput}
              value={slotForm.startTime}
              onChangeText={(text) => setSlotForm({ ...slotForm, startTime: text })}
              placeholder="YYYY-MM-DD HH:MM"
            />

            <Text style={styles.inputLabel}>End Time</Text>
            <TextInput
              style={styles.modalInput}
              value={slotForm.endTime}
              onChangeText={(text) => setSlotForm({ ...slotForm, endTime: text })}
              placeholder="YYYY-MM-DD HH:MM"
            />

            <Text style={styles.inputLabel}>Capacity</Text>
            <TextInput
              style={styles.modalInput}
              value={slotForm.capacity}
              onChangeText={(text) => setSlotForm({ ...slotForm, capacity: text })}
              placeholder="6"
              keyboardType="number-pad"
            />

            {selectedSlot && selectedSlot.booked_count > 0 && (
              <Text style={styles.warningText}>
                ⚠️ This slot has {selectedSlot.booked_count} booking(s). Clients will be notified of changes.
              </Text>
            )}

            <View style={styles.modalButtonGroup}>
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
    backgroundColor: '#F1F5F9',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  heroBanner: {
    width: '100%',
    height: 160,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  menuButton: {
    padding: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hamburgerIcon: {
    width: 24,
    height: 18,
    justifyContent: 'space-between',
  },
  hamburgerLine: {
    width: 24,
    height: 3,
    backgroundColor: '#1f2937',
    borderRadius: 2,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  dropdownMenu: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuItemActive: {
    backgroundColor: '#eff6ff',
  },
  menuItemText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  menuItemTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    paddingTop: 16,
  },
  actionBar: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  blockBookingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  blockBookingsButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  slotCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  slotInfo: {
    flex: 1,
  },
  slotDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  slotTime: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  slotStats: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  slotBooked: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  slotLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  slotActions: {
    flexDirection: 'row',
    gap: 8,
  },
  slotActionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  slotActionButtonEdit: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  slotActionButtonEditText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  slotActionButtonDelete: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  slotActionButtonDeleteText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  clientCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  clientEmail: {
    fontSize: 14,
    color: '#6b7280',
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
    color: '#3b82f6',
    fontWeight: '500',
  },
  clientActions: {
    flexDirection: 'row',
    gap: 8,
  },
  viewDetailsButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  viewDetailsButtonText: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
  },
  adjustButton: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  adjustButtonText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  packCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  packInfo: {
    flex: 1,
  },
  packCredits: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  packPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginTop: 4,
  },
  packDiscount: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
    marginTop: 4,
  },
  packActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  packPerCredit: {
    fontSize: 14,
    color: '#6b7280',
  },
  editPackButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  editPackButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  addPackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    gap: 8,
  },
  addPackText: {
    fontSize: 16,
    color: '#3b82f6',
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
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    color: '#1f2937',
    marginBottom: 4,
  },
  kpiValueSmall: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },
  quickStatsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickStatsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  quickStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  quickStatLabel: {
    flex: 1,
    fontSize: 14,
    color: '#4b5563',
    marginLeft: 12,
  },
  quickStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  emptyMetrics: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyMetricsText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  warningText: {
    fontSize: 13,
    color: '#f59e0b',
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  modalButtonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  modalCancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  modalCreateButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  modalCreateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  closeButtonText: {
    fontSize: 28,
    color: '#6b7280',
    fontWeight: '300',
  },
  clientModalName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  currentBalanceText: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 20,
  },
  inputHint: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 4,
    marginBottom: 8,
  },
});

export default AdminScreen;
