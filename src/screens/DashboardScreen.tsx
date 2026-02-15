import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { db, supabase } from '../lib/supabase';
import { format, parseISO } from 'date-fns';

// Import the logo banner image
const logoBanner = require('../../logo banner.png');

interface DashboardScreenProps {
  navigation: any;
  onLogout: () => void;
  userId: string;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation, onLogout, userId }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [creditBalance, setCreditBalance] = useState(0);
  const [nextBooking, setNextBooking] = useState<any>(null);
  const [recentWorkouts, setRecentWorkouts] = useState<any[]>([]);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, [userId]);

  const loadDashboardData = async () => {
    try {
      // Get client profile
      const { data: profile } = await db.getClientProfile(userId);
      if (profile) {
        setClientProfile(profile);
        setUserName(`${profile.first_name} ${profile.last_name}`);

        // Get credit balance
        const { data: credits } = await db.getCreditBalance(profile.id);
        setCreditBalance(credits?.balance || 0);

        // Get next upcoming booking
        const { data: bookings } = await db.getClientBookings(profile.id, 'booked');
        if (bookings && bookings.length > 0) {
          const upcoming = bookings
            .filter((b: any) => b.slots && new Date(b.slots.start_time) > new Date())
            .sort((a: any, b: any) => new Date(a.slots.start_time).getTime() - new Date(b.slots.start_time).getTime());
          if (upcoming.length > 0) {
            setNextBooking(upcoming[0]);
          }
        }

        // Get recent workouts
        const { data: workouts } = await db.getClientWorkouts(profile.id, 5);
        setRecentWorkouts(workouts || []);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleCancelBooking = async (booking: any) => {
    if (!clientProfile) return;

    // Get the slot_id
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
                Alert.alert('Cancelled', 'Session cancelled. No refund issued due to late cancellation.');
                loadDashboardData();
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
                  clientProfile.id,
                  `Refund for cancelled booking on ${format(parseISO(booking.slots.start_time), 'MMM d')}`
                );
                Alert.alert('Success', 'Booking cancelled and session refunded');
                loadDashboardData();
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to cancel booking');
              }
            },
          },
        ]
      );
    }
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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Hero Banner */}
        <Image source={logoBanner} style={styles.heroBanner} resizeMode="cover" />

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back!</Text>
            <Text style={styles.userName}>{userName}</Text>
          </View>
          <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color="#dc2626" />
          </TouchableOpacity>
        </View>

        {/* Credits Card */}
        <View style={styles.creditsCard}>
          <View style={styles.creditsHeader}>
            <Ionicons name="wallet" size={24} color="#3b82f6" />
            <Text style={styles.creditsTitle}>Sessions Remaining</Text>
          </View>
          <Text style={styles.creditsAmount}>{creditBalance}</Text>
          <Text style={styles.creditsSubtext}>Prepaid PT sessions</Text>
          <TouchableOpacity
            style={styles.buyCreditsButton}
            onPress={() => navigation.navigate('Credits')}
          >
            <Text style={styles.buyCreditsText}>Buy More Sessions</Text>
          </TouchableOpacity>
        </View>

        {/* Next Session */}
        {nextBooking ? (
          <View style={styles.sessionCard}>
            <View style={styles.sessionHeader}>
              <Ionicons name="calendar" size={24} color="#10b981" />
              <Text style={styles.sessionTitle}>Next Session</Text>
            </View>
            <Text style={styles.sessionDate}>
              {format(new Date(nextBooking.slots.start_time), 'EEEE, MMMM d')}
            </Text>
            <Text style={styles.sessionTime}>
              {format(new Date(nextBooking.slots.start_time), 'h:mm a')} -
              {format(new Date(nextBooking.slots.end_time), 'h:mm a')}
            </Text>
            <Text style={styles.sessionLocation}>
              {nextBooking.slots.location || 'Elevate Gym'}
            </Text>
            {(() => {
              const sessionTime = new Date(nextBooking.slots.start_time);
              const now = new Date();
              const hoursUntil = (sessionTime.getTime() - now.getTime()) / (1000 * 60 * 60);
              const cancellationDeadline = new Date(sessionTime.getTime() - 48 * 60 * 60 * 1000);

              if (hoursUntil > 48 && hoursUntil < 72) {
                // Between 48-72 hours - reminder to cancel if needed
                return (
                  <View style={styles.reminderBox}>
                    <Ionicons name="information-circle" size={16} color="#3b82f6" />
                    <Text style={styles.reminderText}>
                      Cancel by {format(cancellationDeadline, 'MMM d, h:mm a')} if needed
                    </Text>
                  </View>
                );
              } else if (hoursUntil <= 48 && hoursUntil > 0) {
                // Less than 48 hours - warning
                return (
                  <View style={styles.warningBox}>
                    <Ionicons name="alert-circle" size={16} color="#f59e0b" />
                    <Text style={styles.warningText}>
                      Cancellation deadline passed - session cannot be refunded
                    </Text>
                  </View>
                );
              }
              return null;
            })()}
            <View style={styles.sessionActions}>
              <TouchableOpacity
                style={styles.planWorkoutButton}
                onPress={() => {
                  // Navigate to Workout screen with the session date
                  const sessionDate = new Date(nextBooking.slots.start_time);
                  navigation.navigate('Workout', { selectedDate: sessionDate });
                }}
              >
                <Ionicons name="barbell" size={20} color="white" />
                <Text style={styles.planWorkoutButtonText}>Plan Workout</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelSessionButton}
                onPress={() => handleCancelBooking(nextBooking)}
              >
                <Ionicons name="close-circle" size={20} color="white" />
                <Text style={styles.cancelSessionButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.sessionCard}>
            <View style={styles.sessionHeader}>
              <Ionicons name="calendar-outline" size={24} color="#9ca3af" />
              <Text style={styles.sessionTitle}>No Upcoming Sessions</Text>
            </View>
            <Text style={styles.sessionSubtext}>Book your next PT session</Text>
            <TouchableOpacity
              style={styles.sessionButton}
              onPress={() => navigation.navigate('Book')}
            >
              <Text style={styles.sessionButtonText}>Book Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <QuickActionCard
            icon="calendar-outline"
            title="Book Session"
            subtitle="Schedule PT"
            onPress={() => navigation.navigate('Book')}
            color="#5B9FED"
          />
          <QuickActionCard
            icon="barbell-outline"
            title="Log Workout"
            subtitle="Track progress"
            onPress={() => navigation.navigate('Workout')}
            color="#5FD4A8"
          />
          <QuickActionCard
            icon="stats-chart-outline"
            title="View Progress"
            subtitle="See analytics"
            onPress={() => navigation.navigate('Analytics')}
            color="#A78BFA"
          />
          <QuickActionCard
            icon="person-outline"
            title="Profile"
            subtitle="Edit details"
            onPress={() => navigation.navigate('Profile')}
            color="#F5A962"
          />
        </View>

        {/* Recent Activity */}
        <Text style={styles.sectionTitle}>Recent Workouts</Text>
        {recentWorkouts.length > 0 ? (
          <View style={styles.workoutsList}>
            {recentWorkouts.slice(0, 3).map((workout, index) => (
              <TouchableOpacity
                key={workout.id}
                style={styles.workoutItem}
                onPress={() => navigation.navigate('Workout', { selectedDate: new Date(workout.date) })}
                activeOpacity={0.7}
              >
                <Ionicons name="barbell" size={20} color="#3b82f6" />
                <View style={styles.workoutDetails}>
                  <Text style={styles.workoutDate}>
                    {format(new Date(workout.date), 'MMM d, yyyy')}
                  </Text>
                  <Text style={styles.workoutExercises}>
                    {workout.workout_exercises?.length || 0} exercises
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="barbell-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No workouts yet</Text>
            <Text style={styles.emptyStateSubtext}>Start logging your training</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const QuickActionCard: React.FC<{
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  color: string;
}> = ({ icon, title, subtitle, onPress, color }) => (
  <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.8}>
    <View style={styles.actionCardInner}>
      <View style={[styles.iconCircle, { backgroundColor: color }]}>
        <Ionicons name={icon as any} size={32} color="#FFFFFF" style={{ zIndex: 10 }} />
      </View>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionSubtitle}>{subtitle}</Text>
    </View>
  </TouchableOpacity>
);

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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  heroBanner: {
    width: '100%',
    height: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  greeting: {
    fontSize: 14,
    color: '#6b7280',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  logoutButton: {
    padding: 8,
  },
  creditsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  creditsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  creditsTitle: {
    fontSize: 16,
    color: '#6b7280',
    marginLeft: 8,
  },
  creditsAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  creditsSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 16,
  },
  buyCreditsButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  buyCreditsText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  sessionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  sessionDate: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  sessionTime: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 4,
  },
  sessionLocation: {
    fontSize: 14,
    color: '#9ca3af',
  },
  sessionSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 12,
  },
  sessionButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  sessionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  actionCard: {
    width: '47%',
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  actionCardInner: {
    padding: 24,
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'center',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '400',
    textAlign: 'center',
  },
  workoutsList: {
    paddingHorizontal: 20,
  },
  workoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  workoutDetails: {
    marginLeft: 12,
    flex: 1,
  },
  workoutDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  workoutExercises: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#d1d5db',
    marginTop: 4,
  },
  reminderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  reminderText: {
    fontSize: 12,
    color: '#3b82f6',
    marginLeft: 6,
    flex: 1,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  warningText: {
    fontSize: 12,
    color: '#f59e0b',
    marginLeft: 6,
    flex: 1,
  },
  sessionActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  planWorkoutButton: {
    flex: 1,
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  planWorkoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelSessionButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  cancelSessionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DashboardScreen;
