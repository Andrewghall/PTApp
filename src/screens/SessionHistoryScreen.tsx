import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../lib/supabase';
import { format, isPast } from 'date-fns';

// Import the logo banner image
const logoBanner = require('../../logo banner.png');

interface SessionHistoryScreenProps {
  navigation: any;
}

const SessionHistoryScreen: React.FC<SessionHistoryScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [sessionNote, setSessionNote] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { session } = await auth.getSession();
      if (!session) return;

      const { data: profile } = await db.getClientProfile(session.user.id);
      if (!profile) return;

      setClientId(profile.id);

      // Get all bookings
      const { data: allBookings } = await db.getClientBookings(profile.id);

      // Get all workouts for this client
      const { data: allWorkouts } = await db.getClientWorkouts(profile.id, 100);
      setWorkouts(allWorkouts || []);

      if (allBookings) {
        // Filter to only show PAST sessions (history should not include future sessions)
        const now = new Date();
        const pastBookings = allBookings.filter(b => {
          const sessionTime = new Date(b.slots.start_time);
          return sessionTime < now;
        });

        // Sort by date, most recent first
        const sorted = pastBookings.sort((a, b) => {
          return new Date(b.slots.start_time).getTime() - new Date(a.slots.start_time).getTime();
        });
        setBookings(sorted);
      }
    } catch (error) {
      console.error('Error loading session history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWorkoutForSession = (booking: any) => {
    // Get the date of the session
    const sessionDate = format(new Date(booking.slots.start_time), 'yyyy-MM-dd');

    // Find workout logged on this date
    return workouts.find(w => w.date === sessionDate);
  };

  const viewSessionNotes = async (booking: any) => {
    setSelectedBooking(booking);

    // Try to load session notes
    try {
      const { data } = await db.getSessionNote(booking.id);
      if (data) {
        setSessionNote(data);
      } else {
        setSessionNote(null);
      }
    } catch (error) {
      setSessionNote(null);
    }

    setShowNotesModal(true);
  };

  const getStatusBadge = (booking: any) => {
    const sessionTime = new Date(booking.slots.start_time);
    const now = new Date();

    if (booking.status === 'cancelled') {
      return { text: 'Cancelled', color: '#ef4444', icon: 'close-circle' };
    }

    if (booking.attended === true) {
      return { text: 'Attended', color: '#10b981', icon: 'checkmark-circle' };
    }

    if (booking.no_show === true) {
      return { text: 'No Show', color: '#f59e0b', icon: 'alert-circle' };
    }

    if (isPast(sessionTime)) {
      return { text: 'Completed', color: '#6b7280', icon: 'time' };
    }

    return { text: 'Upcoming', color: '#3b82f6', icon: 'calendar' };
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

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Past PT Sessions</Text>
          <Text style={styles.headerSubtitle}>
            {bookings.length} past appointment{bookings.length !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.headerNote}>
            To view workout logs, go to Dashboard → Log Workout and navigate to past dates
          </Text>
        </View>

        {/* Stats Summary */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={24} color="#10b981" />
            <Text style={styles.statValue}>
              {bookings.filter(b => b.attended === true).length}
            </Text>
            <Text style={styles.statLabel}>Attended</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={24} color="#3b82f6" />
            <Text style={styles.statValue}>
              {bookings.filter(b => b.status === 'booked' && !isPast(new Date(b.slots.start_time))).length}
            </Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="close-circle" size={24} color="#ef4444" />
            <Text style={styles.statValue}>
              {bookings.filter(b => b.status === 'cancelled').length}
            </Text>
            <Text style={styles.statLabel}>Cancelled</Text>
          </View>
        </View>

        {/* Sessions List */}
        {bookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No sessions yet</Text>
            <Text style={styles.emptyStateSubtext}>Your session history will appear here</Text>
          </View>
        ) : (
          <View style={styles.sessionsContainer}>
            {bookings.map((booking) => {
              const status = getStatusBadge(booking);
              const isPastSession = isPast(new Date(booking.slots.start_time));
              const workout = getWorkoutForSession(booking);
              const exerciseCount = workout?.workout_exercises?.length || 0;

              return (
                <TouchableOpacity
                  key={booking.id}
                  style={styles.sessionCard}
                  onPress={() => isPastSession && viewSessionNotes(booking)}
                  disabled={!isPastSession}
                >
                  <View style={styles.sessionHeader}>
                    <View style={styles.sessionDateContainer}>
                      <Text style={styles.sessionDate}>
                        {format(new Date(booking.slots.start_time), 'MMM d, yyyy')}
                      </Text>
                      <Text style={styles.sessionTime}>
                        {format(new Date(booking.slots.start_time), 'h:mm a')} -{' '}
                        {format(new Date(booking.slots.end_time), 'h:mm a')}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
                      <Ionicons name={status.icon as any} size={14} color="white" />
                      <Text style={styles.statusText}>{status.text}</Text>
                    </View>
                  </View>

                  <View style={styles.sessionDetails}>
                    <View style={styles.sessionDetailRow}>
                      <Ionicons name="location" size={16} color="#6b7280" />
                      <Text style={styles.sessionDetailText}>
                        {booking.slots.location || 'Elevate Gym'}
                      </Text>
                    </View>

                    {workout ? (
                      <View style={styles.sessionDetailRow}>
                        <Ionicons name="barbell" size={16} color="#10b981" />
                        <Text style={[styles.sessionDetailText, { color: '#10b981' }]}>
                          {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''} logged
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.sessionDetailRow}>
                        <Ionicons name="alert-circle" size={16} color="#f59e0b" />
                        <Text style={[styles.sessionDetailText, { color: '#f59e0b' }]}>
                          No workout logged
                        </Text>
                      </View>
                    )}

                    {isPastSession && (
                      <View style={styles.sessionDetailRow}>
                        <Ionicons name="document-text" size={16} color="#6b7280" />
                        <Text style={styles.sessionDetailText}>
                          Tap to view details
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Session Notes Modal */}
      <Modal
        visible={showNotesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNotesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Session Details</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowNotesModal(false);
                  setSelectedBooking(null);
                  setSessionNote(null);
                }}
              >
                <Ionicons name="close" size={28} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {selectedBooking && (
              <ScrollView style={styles.modalBody}>
                {/* Session Info */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Session Information</Text>
                  <View style={styles.modalInfoRow}>
                    <Ionicons name="calendar" size={20} color="#3b82f6" />
                    <Text style={styles.modalInfoText}>
                      {format(new Date(selectedBooking.slots.start_time), 'EEEE, MMMM d, yyyy')}
                    </Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <Ionicons name="time" size={20} color="#3b82f6" />
                    <Text style={styles.modalInfoText}>
                      {format(new Date(selectedBooking.slots.start_time), 'h:mm a')} -{' '}
                      {format(new Date(selectedBooking.slots.end_time), 'h:mm a')}
                    </Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <Ionicons name="location" size={20} color="#3b82f6" />
                    <Text style={styles.modalInfoText}>
                      {selectedBooking.slots.location || 'Elevate Gym'}
                    </Text>
                  </View>
                </View>

                {/* PT Notes */}
                {sessionNote ? (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>PT Feedback</Text>

                    {sessionNote.performance_rating && (
                      <View style={styles.ratingContainer}>
                        <Text style={styles.ratingLabel}>Performance:</Text>
                        <View style={styles.stars}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Ionicons
                              key={star}
                              name={star <= sessionNote.performance_rating ? 'star' : 'star-outline'}
                              size={20}
                              color="#f59e0b"
                            />
                          ))}
                        </View>
                      </View>
                    )}

                    <View style={styles.notesBox}>
                      <Text style={styles.notesText}>{sessionNote.pt_notes}</Text>
                    </View>

                    {sessionNote.next_session_focus && (
                      <>
                        <Text style={styles.focusLabel}>Next Session Focus:</Text>
                        <View style={styles.focusBox}>
                          <Text style={styles.focusText}>{sessionNote.next_session_focus}</Text>
                        </View>
                      </>
                    )}
                  </View>
                ) : (
                  <View style={styles.modalSection}>
                    <View style={styles.noNotesBox}>
                      <Ionicons name="document-text-outline" size={48} color="#d1d5db" />
                      <Text style={styles.noNotesText}>No PT notes available</Text>
                      <Text style={styles.noNotesSubtext}>
                        Your trainer hasn't added feedback for this session yet
                      </Text>
                    </View>
                  </View>
                )}
              </ScrollView>
            )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  headerNote: {
    fontSize: 12,
    color: '#3b82f6',
    marginTop: 8,
    fontStyle: 'italic',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  sessionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sessionCard: {
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
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sessionDateContainer: {
    flex: 1,
  },
  sessionDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  sessionTime: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  sessionDetails: {
    gap: 8,
  },
  sessionDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionDetailText: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9ca3af',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#d1d5db',
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
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
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  modalInfoText: {
    fontSize: 15,
    color: '#4b5563',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937',
    marginRight: 8,
  },
  stars: {
    flexDirection: 'row',
    gap: 4,
  },
  notesBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  notesText: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
  },
  focusLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 8,
  },
  focusBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  focusText: {
    fontSize: 15,
    color: '#1e40af',
    lineHeight: 22,
  },
  noNotesBox: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noNotesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
    marginTop: 12,
  },
  noNotesSubtext: {
    fontSize: 14,
    color: '#d1d5db',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default SessionHistoryScreen;
