import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth, supabase } from '../lib/supabase';
import { HamburgerButton, HamburgerMenu } from '../components/HamburgerMenu';

// Import the logo banner image
const logoBanner = require('../../logo banner.png');

interface MyProgrammeScreenProps {
  navigation: any;
}

const MyProgrammeScreen: React.FC<MyProgrammeScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [programme, setProgramme] = useState<any>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [userRole, setUserRole] = useState<'client' | 'admin'>('client');

  useEffect(() => {
    loadProgramme();
  }, []);

  const loadProgramme = async () => {
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

          const { data: programmeData } = await db.getClientProgramme(profile.id);
          setProgramme(programmeData);
        }
      }
    } catch (error) {
      console.error('Error loading programme:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadProgramme();
  };

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'strength':
        return 'barbell';
      case 'cardio':
        return 'heart';
      case 'flexibility':
        return 'body';
      default:
        return 'fitness';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'strength':
        return '#ef4444';
      case 'cardio':
        return '#3b82f6';
      case 'flexibility':
        return '#8b5cf6';
      default:
        return '#6b7280';
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

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {programme ? (
          <>
            {/* Programme Header */}
            <View style={styles.programmeHeader}>
              <View style={styles.programmeIcon}>
                <Ionicons name="fitness" size={32} color="#3b82f6" />
              </View>
              <Text style={styles.programmeName}>{programme.programmes.name}</Text>
              {programme.programmes.description && (
                <Text style={styles.programmeDescription}>
                  {programme.programmes.description}
                </Text>
              )}
              <View style={styles.assignedBadge}>
                <Ionicons name="calendar" size={16} color="#6b7280" />
                <Text style={styles.assignedText}>
                  Assigned {new Date(programme.assigned_at).toLocaleDateString()}
                </Text>
              </View>
            </View>

            {/* Exercises List */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Exercises</Text>
              {programme.programmes.programme_exercises?.map((programmeExercise: any, index: number) => (
                <View key={programmeExercise.id} style={styles.exerciseCard}>
                  <View style={styles.exerciseHeader}>
                    <View style={styles.exerciseNumberBadge}>
                      <Text style={styles.exerciseNumber}>{index + 1}</Text>
                    </View>
                    <View style={styles.exerciseInfo}>
                      <Text style={styles.exerciseName}>
                        {programmeExercise.exercises.name}
                      </Text>
                      <View style={styles.categoryBadge}>
                        <Ionicons
                          name={getCategoryIcon(programmeExercise.exercises.category)}
                          size={14}
                          color={getCategoryColor(programmeExercise.exercises.category)}
                        />
                        <Text
                          style={[
                            styles.categoryText,
                            { color: getCategoryColor(programmeExercise.exercises.category) }
                          ]}
                        >
                          {programmeExercise.exercises.category}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.prescriptionContainer}>
                    <View style={styles.prescriptionItem}>
                      <Text style={styles.prescriptionLabel}>Sets</Text>
                      <Text style={styles.prescriptionValue}>
                        {programmeExercise.prescribed_sets}
                      </Text>
                    </View>
                    <View style={styles.prescriptionDivider} />
                    <View style={styles.prescriptionItem}>
                      <Text style={styles.prescriptionLabel}>Reps</Text>
                      <Text style={styles.prescriptionValue}>
                        {programmeExercise.prescribed_reps}
                      </Text>
                    </View>
                    {programmeExercise.prescribed_weight && (
                      <>
                        <View style={styles.prescriptionDivider} />
                        <View style={styles.prescriptionItem}>
                          <Text style={styles.prescriptionLabel}>Weight</Text>
                          <Text style={styles.prescriptionValue}>
                            {programmeExercise.prescribed_weight}kg
                          </Text>
                        </View>
                      </>
                    )}
                  </View>

                  {programmeExercise.notes && (
                    <View style={styles.notesContainer}>
                      <Ionicons name="information-circle" size={16} color="#6b7280" />
                      <Text style={styles.notesText}>{programmeExercise.notes}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>

            {/* Notes Section */}
            {programme.notes && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Coach Notes</Text>
                <View style={styles.notesCard}>
                  <Ionicons name="chatbox-ellipses" size={20} color="#3b82f6" />
                  <Text style={styles.coachNotes}>{programme.notes}</Text>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={styles.logWorkoutButton}
                onPress={() => navigation.navigate('Workout')}
              >
                <Ionicons name="barbell" size={20} color="white" />
                <Text style={styles.logWorkoutButtonText}>Log Today's Workout</Text>
              </TouchableOpacity>

              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color="#3b82f6" />
                <Text style={styles.infoText}>
                  This is your assigned programme. You can log workouts based on this programme or create your own custom workouts.
                </Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="fitness-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No Programme Assigned</Text>
            <Text style={styles.emptyStateSubtext}>
              Your coach hasn't assigned you a programme yet. You can still log your own workouts!
            </Text>
            <TouchableOpacity
              style={styles.createWorkoutButton}
              onPress={() => navigation.navigate('Workout')}
            >
              <Ionicons name="add-circle" size={20} color="white" />
              <Text style={styles.createWorkoutButtonText}>Create Your Own Workout</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

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
  scrollView: {
    flex: 1,
  },
  programmeHeader: {
    backgroundColor: 'white',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  programmeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  programmeName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  programmeDescription: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  assignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  assignedText: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 6,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  exerciseCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  exerciseNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exerciseNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  prescriptionContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  prescriptionItem: {
    flex: 1,
    alignItems: 'center',
  },
  prescriptionLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  prescriptionValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  prescriptionDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 8,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  notesText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    marginLeft: 8,
    lineHeight: 18,
  },
  notesCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  coachNotes: {
    flex: 1,
    fontSize: 15,
    color: '#1f2937',
    lineHeight: 22,
    marginLeft: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
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
    textAlign: 'center',
    marginBottom: 24,
  },
  actionButtonsContainer: {
    padding: 20,
    gap: 16,
  },
  logWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  logWorkoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 20,
  },
  createWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
  },
  createWorkoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MyProgrammeScreen;
