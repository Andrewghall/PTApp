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
import { supabase, db } from '../lib/supabase';
import { format, addDays, setHours, setMinutes } from 'date-fns';

const AdminScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'schedule' | 'clients' | 'packs'>('schedule');
  const [clients, setClients] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [creditPacks, setCreditPacks] = useState<any[]>([]);
  const [showAddSlotModal, setShowAddSlotModal] = useState(false);
  const [showAddPackModal, setShowAddPackModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Portal</Text>
        <Text style={styles.headerSubtitle}>PT Business Management</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
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
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
                  <Text style={styles.packPrice}>£{pack.price}</Text>
                  {pack.discount_percent > 0 && (
                    <Text style={styles.packDiscount}>{pack.discount_percent}% off</Text>
                  )}
                </View>
                <View style={styles.packActions}>
                  <Text style={styles.packPerCredit}>
                    £{(pack.price / pack.credits).toFixed(2)}/credit
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
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
});

export default AdminScreen;
