import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, supabase, auth } from '../lib/supabase';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';

// Import the logo banner image
const logoBanner = require('../../logo banner.png');

interface BookingScreenProps {
  navigation: any;
}

const BookingScreen: React.FC<BookingScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [slots, setSlots] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [creditBalance, setCreditBalance] = useState(0);
  const [clientId, setClientId] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    loadUserAndData();
  }, [currentWeek]);

  const loadUserAndData = async () => {
    try {
      const { session } = await auth.getSession();
      if (session) {
        const { data: profile } = await db.getClientProfile(session.user.id);
        if (profile) {
          setClientId(profile.id);

          // Load credit balance
          const { data: credits } = await db.getCreditBalance(profile.id);
          setCreditBalance(credits?.balance || 0);

          // Load slots for the week
          const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday
          const weekEnd = addDays(weekStart, 6);
          const { data: slotsData } = await db.getSlots(
            weekStart.toISOString(),
            weekEnd.toISOString()
          );
          setSlots(slotsData || []);

          // Load my bookings
          const { data: bookingsData } = await db.getClientBookings(profile.id);
          setMyBookings(bookingsData || []);
        }
      }
    } catch (error) {
      console.error('Error loading booking data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookSlot = async () => {
    if (!clientId || !selectedSlot) return;

    if (creditBalance < 1) {
      Alert.alert('No Sessions Available', 'You need to purchase sessions before booking.');
      return;
    }

    setBookingLoading(true);
    try {
      // Create booking
      const { error: bookingError } = await db.createBooking(selectedSlot.id, clientId);
      if (bookingError) throw bookingError;

      // Deduct credit
      const { error: creditError } = await db.deductCredit(
        clientId,
        `Booking for ${format(parseISO(selectedSlot.start_time), 'MMM d, h:mm a')}`
      );
      if (creditError) throw creditError;

      Alert.alert('Success', 'Session booked successfully!');
      setShowConfirmModal(false);
      setSelectedSlot(null);
      loadUserAndData(); // Refresh data
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to book session');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelBooking = async (booking: any) => {
    if (!clientId) return;

    // Calculate hours until session
    const sessionTime = new Date(booking.slots.start_time);
    const now = new Date();
    const hoursUntilSession = (sessionTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilSession < 48) {
      // Less than 48 hours - no refund
      Alert.alert(
        'Late Cancellation',
        'Cancellations less than 48 hours before the session will forfeit your session. You will not receive a refund. Continue?',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes, Cancel',
            style: 'destructive',
            onPress: async () => {
              try {
                await db.cancelBooking(booking.id, booking.slot_id);
                // No refund - client loses the session
                Alert.alert('Cancelled', 'Session cancelled. No refund issued due to late cancellation.');
                loadUserAndData();
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to cancel booking');
              }
            },
          },
        ]
      );
    } else {
      // More than 48 hours - full refund
      Alert.alert(
        'Cancel Booking',
        'Are you sure you want to cancel this booking? Your session will be refunded.',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes, Cancel',
            style: 'destructive',
            onPress: async () => {
              try {
                await db.cancelBooking(booking.id, booking.slot_id);
                await db.refundCredit(
                  clientId,
                  `Refund for cancelled booking on ${format(parseISO(booking.slots.start_time), 'MMM d')}`
                );
                Alert.alert('Success', 'Booking cancelled and session refunded');
                loadUserAndData();
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to cancel booking');
              }
            },
          },
        ]
      );
    }
  };

  const getWeekDays = () => {
    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
    return Array.from({ length: 5 }, (_, i) => addDays(weekStart, i)); // Mon-Fri
  };

  const getSlotsForDay = (day: Date) => {
    return slots.filter((slot) => isSameDay(parseISO(slot.start_time), day));
  };

  const isSlotBooked = (slotId: string) => {
    return myBookings.some((b) => b.slot_id === slotId && b.status === 'booked');
  };

  const getSlotAvailability = (slot: any) => {
    return slot.capacity - (slot.booked_count || 0);
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
        <Text style={styles.headerTitle}>Book a Session</Text>
        <View style={styles.creditsHeader}>
          <Ionicons name="wallet" size={20} color="#3b82f6" />
          <Text style={styles.creditsText}>{creditBalance} sessions</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Week Navigation */}
        <View style={styles.weekNavigation}>
          <TouchableOpacity
            onPress={() => setCurrentWeek(addDays(currentWeek, -7))}
            style={styles.navButton}
          >
            <Ionicons name="chevron-back" size={24} color="#3b82f6" />
          </TouchableOpacity>
          <Text style={styles.weekText}>
            {format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM d')} -{' '}
            {format(addDays(startOfWeek(currentWeek, { weekStartsOn: 1 }), 6), 'MMM d, yyyy')}
          </Text>
          <TouchableOpacity
            onPress={() => setCurrentWeek(addDays(currentWeek, 7))}
            style={styles.navButton}
          >
            <Ionicons name="chevron-forward" size={24} color="#3b82f6" />
          </TouchableOpacity>
        </View>

        {/* Week Schedule */}
        {getWeekDays().map((day) => {
          const daySlots = getSlotsForDay(day);
          return (
            <View key={day.toISOString()} style={styles.daySection}>
              <Text style={styles.dayTitle}>{format(day, 'EEEE, MMM d')}</Text>
              {daySlots.length > 0 ? (
                daySlots.map((slot) => {
                  const available = getSlotAvailability(slot);
                  const booked = isSlotBooked(slot.id);
                  return (
                    <TouchableOpacity
                      key={slot.id}
                      style={[
                        styles.slotCard,
                        booked && styles.slotCardBooked,
                        available === 0 && styles.slotCardFull,
                      ]}
                      onPress={() => {
                        if (!booked && available > 0) {
                          setSelectedSlot(slot);
                          setShowConfirmModal(true);
                        }
                      }}
                      disabled={booked || available === 0}
                    >
                      <View style={styles.slotInfo}>
                        <Ionicons
                          name={booked ? 'checkmark-circle' : 'time-outline'}
                          size={24}
                          color={booked ? '#10b981' : available > 0 ? '#3b82f6' : '#9ca3af'}
                        />
                        <View style={styles.slotDetails}>
                          <Text style={styles.slotTime}>
                            {format(parseISO(slot.start_time), 'h:mm a')} -{' '}
                            {format(parseISO(slot.end_time), 'h:mm a')}
                          </Text>
                          <Text style={styles.slotLocation}>
                            {slot.location || 'Elevate Gym'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.slotStatus}>
                        {booked ? (
                          <Text style={styles.statusBooked}>Booked</Text>
                        ) : available > 0 ? (
                          <Text style={styles.statusAvailable}>{available} spots left</Text>
                        ) : (
                          <Text style={styles.statusFull}>Full</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.emptyDay}>
                  <Text style={styles.emptyDayText}>No sessions available</Text>
                </View>
              )}
            </View>
          );
        })}

        {/* My Bookings */}
        <View style={styles.myBookingsSection}>
          <Text style={styles.sectionTitle}>My Bookings</Text>
          {myBookings.filter((b) => b.status === 'booked').length > 0 ? (
            myBookings
              .filter((b) => b.status === 'booked' && new Date(b.slots.start_time) > new Date())
              .map((booking) => (
                <View key={booking.id} style={styles.bookingCard}>
                  <View style={styles.bookingInfo}>
                    <Ionicons name="calendar" size={20} color="#10b981" />
                    <View style={styles.bookingDetails}>
                      <Text style={styles.bookingDate}>
                        {format(parseISO(booking.slots.start_time), 'EEEE, MMM d')}
                      </Text>
                      <Text style={styles.bookingTime}>
                        {format(parseISO(booking.slots.start_time), 'h:mm a')} -{' '}
                        {format(parseISO(booking.slots.end_time), 'h:mm a')}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => handleCancelBooking(booking)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyStateText}>No upcoming bookings</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal visible={showConfirmModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Booking</Text>
            {selectedSlot && (
              <>
                <Text style={styles.modalText}>
                  {format(parseISO(selectedSlot.start_time), 'EEEE, MMMM d')}
                </Text>
                <Text style={styles.modalText}>
                  {format(parseISO(selectedSlot.start_time), 'h:mm a')} -{' '}
                  {format(parseISO(selectedSlot.end_time), 'h:mm a')}
                </Text>
                <Text style={styles.modalSubtext}>
                  {selectedSlot.location || 'Elevate Gym'}
                </Text>
                <Text style={styles.modalCost}>Cost: 1 session</Text>
                <Text style={styles.modalPolicy}>
                  Cancel up to 48 hours before for full refund
                </Text>
              </>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => {
                  setShowConfirmModal(false);
                  setSelectedSlot(null);
                }}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonConfirm}
                onPress={handleBookSlot}
                disabled={bookingLoading}
              >
                {bookingLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.modalButtonConfirmText}>Confirm</Text>
                )}
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
    backgroundColor: '#f8fafc',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  creditsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  creditsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
  },
  weekNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  weekText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  daySection: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
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
  slotCardBooked: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  slotCardFull: {
    opacity: 0.5,
  },
  slotInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  slotDetails: {
    marginLeft: 12,
  },
  slotTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  slotLocation: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  slotStatus: {
    alignItems: 'flex-end',
  },
  statusAvailable: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  statusBooked: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
  statusFull: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '600',
  },
  emptyDay: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  emptyDayText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  myBookingsSection: {
    paddingHorizontal: 20,
    marginTop: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  bookingCard: {
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
  bookingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bookingDetails: {
    marginLeft: 12,
  },
  bookingDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  bookingTime: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalCost: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3b82f6',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalPolicy: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  modalButtonCancelText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  modalButtonConfirm: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});

export default BookingScreen;
