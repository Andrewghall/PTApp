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
import { supabase, db } from '../lib/supabase';
import { format, addDays, setHours, setMinutes } from 'date-fns';

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
    Alert.prompt(
      'Adjust Credits',
      `Current balance: ${client.credit_balances?.balance || 0}\nEnter credits to add (use negative to subtract):`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: async (value) => {
            const amount = parseInt(value || '0');
            if (isNaN(amount) || amount === 0) return;

            try {
              if (amount > 0) {
                await db.addCredits(client.id, amount, `Admin adjustment: +${amount}`);
              } else {
                // Subtract credits
                const { data: bal } = await supabase
                  .from('credit_balances')
                  .select('balance')
                  .eq('client_id', client.id)
                  .single();
                const current = bal?.balance || 0;
                await supabase
                  .from('credit_balances')
                  .update({ balance: Math.max(0, current + amount) })
                  .eq('client_id', client.id);
                await supabase.from('credit_transactions').insert([
                  {
                    client_id: client.id,
                    type: 'consume',
                    amount,
                    description: `Admin adjustment: ${amount}`,
                  },
                ]);
              }
              Alert.alert('Success', 'Credits adjusted');
              loadAdminData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to adjust credits');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Hero Banner */}
      <Image source={logoBanner} style={styles.heroBanner} resizeMode="cover" />

      {/* Back Button */}
      <View style={styles.backButtonContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Portal</Text>
        <Text style={styles.headerSubtitle}>PT Business Management</Text>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabs}
      >
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Ionicons
            name="stats-chart"
            size={20}
            color={activeTab === 'overview' ? '#3b82f6' : '#9ca3af'}
          />
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'schedule' && styles.tabActive]}
          onPress={() => setActiveTab('schedule')}
        >
          <Ionicons
            name="calendar"
            size={20}
            color={activeTab === 'schedule' ? '#3b82f6' : '#9ca3af'}
          />
          <Text style={[styles.tabText, activeTab === 'schedule' && styles.tabTextActive]}>
            Schedule
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'clients' && styles.tabActive]}
          onPress={() => setActiveTab('clients')}
        >
          <Ionicons
            name="people"
            size={20}
            color={activeTab === 'clients' ? '#3b82f6' : '#9ca3af'}
          />
          <Text style={[styles.tabText, activeTab === 'clients' && styles.tabTextActive]}>
            Clients
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'packs' && styles.tabActive]}
          onPress={() => setActiveTab('packs')}
        >
          <Ionicons
            name="pricetag"
            size={20}
            color={activeTab === 'packs' ? '#3b82f6' : '#9ca3af'}
          />
          <Text style={[styles.tabText, activeTab === 'packs' && styles.tabTextActive]}>
            Pricing
          </Text>
        </TouchableOpacity>
      </ScrollView>

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

                    {/* Gender Split */}
                    <View style={styles.kpiCard}>
                      <View style={[styles.kpiIconContainer, { backgroundColor: '#fae8ff' }]}>
                        <Ionicons name="analytics" size={28} color="#a855f7" />
                      </View>
                      <Text style={styles.kpiValueSmall}>
                        M:{businessMetrics.genderSplit?.male || 0} F:{businessMetrics.genderSplit?.female || 0}
                      </Text>
                      <Text style={styles.kpiLabel}>Gender Split</Text>
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

                  {/* Gender Breakdown */}
                  <View style={styles.genderBreakdownContainer}>
                    <Text style={styles.genderBreakdownTitle}>Client Demographics</Text>
                    <View style={styles.genderBars}>
                      <View style={styles.genderBarRow}>
                        <Text style={styles.genderLabel}>Male</Text>
                        <View style={styles.genderBarTrack}>
                          <View
                            style={[
                              styles.genderBarFill,
                              {
                                width: `${(businessMetrics.genderSplit?.male / businessMetrics.totalClients * 100) || 0}%`,
                                backgroundColor: '#3b82f6'
                              }
                            ]}
                          />
                        </View>
                        <Text style={styles.genderValue}>{businessMetrics.genderSplit?.male || 0}</Text>
                      </View>

                      <View style={styles.genderBarRow}>
                        <Text style={styles.genderLabel}>Female</Text>
                        <View style={styles.genderBarTrack}>
                          <View
                            style={[
                              styles.genderBarFill,
                              {
                                width: `${(businessMetrics.genderSplit?.female / businessMetrics.totalClients * 100) || 0}%`,
                                backgroundColor: '#ec4899'
                              }
                            ]}
                          />
                        </View>
                        <Text style={styles.genderValue}>{businessMetrics.genderSplit?.female || 0}</Text>
                      </View>

                      {businessMetrics.genderSplit?.other > 0 && (
                        <View style={styles.genderBarRow}>
                          <Text style={styles.genderLabel}>Other</Text>
                          <View style={styles.genderBarTrack}>
                            <View
                              style={[
                                styles.genderBarFill,
                                {
                                  width: `${(businessMetrics.genderSplit?.other / businessMetrics.totalClients * 100) || 0}%`,
                                  backgroundColor: '#a855f7'
                                }
                              ]}
                            />
                          </View>
                          <Text style={styles.genderValue}>{businessMetrics.genderSplit?.other || 0}</Text>
                        </View>
                      )}
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
                    <Ionicons name="wallet" size={16} color="#3b82f6" />
                    <Text style={styles.clientCreditsText}>
                      {client.credit_balances?.balance || 0} credits
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.adjustButton}
                  onPress={() => adjustClientCredits(client)}
                >
                  <Ionicons name="create-outline" size={20} color="#3b82f6" />
                  <Text style={styles.adjustButtonText}>Adjust</Text>
                </TouchableOpacity>
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
                  <Text style={styles.packPrice}>€{pack.price}</Text>
                  {pack.discount_percent > 0 && (
                    <Text style={styles.packDiscount}>{pack.discount_percent}% off</Text>
                  )}
                </View>
                <View style={styles.packActions}>
                  <Text style={styles.packPerCredit}>
                    €{(pack.price / pack.credits).toFixed(2)}/credit
                  </Text>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.addPackButton}>
              <Ionicons name="add-circle-outline" size={20} color="#3b82f6" />
              <Text style={styles.addPackText}>Add New Pack</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  tabsContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'white',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 6,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  heroBanner: {
    width: '100%',
    height: 160,
  },
  backButtonContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 8,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  actionBar: {
    padding: 16,
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
    paddingHorizontal: 16,
    paddingBottom: 32,
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
  adjustButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
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
  },
  packPerCredit: {
    fontSize: 14,
    color: '#6b7280',
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
  genderBreakdownContainer: {
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
  genderBreakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  genderBars: {
    gap: 12,
  },
  genderBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  genderLabel: {
    width: 60,
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
  },
  genderBarTrack: {
    flex: 1,
    height: 24,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    overflow: 'hidden',
  },
  genderBarFill: {
    height: '100%',
    borderRadius: 12,
  },
  genderValue: {
    width: 32,
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'right',
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
});

export default AdminScreen;
