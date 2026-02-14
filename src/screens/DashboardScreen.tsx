import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DashboardScreenProps {
  navigation: any;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  // Mock data - will be replaced with real data in Phase 2
  const mockData = {
    creditsRemaining: 8,
    nextSession: {
      date: 'Tomorrow',
      time: '10:00 AM',
      location: 'Gym A',
    },
    quickStats: {
      workoutsThisMonth: 12,
      averageWeight: 75.5,
      personalRecords: 3,
    },
  };

  const QuickActionCard: React.FC<{
    icon: string;
    title: string;
    subtitle: string;
    onPress: () => void;
    color: string;
  }> = ({ icon, title, subtitle, onPress, color }) => (
    <TouchableOpacity style={styles.actionCard} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: color }]}>
        <Ionicons name={icon as any} size={24} color="white" />
      </View>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome back!</Text>
          <Text style={styles.userName}>John Doe</Text>
        </View>

        {/* Credits Card */}
        <View style={styles.creditsCard}>
          <View style={styles.creditsHeader}>
            <Ionicons name="wallet" size={24} color="#3b82f6" />
            <Text style={styles.creditsTitle}>Credits Remaining</Text>
          </View>
          <Text style={styles.creditsAmount}>{mockData.creditsRemaining}</Text>
          <TouchableOpacity style={styles.buyCreditsButton}>
            <Text style={styles.buyCreditsText}>Buy More Credits</Text>
          </TouchableOpacity>
        </View>

        {/* Next Session */}
        <View style={styles.sessionCard}>
          <View style={styles.sessionHeader}>
            <Ionicons name="calendar" size={24} color="#10b981" />
            <Text style={styles.sessionTitle}>Next Session</Text>
          </View>
          <Text style={styles.sessionDate}>{mockData.nextSession.date}</Text>
          <Text style={styles.sessionTime}>{mockData.nextSession.time}</Text>
          <Text style={styles.sessionLocation}>{mockData.nextSession.location}</Text>
          <TouchableOpacity style={styles.sessionButton}>
            <Text style={styles.sessionButtonText}>View Details</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>
        
        <View style={styles.actionsGrid}>
          <QuickActionCard
            icon="calendar-outline"
            title="Book Session"
            subtitle="Schedule next PT session"
            onPress={() => navigation.navigate('Booking')}
            color="#3b82f6"
          />
          
          <QuickActionCard
            icon="fitness-outline"
            title="Start Workout"
            subtitle="Log today's exercises"
            onPress={() => navigation.navigate('Workout')}
            color="#10b981"
          />
          
          <QuickActionCard
            icon="stats-chart-outline"
            title="View Progress"
            subtitle="Track your improvements"
            onPress={() => navigation.navigate('Analytics')}
            color="#f59e0b"
          />
          
          <QuickActionCard
            icon="time-outline"
            title="Cancel Session"
            subtitle="Can't make it?"
            onPress={() => navigation.navigate('Booking')}
            color="#ef4444"
          />
        </View>

        {/* Quick Stats */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>This Month</Text>
        </View>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{mockData.quickStats.workoutsThisMonth}</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{mockData.quickStats.averageWeight}kg</Text>
            <Text style={styles.statLabel}>Avg Weight</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{mockData.quickStats.personalRecords}</Text>
            <Text style={styles.statLabel}>New PRs</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  creditsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  creditsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  creditsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  creditsAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  buyCreditsButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buyCreditsText: {
    color: 'white',
    fontWeight: '600',
  },
  sessionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  sessionDate: {
    fontSize: 18,
    fontWeight: 'bold',
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
    color: '#6b7280',
    marginBottom: 12,
  },
  sessionButton: {
    backgroundColor: '#10b981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  sessionButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '31%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default DashboardScreen;
