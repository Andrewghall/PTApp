import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const DashboardScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.welcome}>Welcome back!</Text>
          <Text style={styles.userName}>John Doe</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>8</Text>
            <Text style={styles.statLabel}>Credits Remaining</Text>
            <TouchableOpacity style={styles.buyButton}>
              <Text style={styles.buyButtonText}>Buy More</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>Tomorrow</Text>
            <Text style={styles.statLabel}>Next Session</Text>
            <Text style={styles.statDetail}>10:00 AM - Gym A</Text>
            <TouchableOpacity style={styles.detailsButton}>
              <Text style={styles.detailsButtonText}>View Details</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionCard}>
              <Ionicons name="calendar" size={24} color="#3b82f6" />
              <Text style={styles.actionText}>Book Session</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard}>
              <Ionicons name="fitness" size={24} color="#3b82f6" />
              <Text style={styles.actionText}>Start Workout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard}>
              <Ionicons name="stats-chart" size={24} color="#3b82f6" />
              <Text style={styles.actionText}>View Progress</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard}>
              <Ionicons name="close-circle" size={24} color="#ef4444" />
              <Text style={styles.actionText}>Cancel Session</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This Month</Text>
          <View style={styles.monthStats}>
            <View style={styles.monthStat}>
              <Text style={styles.monthStatNumber}>12</Text>
              <Text style={styles.monthStatLabel}>Workouts</Text>
            </View>
            <View style={styles.monthStat}>
              <Text style={styles.monthStatNumber}>75.5kg</Text>
              <Text style={styles.monthStatLabel}>Avg Weight</Text>
            </View>
            <View style={styles.monthStat}>
              <Text style={styles.monthStatNumber}>3</Text>
              <Text style={styles.monthStatLabel}>New PRs</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#3b82f6',
  },
  welcome: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  statDetail: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  buyButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  buyButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  detailsButton: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  detailsButtonText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 15,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  actionCard: {
    width: '45%',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 8,
    textAlign: 'center',
  },
  monthStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  monthStat: {
    alignItems: 'center',
  },
  monthStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  monthStatLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
});

export default DashboardScreen;
