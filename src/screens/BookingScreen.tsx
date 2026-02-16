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
import { HamburgerButton, HamburgerMenu } from '../components/HamburgerMenu';

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
  const [myWaitlist, setMyWaitlist] = useState<any[]>([]);
  const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [userRole, setUserRole] = useState<'client' | 'admin'>('client');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ date: '', time: '', remaining: 0 });

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

          // Get user role
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          if (userProfile?.role) {
            setUserRole(userProfile.role);
          }

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

          // Load my waitlist
          const { data: waitlistData } = await db.getClientWaitlist(profile.id);
          setMyWaitlist(waitlistData || []);
        }
      }
    } catch (error) {
      console.error('Error loading booking data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookSlot = async () => {
    console.log('=== BOOKING ATTEMPT ===');
    console.log('Client ID:', clientId);
    console.log('Selected Slot:', selectedSlot);
    console.log('Credit Balance (UI state):', creditBalance);

    if (!clientId || !selectedSlot) {
      console.log('Missing clientId or selectedSlot');
      Alert.alert('Error', 'Missing client or slot information. Please try again.');
      return;
    }

    setBookingLoading(true);
    try {
      // CRITICAL: Check actual balance from database RIGHT NOW
      const { data: currentBalance } = await db.getCreditBalance(clientId);
      const actualBalance = currentBalance?.balance || 0;
      console.log('ACTUAL credit balance from DB:', actualBalance);

      if (actualBalance < 1) {
        console.log('Insufficient credits - actual balance:', actualBalance);
        setShowConfirmModal(false);
        setShowNoCreditsModal(true);
        setBookingLoading(false);
        return;
      }

      console.log('Deducting credit FIRST (before booking)...');
      // DEDUCT CREDIT FIRST - this will fail if balance is insufficient
      const { error: creditError } = await db.deductCredit(
        clientId,
        `Booking for ${format(parseISO(selectedSlot.start_time), 'MMM d, h:mm a')}`
      );
      if (creditError) {
        console.error('Credit deduction error:', creditError);
        if (creditError.message?.includes('No credits')) {
          setShowConfirmModal(false);
          setShowNoCreditsModal(true);
          setBookingLoading(false);
          return;
        }
        throw creditError;
      }
      console.log('Credit deducted successfully');

      console.log('Creating booking...');
      // NOW create booking (credit already deducted)
      const { error: bookingError } = await db.createBooking(selectedSlot.id, clientId);
      if (bookingError) {
        console.error('Booking error:', bookingError);
        // CRITICAL: Refund the credit if booking fails!
        await db.refundCredit(clientId, `Refund - booking failed for ${format(parseISO(selectedSlot.start_time), 'MMM d')}`);
        throw bookingError;
      }
      console.log('Booking created successfully');

      // Calculate new balance and save message data
      const newBalance = creditBalance - 1;
      const sessionDate = format(parseISO(selectedSlot.start_time), 'EEEE, MMM d');
      const sessionTime = format(parseISO(selectedSlot.start_time), 'h:mm a');

      // Set success message data FIRST
      setSuccessMessage({
        date: sessionDate,
        time: sessionTime,
        remaining: newBalance
      });

      // Close confirm modal and show success modal immediately (no flash)
      setShowConfirmModal(false);
      setShowSuccessModal(true);
      setSelectedSlot(null);

      // Reload data in background (after modals are already switched)
      await loadUserAndData();
    } catch (error: any) {
      console.error('Booking failed:', error);
      Alert.alert('Booking Failed', error.message || 'Failed to book session. Please try again.');
      setShowConfirmModal(false);
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelBooking = async (booking: any) => {
    if (!clientId) return;

    // Get the slot_id - it might be nested or direct
    const slotId = booking.slot_id || booking.slots?.id;
    if (!slotId) {
      Alert.alert('Error', 'Unable to cancel booking - slot information missing');
      return;
    }

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
                await db.cancelBooking(booking.id, slotId);
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
                await db.cancelBooking(booking.id, slotId);
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

  const isOnWaitlist = (slotId: string) => {
    return myWaitlist.some((w) => w.slot_id === slotId && w.status === 'waiting');
  };

  const handleJoinWaitlist = async (slot: any) => {
    if (!clientId) return;

    try {
      const { error } = await db.joinWaitlist(slot.id, clientId);
      if (error) throw error;

      Alert.alert('Success', 'You\'ve been added to the waitlist! We\'ll notify you if a spot opens up.');
      loadUserAndData(); // Refresh data
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to join waitlist');
    }
  };

  const handleLeaveWaitlist = async (slotId: string) => {
    if (!clientId) return;

    const waitlistEntry = myWaitlist.find(w => w.slot_id === slotId);
    if (!waitlistEntry) return;

    Alert.alert(
      'Leave Waitlist',
      'Are you sure you want to leave the waitlist?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await db.leaveWaitlist(waitlistEntry.id);
              if (error) throw error;

              Alert.alert('Success', 'You\'ve been removed from the waitlist');
              loadUserAndData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to leave waitlist');
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
        <Text style={styles.headerTitle}>Book a Session</Text>
        <View style={styles.creditsHeader}>
          <Ionicons name="wallet" size={20} color="#3b82f6" />
          <Text style={styles.creditsText}>{creditBalance} sessions left</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Week Navigation */}
        <View style={styles.weekNavigation}>
          <TouchableOpacity
            onPress={() => setCurrentWeek(addDays(currentWeek, -7))}
            style={styles.navButton}
          >
            <Text style={styles.navButtonText}>Previous</Text>
          </TouchableOpacity>
          <Text style={styles.weekText}>
            {format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM d')} -{' '}
            {format(addDays(startOfWeek(currentWeek, { weekStartsOn: 1 }), 6), 'MMM d, yyyy')}
          </Text>
          <TouchableOpacity
            onPress={() => setCurrentWeek(addDays(currentWeek, 7))}
            style={styles.navButton}
          >
            <Text style={styles.navButtonText}>Next</Text>
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
                  const onWaitlist = isOnWaitlist(slot.id);
                  const isFull = available === 0;

                  return (
                    <View key={slot.id} style={styles.slotWrapper}>
                      <TouchableOpacity
                        style={[
                          styles.slotCard,
                          booked && styles.slotCardBooked,
                          isFull && styles.slotCardFull,
                        ]}
                        onPress={() => {
                          if (!booked && available > 0) {
                            setSelectedSlot(slot);
                            setShowConfirmModal(true);
                          }
                        }}
                        disabled={booked || isFull}
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

                      {/* Waitlist button for full slots */}
                      {!booked && isFull && (
                        <TouchableOpacity
                          style={[
                            styles.waitlistButton,
                            onWaitlist && styles.waitlistButtonActive
                          ]}
                          onPress={() => onWaitlist ? handleLeaveWaitlist(slot.id) : handleJoinWaitlist(slot)}
                        >
                          <Ionicons
                            name={onWaitlist ? 'checkmark-circle' : 'list'}
                            size={16}
                            color={onWaitlist ? '#10b981' : '#f59e0b'}
                          />
                          <Text style={[
                            styles.waitlistButtonText,
                            onWaitlist && styles.waitlistButtonTextActive
                          ]}>
                            {onWaitlist ? 'On Waitlist' : 'Join Waitlist'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
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

      {/* No Credits Modal */}
      <Modal visible={showNoCreditsModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.noCreditsIconContainer}>
              <Ionicons name="card-outline" size={64} color="#ef4444" />
            </View>
            <Text style={styles.modalTitle}>No Credits Available</Text>
            <Text style={styles.noCreditsMessage}>
              You have no credits to make a booking. Please buy more credits to book a session.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => {
                  setShowNoCreditsModal(false);
                  setSelectedSlot(null);
                }}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonConfirm}
                onPress={() => {
                  setShowNoCreditsModal(false);
                  setSelectedSlot(null);
                  navigation.navigate('Credits');
                }}
              >
                <Text style={styles.modalButtonConfirmText}>Buy Credits</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#10b981" />
            </View>
            <Text style={styles.modalTitle}>Booking Confirmed! ✅</Text>
            <Text style={styles.successMessage}>
              Your session on {successMessage.date} at {successMessage.time} has been booked.
            </Text>
            <Text style={styles.remainingCredits}>
              Remaining Credits: {successMessage.remaining}
            </Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.successButtonText}>OK</Text>
            </TouchableOpacity>
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: '#F1F5F9',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
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
  slotWrapper: {
    marginBottom: 8,
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
  waitlistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    gap: 6,
  },
  waitlistButtonActive: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  waitlistButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f59e0b',
  },
  waitlistButtonTextActive: {
    color: '#10b981',
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
  noCreditsIconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  noCreditsMessage: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  successIconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 16,
    color: '#1f2937',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
  },
  remainingCredits: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3b82f6',
    textAlign: 'center',
    marginBottom: 24,
  },
  successButton: {
    width: '100%',
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#10b981',
    alignItems: 'center',
  },
  successButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});

export default BookingScreen;
