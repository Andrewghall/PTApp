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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, supabase } from '../lib/supabase';
import { format, parseISO, differenceInMonths, differenceInDays } from 'date-fns';

const logoBanner = require('../../logo banner.png');

interface ClientDetailsScreenProps {
  navigation: any;
  route: any;
}

const ClientDetailsScreen: React.FC<ClientDetailsScreenProps> = ({ navigation, route }) => {
  const { clientId } = route.params;
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    loadClientAnalytics();
  }, [clientId]);

  const loadClientAnalytics = async () => {
    try {
      // Load client profile
      const { data: profile } = await supabase
        .from('client_profiles')
        .select(`
          *,
          profiles (email),
          credit_balances (balance)
        `)
        .eq('id', clientId)
        .single();

      setClientData(profile);

      // Load all bookings
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          *,
          slots (start_time, end_time)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      // Load credit transactions
      const { data: transactions } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      // Load workouts
      const { data: workouts } = await supabase
        .from('workouts')
        .select(`
          *,
          workout_exercises (
            *,
            set_entries (*),
            exercises (name, category)
          )
        `)
        .eq('client_id', clientId)
        .order('date', { ascending: false });

      // Calculate analytics
      const totalBookings = bookings?.length || 0;
      const completedSessions = bookings?.filter(b => b.status === 'completed').length || 0;
      const cancelledSessions = bookings?.filter(b => b.status === 'cancelled').length || 0;
      const missedSessions = bookings?.filter(b => b.status === 'no_show').length || 0;
      const attendanceRate = totalBookings > 0 ? Math.round((completedSessions / totalBookings) * 100) : 0;

      // Calculate total spend
      const totalSpend = transactions
        ?.filter(t => t.type === 'purchase')
        .reduce((sum, t) => sum + (t.amount * 25), 0) || 0; // €25 per credit

      // Calculate membership duration
      const memberSince = profile?.created_at ? new Date(profile.created_at) : null;
      const monthsActive = memberSince ? differenceInMonths(new Date(), memberSince) : 0;
      const daysActive = memberSince ? differenceInDays(new Date(), memberSince) : 0;

      // Get workout improvements (compare first vs recent workouts)
      const firstWorkouts = workouts?.slice(-5) || [];
      const recentWorkouts = workouts?.slice(0, 5) || [];

      const calculateAverageVolume = (workoutList: any[]) => {
        let totalVolume = 0;
        let count = 0;
        workoutList.forEach(w => {
          w.workout_exercises?.forEach((we: any) => {
            we.set_entries?.forEach((set: any) => {
              totalVolume += set.weight * set.reps;
              count++;
            });
          });
        });
        return count > 0 ? totalVolume / count : 0;
      };

      const firstAvgVolume = calculateAverageVolume(firstWorkouts);
      const recentAvgVolume = calculateAverageVolume(recentWorkouts);
      const volumeImprovement = firstAvgVolume > 0
        ? Math.round(((recentAvgVolume - firstAvgVolume) / firstAvgVolume) * 100)
        : 0;

      setAnalytics({
        totalBookings,
        completedSessions,
        cancelledSessions,
        missedSessions,
        attendanceRate,
        totalSpend,
        monthsActive,
        daysActive,
        memberSince,
        totalWorkouts: workouts?.length || 0,
        volumeImprovement,
        recentBookings: bookings?.slice(0, 10) || [],
        recentTransactions: transactions?.slice(0, 10) || [],
      });

    } catch (error) {
      console.error('Error loading client analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!clientData) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Client not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Hero Banner */}
      <Image source={logoBanner} style={styles.heroBanner} resizeMode="cover" />

      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <View style={styles.hamburgerIcon}>
            <View style={styles.backArrow} />
          </View>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Client Header */}
        <View style={styles.clientHeader}>
          <View style={styles.clientAvatar}>
            <Text style={styles.clientAvatarText}>
              {clientData.first_name?.[0]}{clientData.last_name?.[0]}
            </Text>
          </View>
          <Text style={styles.clientHeaderName}>
            {clientData.first_name} {clientData.last_name}
          </Text>
          <Text style={styles.clientHeaderEmail}>{clientData.profiles?.email}</Text>
          <View style={styles.memberSinceBadge}>
            <Text style={styles.memberSinceText}>
              Member for {analytics?.monthsActive} months ({analytics?.daysActive} days)
            </Text>
          </View>

          <TouchableOpacity
            style={styles.messageButton}
            onPress={() => navigation.navigate('Messages')}
          >
            <Ionicons name="chatbubbles" size={20} color="white" />
            <Text style={styles.messageButtonText}>Send Message</Text>
          </TouchableOpacity>
        </View>

        {/* Key Metrics Grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={[styles.metricIconContainer, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="calendar" size={24} color="#3b82f6" />
            </View>
            <Text style={styles.metricValue}>{analytics?.completedSessions}</Text>
            <Text style={styles.metricLabel}>Sessions Completed</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconContainer, { backgroundColor: '#fef2f2' }]}>
              <Ionicons name="close-circle" size={24} color="#ef4444" />
            </View>
            <Text style={styles.metricValue}>{analytics?.missedSessions}</Text>
            <Text style={styles.metricLabel}>Sessions Missed</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconContainer, { backgroundColor: '#f0fdf4' }]}>
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
            </View>
            <Text style={styles.metricValue}>{analytics?.attendanceRate}%</Text>
            <Text style={styles.metricLabel}>Attendance Rate</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconContainer, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="wallet" size={24} color="#f59e0b" />
            </View>
            <Text style={styles.metricValue}>€{analytics?.totalSpend}</Text>
            <Text style={styles.metricLabel}>Total Spend</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconContainer, { backgroundColor: '#ede9fe' }]}>
              <Ionicons name="fitness" size={24} color="#8b5cf6" />
            </View>
            <Text style={styles.metricValue}>{analytics?.totalWorkouts}</Text>
            <Text style={styles.metricLabel}>Workouts Logged</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconContainer, { backgroundColor: '#e0f2fe' }]}>
              <Ionicons name="trending-up" size={24} color="#0284c7" />
            </View>
            <Text style={styles.metricValue}>
              {analytics?.volumeImprovement > 0 ? '+' : ''}{analytics?.volumeImprovement}%
            </Text>
            <Text style={styles.metricLabel}>Volume Improvement</Text>
          </View>
        </View>

        {/* Current Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Status</Text>
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Credit Balance:</Text>
              <Text style={[
                styles.statusValue,
                (clientData.credit_balances?.balance || 0) <= 2 && { color: '#ef4444', fontWeight: '600' }
              ]}>
                {clientData.credit_balances?.balance || 0} credits
                {(clientData.credit_balances?.balance || 0) <= 2 && " ⚠️"}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Member Since:</Text>
              <Text style={styles.statusValue}>
                {analytics?.memberSince ? format(analytics.memberSince, 'MMM d, yyyy') : 'N/A'}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Total Bookings:</Text>
              <Text style={styles.statusValue}>{analytics?.totalBookings}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Cancelled Sessions:</Text>
              <Text style={styles.statusValue}>{analytics?.cancelledSessions}</Text>
            </View>
          </View>
        </View>

        {/* Recent Bookings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Bookings</Text>
          {analytics?.recentBookings.length > 0 ? (
            analytics.recentBookings.map((booking: any) => (
              <View key={booking.id} style={styles.bookingCard}>
                <View style={styles.bookingInfo}>
                  <Text style={styles.bookingDate}>
                    {booking.slots?.start_time
                      ? format(parseISO(booking.slots.start_time), 'EEE, MMM d, yyyy')
                      : 'N/A'}
                  </Text>
                  <Text style={styles.bookingTime}>
                    {booking.slots?.start_time
                      ? format(parseISO(booking.slots.start_time), 'h:mm a')
                      : 'N/A'}
                  </Text>
                </View>
                <View style={[
                  styles.bookingStatusBadge,
                  booking.status === 'completed' && styles.statusCompleted,
                  booking.status === 'cancelled' && styles.statusCancelled,
                  booking.status === 'no_show' && styles.statusNoShow,
                  booking.status === 'confirmed' && styles.statusConfirmed,
                ]}>
                  <Text style={styles.bookingStatusText}>
                    {booking.status.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No bookings yet</Text>
          )}
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {analytics?.recentTransactions.length > 0 ? (
            analytics.recentTransactions.map((transaction: any) => (
              <View key={transaction.id} style={styles.transactionCard}>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionDescription}>{transaction.description}</Text>
                  <Text style={styles.transactionDate}>
                    {format(parseISO(transaction.created_at), 'MMM d, yyyy')}
                  </Text>
                </View>
                <Text style={[
                  styles.transactionAmount,
                  transaction.type === 'purchase' ? styles.amountPositive : styles.amountNegative
                ]}>
                  {transaction.type === 'purchase' ? '+' : '-'}{transaction.amount} credits
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No transactions yet</Text>
          )}
        </View>
      </ScrollView>
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
  errorText: {
    fontSize: 18,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 40,
  },
  heroBanner: {
    width: '100%',
    height: 160,
  },
  heroBanner: {
    width: '100%',
    height: 160,
  },
  headerContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hamburgerIcon: {
    marginRight: 8,
  },
  backArrow: {
    width: 20,
    height: 3,
    backgroundColor: '#1f2937',
  },
  backButtonText: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    paddingTop: 16,
  },
  clientHeader: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  clientAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  clientAvatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  clientHeaderName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  clientHeaderEmail: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 12,
  },
  memberSinceBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  memberSinceText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 12,
  },
  metricCard: {
    width: '31%',
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
  metricIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  section: {
    padding: 20,
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
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
    marginBottom: 16,
  },
  statusCard: {
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  statusLabel: {
    fontSize: 15,
    color: '#6b7280',
  },
  statusValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  bookingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  bookingInfo: {
    flex: 1,
  },
  bookingDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  bookingTime: {
    fontSize: 14,
    color: '#6b7280',
  },
  bookingStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusCompleted: {
    backgroundColor: '#d1fae5',
  },
  statusCancelled: {
    backgroundColor: '#fee2e2',
  },
  statusNoShow: {
    backgroundColor: '#fef3c7',
  },
  statusConfirmed: {
    backgroundColor: '#dbeafe',
  },
  bookingStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 15,
    color: '#1f2937',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 13,
    color: '#9ca3af',
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '600',
  },
  amountPositive: {
    color: '#10b981',
  },
  amountNegative: {
    color: '#6b7280',
  },
  emptyText: {
    fontSize: 15,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default ClientDetailsScreen;
