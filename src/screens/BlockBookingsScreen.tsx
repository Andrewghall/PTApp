import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth, supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { HamburgerButton, HamburgerMenu } from '../components/HamburgerMenu';

const logoBanner = require('../../logo banner.png');

interface BlockBookingsScreenProps {
  navigation: any;
}

const BlockBookingsScreen: React.FC<BlockBookingsScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [blockBookings, setBlockBookings] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<number>(1); // Monday default
  const [timeSlot, setTimeSlot] = useState('10:00');
  const [duration, setDuration] = useState('60');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedClientCredits, setSelectedClientCredits] = useState<number>(0);
  const [estimatedSessions, setEstimatedSessions] = useState<number>(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const [userRole, setUserRole] = useState<'client' | 'admin'>('admin');

  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load all block bookings
      const { data: blockBookingsData } = await db.getAllBlockBookings();
      setBlockBookings(blockBookingsData || []);

      // Load all clients
      const { data: clientsData } = await db.getAllClients();
      setClients(clientsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate how many sessions will be created
  const calculateSessionCount = (start: string, end: string, dayOfWeek: number) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    let count = 0;
    let current = new Date(startDate);

    while (current <= endDate) {
      if (current.getDay() === dayOfWeek) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    return count;
  };

  // Load selected client's credit balance
  const loadClientCredits = async (clientId: string) => {
    try {
      const { data: credits } = await db.getCreditBalance(clientId);
      setSelectedClientCredits(credits?.balance || 0);
    } catch (error) {
      console.error('Error loading client credits:', error);
      setSelectedClientCredits(0);
    }
  };

  // Update estimated sessions when dates or day changes
  useEffect(() => {
    const count = calculateSessionCount(startDate, endDate, dayOfWeek);
    setEstimatedSessions(count);
  }, [startDate, endDate, dayOfWeek]);

  // Load client credits when client is selected
  useEffect(() => {
    if (selectedClient) {
      loadClientCredits(selectedClient);
    } else {
      setSelectedClientCredits(0);
    }
  }, [selectedClient]);

  const handleCreateBlockBooking = async () => {
    if (!selectedClient || !startDate || !endDate) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Calculate payment coverage
    const sessionsCovered = Math.min(selectedClientCredits, estimatedSessions);
    const sessionsNeedingPayment = Math.max(0, estimatedSessions - selectedClientCredits);
    const creditsNeeded = sessionsNeedingPayment;

    // Show confirmation with payment details
    const clientName = clients.find(c => c.id === selectedClient)?.first_name || 'Client';
    Alert.alert(
      'Confirm Block Booking',
      `${clientName} will be booked for ${estimatedSessions} sessions.\n\n` +
      `Current Credits: ${selectedClientCredits}\n` +
      `Sessions Covered: ${sessionsCovered}\n` +
      `Sessions Needing Payment: ${sessionsNeedingPayment}\n\n` +
      (sessionsNeedingPayment > 0
        ? `⚠️ Client will need to purchase ${creditsNeeded} more credits to cover all sessions.`
        : '✅ Client has enough credits to cover all sessions.') +
      `\n\nContinue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: async () => {
            setCreating(true);
            try {
              const { session } = await auth.getSession();
              if (!session) throw new Error('Not authenticated');

              const { data, error } = await db.createBlockBooking(
                selectedClient,
                startDate,
                endDate,
                dayOfWeek,
                timeSlot,
                parseInt(duration),
                session.user.id,
                notes
              );

              if (error) throw error;

              Alert.alert(
                'Success',
                `Block booking created! ${estimatedSessions} recurring sessions have been scheduled.` +
                (sessionsNeedingPayment > 0
                  ? `\n\nReminder: Client needs ${creditsNeeded} more credits.`
                  : '')
              );
              setShowCreateModal(false);
              resetForm();
              loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to create block booking');
            } finally {
              setCreating(false);
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setSelectedClient('');
    setStartDate('');
    setEndDate('');
    setDayOfWeek(1);
    setTimeSlot('10:00');
    setDuration('60');
    setNotes('');
  };

  const handlePauseBlockBooking = async (blockBookingId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      await db.updateBlockBookingStatus(blockBookingId, newStatus);
      Alert.alert('Success', `Block booking ${newStatus === 'active' ? 'activated' : 'paused'}`);
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update block booking');
    }
  };

  const handleDeleteBlockBooking = async (blockBookingId: string) => {
    Alert.alert(
      'Delete Block Booking',
      'This will delete the recurring pattern but NOT the already created bookings. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await db.deleteBlockBooking(blockBookingId);
              Alert.alert('Success', 'Block booking deleted');
              loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  const handleExtendBlockBooking = (blockBooking: any) => {
    Alert.prompt(
      'Extend Block Booking',
      `Current end date: ${format(new Date(blockBooking.end_date), 'MMM d, yyyy')}\n\nHow many additional months?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Extend',
          onPress: async (months) => {
            if (!months || isNaN(parseInt(months))) {
              Alert.alert('Error', 'Please enter a valid number of months');
              return;
            }

            try {
              const currentEndDate = new Date(blockBooking.end_date);
              const newEndDate = new Date(currentEndDate);
              newEndDate.setMonth(newEndDate.getMonth() + parseInt(months));

              const { error } = await db.extendBlockBooking(
                blockBooking.id,
                newEndDate.toISOString().split('T')[0]
              );

              if (error) throw error;

              Alert.alert(
                'Success',
                `Block booking extended by ${months} month(s).\n\nNew bookings will be created automatically.`
              );
              loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to extend block booking');
            }
          },
        },
      ],
      'plain-text',
      '',
      'number-pad'
    );
  };

  const handleSendExpirationReminder = async (blockBooking: any) => {
    const clientName = `${blockBooking.client_profiles?.first_name} ${blockBooking.client_profiles?.last_name}`;
    const endDate = format(new Date(blockBooking.end_date), 'MMM d, yyyy');
    const dayName = daysOfWeek.find(d => d.value === blockBooking.day_of_week)?.label;

    Alert.alert(
      'Send Expiration Reminder',
      `Send message to ${clientName} about their ${dayName} ${blockBooking.time_slot} block booking ending on ${endDate}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Message',
          onPress: async () => {
            try {
              const { session } = await auth.getSession();
              if (!session) throw new Error('Not authenticated');

              const message = `Hi ${blockBooking.client_profiles?.first_name}! Your recurring ${dayName} ${blockBooking.time_slot} session block is ending on ${endDate}. Would you like to continue? Let me know and I'll extend your booking!`;

              const { error } = await db.sendMessage(
                session.user.id,
                blockBooking.client_id,
                message
              );

              if (error) throw error;

              Alert.alert('Success', 'Reminder message sent to client');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to send message');
            }
          },
        },
      ]
    );
  };

  // Check if block booking is expiring soon (within 14 days)
  const isExpiringSoon = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const daysUntilEnd = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilEnd <= 14 && daysUntilEnd > 0;
  };

  // Check if block booking has already ended
  const hasEnded = (endDate: string) => {
    return new Date(endDate) < new Date();
  };

  // Get days until end
  const getDaysUntilEnd = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Handle changing day/time of block booking
  const handleChangeSchedule = (blockBooking: any) => {
    const dayName = daysOfWeek.find(d => d.value === blockBooking.day_of_week)?.label;

    Alert.alert(
      'Change Schedule',
      `Current schedule: ${dayName} at ${blockBooking.time_slot}\n\nWhat would you like to change?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change Day',
          onPress: () => {
            // Show day picker
            Alert.alert(
              'Select New Day',
              'Choose the new day for this recurring booking:',
              [
                ...daysOfWeek.map(day => ({
                  text: day.label,
                  onPress: async () => {
                    try {
                      const { error } = await db.updateBlockBookingDay(
                        blockBooking.id,
                        day.value,
                        blockBooking.time_slot
                      );
                      if (error) throw error;

                      Alert.alert(
                        'Success',
                        `Block booking moved from ${dayName} to ${day.label}.\n\nNote: Existing bookings remain. New bookings will use the updated day.`
                      );
                      loadData();
                    } catch (error: any) {
                      Alert.alert('Error', error.message || 'Failed to update schedule');
                    }
                  }
                })),
                { text: 'Cancel', style: 'cancel' }
              ]
            );
          }
        },
        {
          text: 'Change Time',
          onPress: () => {
            Alert.prompt(
              'Change Time',
              `Current time: ${blockBooking.time_slot}\n\nEnter new time (HH:MM format, e.g., 09:30):`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Update',
                  onPress: async (newTime) => {
                    if (!newTime || !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(newTime)) {
                      Alert.alert('Error', 'Please enter a valid time in HH:MM format (e.g., 09:30)');
                      return;
                    }

                    try {
                      const { error } = await db.updateBlockBookingDay(
                        blockBooking.id,
                        blockBooking.day_of_week,
                        newTime
                      );
                      if (error) throw error;

                      Alert.alert(
                        'Success',
                        `Time updated from ${blockBooking.time_slot} to ${newTime}.\n\nNote: Existing bookings remain. New bookings will use the updated time.`
                      );
                      loadData();
                    } catch (error: any) {
                      Alert.alert('Error', error.message || 'Failed to update time');
                    }
                  }
                }
              ],
              'plain-text',
              blockBooking.time_slot
            );
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Hero Banner */}
      <Image source={logoBanner} style={styles.heroBanner} resizeMode="cover" />

      {/* Navigation Bar */}
      <View style={styles.navigationBar}>
        <HamburgerButton onPress={() => setMenuVisible(true)} />
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
        <Text style={styles.headerTitle}>Block Bookings</Text>
        <TouchableOpacity onPress={() => setShowCreateModal(true)} style={styles.addButton}>
          <Ionicons name="add-circle" size={28} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {blockBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No block bookings yet</Text>
            <Text style={styles.emptyStateSubtext}>Create recurring sessions for regular clients</Text>
          </View>
        ) : (
          blockBookings.map((bb) => (
            <View key={bb.id} style={styles.blockBookingCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.clientName}>
                    {bb.client_profiles?.first_name} {bb.client_profiles?.last_name}
                  </Text>
                  <Text style={styles.clientEmail}>{bb.client_profiles?.email}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: bb.status === 'active' ? '#10b981' : '#f59e0b' }]}>
                  <Text style={styles.statusText}>{bb.status}</Text>
                </View>
              </View>

              <View style={styles.detailsRow}>
                <Ionicons name="calendar" size={16} color="#6b7280" />
                <Text style={styles.detailText}>
                  {daysOfWeek[bb.day_of_week].label}s at {bb.time_slot}
                </Text>
              </View>

              <View style={styles.detailsRow}>
                <Ionicons name="time" size={16} color="#6b7280" />
                <Text style={styles.detailText}>{bb.duration_minutes} minutes</Text>
              </View>

              <View style={styles.detailsRow}>
                <Ionicons name="today" size={16} color="#6b7280" />
                <Text style={styles.detailText}>
                  {format(new Date(bb.start_date), 'MMM d')} - {format(new Date(bb.end_date), 'MMM d, yyyy')}
                </Text>
              </View>

              {bb.notes && (
                <View style={styles.notesRow}>
                  <Text style={styles.notesText}>Note: {bb.notes}</Text>
                </View>
              )}

              {/* Expiration Warning Banner */}
              {hasEnded(bb.end_date) ? (
                <View style={[styles.expirationBanner, { backgroundColor: '#fef2f2', borderColor: '#fca5a5' }]}>
                  <Ionicons name="warning" size={20} color="#dc2626" />
                  <Text style={[styles.expirationText, { color: '#dc2626' }]}>
                    Ended {Math.abs(getDaysUntilEnd(bb.end_date))} days ago
                  </Text>
                </View>
              ) : isExpiringSoon(bb.end_date) ? (
                <View style={[styles.expirationBanner, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
                  <Ionicons name="time" size={20} color="#f59e0b" />
                  <Text style={[styles.expirationText, { color: '#f59e0b' }]}>
                    Ending in {getDaysUntilEnd(bb.end_date)} days
                  </Text>
                </View>
              ) : null}

              <View style={styles.cardActions}>
                {/* Extend and Remind buttons for active/expiring bookings */}
                {!hasEnded(bb.end_date) && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#3b82f6' }]}
                      onPress={() => handleExtendBlockBooking(bb)}
                    >
                      <Ionicons name="calendar-outline" size={16} color="white" />
                      <Text style={styles.actionButtonText}>Extend</Text>
                    </TouchableOpacity>
                    {isExpiringSoon(bb.end_date) && (
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: '#8b5cf6' }]}
                        onPress={() => handleSendExpirationReminder(bb)}
                      >
                        <Ionicons name="chatbubble-outline" size={16} color="white" />
                        <Text style={styles.actionButtonText}>Remind</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#10b981' }]}
                  onPress={() => handleChangeSchedule(bb)}
                >
                  <Ionicons name="swap-horizontal" size={16} color="white" />
                  <Text style={styles.actionButtonText}>Change</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: bb.status === 'active' ? '#f59e0b' : '#10b981' }]}
                  onPress={() => handlePauseBlockBooking(bb.id, bb.status)}
                >
                  <Ionicons name={bb.status === 'active' ? 'pause' : 'play'} size={16} color="white" />
                  <Text style={styles.actionButtonText}>{bb.status === 'active' ? 'Pause' : 'Resume'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#ef4444' }]}
                  onPress={() => handleDeleteBlockBooking(bb.id)}
                >
                  <Ionicons name="trash" size={16} color="white" />
                  <Text style={styles.actionButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Create Block Booking Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Block Booking</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={28} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Select Client *</Text>
              <View style={styles.pickerContainer}>
                {clients.map((client) => (
                  <TouchableOpacity
                    key={client.id}
                    style={[
                      styles.clientOption,
                      selectedClient === client.id && styles.clientOptionSelected,
                    ]}
                    onPress={() => setSelectedClient(client.id)}
                  >
                    <Text style={selectedClient === client.id ? styles.clientOptionTextSelected : styles.clientOptionText}>
                      {client.first_name} {client.last_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Day of Week *</Text>
              <View style={styles.dayPickerContainer}>
                {daysOfWeek.map((day) => (
                  <TouchableOpacity
                    key={day.value}
                    style={[
                      styles.dayButton,
                      dayOfWeek === day.value && styles.dayButtonSelected,
                    ]}
                    onPress={() => setDayOfWeek(day.value)}
                  >
                    <Text style={dayOfWeek === day.value ? styles.dayButtonTextSelected : styles.dayButtonText}>
                      {day.label.substring(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Time Slot * (HH:MM)</Text>
              <TextInput
                style={styles.input}
                value={timeSlot}
                onChangeText={setTimeSlot}
                placeholder="10:00"
              />

              <Text style={styles.label}>Duration (minutes)</Text>
              <TextInput
                style={styles.input}
                value={duration}
                onChangeText={setDuration}
                placeholder="60"
                keyboardType="number-pad"
              />

              <Text style={styles.label}>Start Date * (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="2024-02-19"
              />

              <Text style={styles.label}>End Date * (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="2024-05-19"
              />

              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Regular client - guaranteed spot"
                multiline
                numberOfLines={3}
              />

              {/* Payment Coverage Summary */}
              {selectedClient && estimatedSessions > 0 && (
                <View style={styles.paymentSummary}>
                  <Text style={styles.paymentSummaryTitle}>Payment Coverage</Text>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Total Sessions:</Text>
                    <Text style={styles.paymentValue}>{estimatedSessions}</Text>
                  </View>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Current Credits:</Text>
                    <Text style={styles.paymentValue}>{selectedClientCredits}</Text>
                  </View>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Sessions Covered:</Text>
                    <Text style={[styles.paymentValue, { color: '#10b981' }]}>
                      {Math.min(selectedClientCredits, estimatedSessions)}
                    </Text>
                  </View>
                  {estimatedSessions > selectedClientCredits && (
                    <View style={[styles.paymentRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e5e7eb' }]}>
                      <Text style={[styles.paymentLabel, { color: '#f59e0b', fontWeight: '600' }]}>
                        Credits Needed:
                      </Text>
                      <Text style={[styles.paymentValue, { color: '#f59e0b', fontWeight: '600' }]}>
                        {estimatedSessions - selectedClientCredits}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreateBlockBooking}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.createButtonText}>Create</Text>
                )}
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
        userRole={userRole}
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  heroBanner: {
    width: '100%',
    height: 160,
  },
  navigationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  addButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  blockBookingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  clientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  clientEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#4b5563',
    marginLeft: 8,
  },
  notesRow: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  notesText: {
    fontSize: 13,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  expirationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
  },
  expirationText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  paymentSummary: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  paymentSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  paymentValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  pickerContainer: {
    maxHeight: 150,
  },
  clientOption: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginBottom: 8,
  },
  clientOptionSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  clientOptionText: {
    fontSize: 16,
    color: '#1f2937',
  },
  clientOptionTextSelected: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
  },
  dayPickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
  },
  dayButtonSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#3b82f6',
  },
  dayButtonText: {
    fontSize: 14,
    color: '#1f2937',
  },
  dayButtonTextSelected: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  createButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default BlockBookingsScreen;
