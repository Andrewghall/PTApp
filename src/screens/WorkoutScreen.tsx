import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../lib/supabase';
import { format } from 'date-fns';

// Import the logo banner and exercise images
const logoBanner = require('../../logo banner.png');
const maleImages = {
  BenchPress: require('../../MaleBenchPress.png'),
  Squats: require('../../MaleSquats.png'),
  DeadLift: require('../../Maledeadlift.png'),
  OverheadPress: require('../../MaleOverheadPress.png'),
  BoxSquat: require('../../MaleBoxSquat.png'),
};

const femaleImages = {
  BenchPress: require('../../FemaleBenchPress.png'),
  Squats: require('../../FemaleSquats.png'),
  DeadLift: require('../../FemaleDeadLift.png'),
  OverheadPress: require('../../FemaleOverheadPress.png'),
  BoxSquat: require('../../FemaleBoxSquat.png'),
};

interface WorkoutScreenProps {
  navigation: any;
}

const WorkoutScreen: React.FC<WorkoutScreenProps> = ({ navigation, route }) => {
  const [userGender, setUserGender] = useState<'male' | 'female'>('male');
  const [clientProfileId, setClientProfileId] = useState<string | null>(null);
  // Use date from navigation params if provided, otherwise default to today
  const [selectedDate, setSelectedDate] = useState(route?.params?.selectedDate || new Date());
  const [currentWorkoutId, setCurrentWorkoutId] = useState<string | null>(null);
  const [currentWeekWorkout, setCurrentWeekWorkout] = useState<any[]>([]);
  const [previousWorkouts, setPreviousWorkouts] = useState<any[]>([]);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [newExercise, setNewExercise] = useState({
    sets: '',
    weight: '',
    notes: '',
    type: 'normal',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Reload workout when date changes
    if (clientProfileId) {
      loadWorkoutForDate();
    }
  }, [selectedDate, clientProfileId]);

  const loadData = async () => {
    const { session } = await auth.getSession();
    if (session) {
      const { data: profile } = await db.getClientProfile(session.user.id);
      if (profile) {
        setClientProfileId(profile.id);
        setUserGender(profile.gender || 'male');
        // Load workout for selected date
        await loadWorkoutForDate(profile.id);
        // Load previous workouts
        const { data: workouts } = await db.getClientWorkouts(profile.id, 10);
        if (workouts) {
          const formatted = workouts.map((w: any) => {
            const d = new Date(w.date);
            const weekEnd = new Date(d);
            weekEnd.setDate(d.getDate() + 6);
            return {
              week: `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
              exercises: (w.workout_exercises || []).map((we: any) => ({
                id: we.id,
                name: we.exercises?.name || 'Exercise',
                sets: '3x10', // Simplified
                weight: '-',
                type: 'normal',
              })),
            };
          });
          setPreviousWorkouts(formatted);
        }
      }
    }
  };

  const loadWorkoutForDate = async (profileId?: string) => {
    const id = profileId || clientProfileId;
    if (!id) return;

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data: workouts } = await db.getClientWorkouts(id, 30);
      const workout = workouts?.find((w: any) => w.date === dateStr);

      if (workout) {
        setCurrentWorkoutId(workout.id);
        // Map workout exercises to match the UI format
        const formatted = (workout.workout_exercises || []).map((we: any) => {
          const exercise = exercises.find(e => e.name === we.exercises?.name);
          return {
            id: we.id,
            name: we.exercises?.name || 'Exercise',
            sets: we.set_entries?.length > 0
              ? `${we.set_entries.length}x${we.set_entries[0]?.reps || 10}`
              : '3x10',
            weight: we.set_entries?.length > 0
              ? `${we.set_entries[0]?.weight || 60}kg`
              : '60kg',
            type: 'normal',
            notes: we.set_entries?.[0]?.notes || '',
            imageKey: exercise?.imageKey || 'BenchPress',
          };
        });
        setCurrentWeekWorkout(formatted);
      } else {
        setCurrentWorkoutId(null);
        setCurrentWeekWorkout([]);
      }
    } catch (error) {
      console.error('Error loading workout for date:', error);
    }
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const getExerciseImage = (imageKey: string) => {
    try {
      if (userGender === 'male' && maleImages[imageKey as keyof typeof maleImages]) {
        return maleImages[imageKey as keyof typeof maleImages];
      } else if (userGender === 'female' && femaleImages[imageKey as keyof typeof femaleImages]) {
        return femaleImages[imageKey as keyof typeof femaleImages];
      }
    } catch (error) {
      // Fallback
    }
    return maleImages.BenchPress; // Default
  };

  // Core exercises with images
  const exercises = [
    { id: '1', name: 'Bench Press', category: 'Chest', imageKey: 'BenchPress' },
    { id: '2', name: 'Squats', category: 'Legs', imageKey: 'Squats' },
    { id: '3', name: 'Box Squats', category: 'Legs', imageKey: 'BoxSquat' },
    { id: '4', name: 'Deadlift', category: 'Back', imageKey: 'DeadLift' },
    { id: '5', name: 'Overhead Press', category: 'Shoulders', imageKey: 'OverheadPress' },
  ];

  const addExerciseToWorkout = async (exercise: any) => {
    if (!clientProfileId) return;

    try {
      // Create workout if it doesn't exist for this date
      let workoutId = currentWorkoutId;
      if (!workoutId) {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const { data, error } = await db.createWorkout(clientProfileId, dateStr);
        if (error) throw error;
        workoutId = data.id;
        setCurrentWorkoutId(workoutId);
      }

      // For now, just add to UI - full database integration would require finding exercise ID
      const workoutExercise = {
        id: Date.now(),
        name: exercise.name,
        sets: newExercise.sets || '3x10',
        weight: newExercise.weight || '60kg',
        type: newExercise.type || 'normal',
        notes: newExercise.notes,
        imageKey: exercise.imageKey,
      };
      setCurrentWeekWorkout([...currentWeekWorkout, workoutExercise]);
      setShowAddExercise(false);
      setNewExercise({ sets: '', weight: '', notes: '', type: 'normal' });
      Alert.alert('Success', 'Exercise added to workout!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add exercise');
    }
  };

  const deleteExercise = (exerciseId: number) => {
    setCurrentWeekWorkout(currentWeekWorkout.filter((ex) => ex.id !== exerciseId));
  };

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
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>Workout Tracker</Text>
        <Text style={styles.headerSubtitle}>Track your training progress</Text>

        {/* Date Navigation */}
        <View style={styles.dateNavigation}>
          <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateNavButton}>
            <Ionicons name="chevron-back" size={24} color="#3b82f6" />
          </TouchableOpacity>
          <View style={styles.dateDisplay}>
            <Text style={styles.dateText}>{format(selectedDate, 'EEEE, MMM d')}</Text>
            {format(selectedDate, 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd') && (
              <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
                <Text style={styles.todayButtonText}>Today</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={() => changeDate(1)} style={styles.dateNavButton}>
            <Ionicons name="chevron-forward" size={24} color="#3b82f6" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Today's Workout */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Workout</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowAddExercise(true)}>
              <Text style={styles.addButtonText}>+ Add Exercise</Text>
            </TouchableOpacity>
          </View>

          {currentWeekWorkout.map((exercise) => (
            <View key={exercise.id} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <View style={styles.exerciseNameRow}>
                  <Image source={getExerciseImage(exercise.imageKey)} style={styles.exerciseImage} />
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                </View>
                <View style={styles.exerciseActions}>
                  <View
                    style={[
                      styles.typeBadge,
                      {
                        backgroundColor:
                          exercise.type === 'light'
                            ? '#fef3c7'
                            : exercise.type === 'heavy'
                            ? '#fee2e2'
                            : exercise.type === 'max'
                            ? '#dbeafe'
                            : '#f0f9ff',
                      },
                    ]}
                  >
                    <Text style={styles.typeBadgeText}>{exercise.type.toUpperCase()}</Text>
                  </View>
                  <TouchableOpacity style={styles.deleteButton} onPress={() => deleteExercise(exercise.id)}>
                    <Text style={styles.deleteButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.exerciseDetails}>
                <Text style={styles.exerciseSets}>{exercise.sets}</Text>
                <Text style={styles.exerciseWeight}>{exercise.weight}</Text>
              </View>
              {exercise.notes && <Text style={styles.exerciseNotes}>{exercise.notes}</Text>}
            </View>
          ))}

          {currentWeekWorkout.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No exercises added yet</Text>
              <Text style={styles.emptyStateSubtext}>Tap "Add Exercise" to get started</Text>
            </View>
          )}
        </View>

        {/* Previous Weeks */}
        {previousWorkouts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Previous Weeks</Text>
            {previousWorkouts.map((week, weekIndex) => (
              <View key={weekIndex} style={styles.weekCard}>
                <Text style={styles.weekDate}>{week.week}</Text>
                {week.exercises.map((exercise: any) => (
                  <View key={exercise.id} style={styles.previousExercise}>
                    <Text style={styles.previousExerciseName}>{exercise.name}</Text>
                    <Text style={styles.previousExerciseDetails}>
                      {exercise.sets} • {exercise.weight}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Exercise Modal */}
      <Modal visible={showAddExercise} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Exercise</Text>
              <TouchableOpacity onPress={() => setShowAddExercise(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.exerciseForm}>
              <Text style={styles.formLabel}>Sets x Reps</Text>
              <TextInput
                style={styles.formInput}
                value={newExercise.sets}
                onChangeText={(text) => setNewExercise({ ...newExercise, sets: text })}
                placeholder="e.g., 5x5 or 3x10"
              />

              <Text style={styles.formLabel}>Weight</Text>
              <TextInput
                style={styles.formInput}
                value={newExercise.weight}
                onChangeText={(text) => setNewExercise({ ...newExercise, weight: text })}
                placeholder="e.g., 80kg or bodyweight"
              />

              <Text style={styles.formLabel}>Workout Type</Text>
              <View style={styles.typeButtons}>
                {['normal', 'light', 'heavy', 'max'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeButton, newExercise.type === type && styles.activeTypeButton]}
                    onPress={() => setNewExercise({ ...newExercise, type })}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        newExercise.type === type && styles.activeTypeButtonText,
                      ]}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.formInput, styles.formInputMultiline]}
                value={newExercise.notes}
                onChangeText={(text) => setNewExercise({ ...newExercise, notes: text })}
                placeholder="How did it feel? Any observations?"
                multiline
              />
            </View>

            <ScrollView style={styles.exerciseList}>
              {exercises.map((exercise) => (
                <TouchableOpacity
                  key={exercise.id}
                  style={styles.exerciseOption}
                  onPress={() => addExerciseToWorkout(exercise)}
                >
                  <View style={styles.exerciseOptionRow}>
                    <Image source={getExerciseImage(exercise.imageKey)} style={styles.exerciseOptionImage} />
                    <View>
                      <Text style={styles.exerciseOptionName}>{exercise.name}</Text>
                      <Text style={styles.exerciseOptionCategory}>{exercise.category}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
  headerSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 16,
  },
  dateNavButton: {
    padding: 8,
  },
  dateDisplay: {
    alignItems: 'center',
    minWidth: 200,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  todayButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  todayButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  exerciseCard: {
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
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  exerciseImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1f2937',
  },
  deleteButton: {
    padding: 4,
  },
  deleteButtonText: {
    fontSize: 18,
    color: '#dc2626',
  },
  exerciseDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  exerciseSets: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
  },
  exerciseWeight: {
    fontSize: 16,
    color: '#6b7280',
  },
  exerciseNotes: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    fontStyle: 'italic',
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#d1d5db',
    marginTop: 4,
  },
  weekCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  weekDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  previousExercise: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  previousExerciseName: {
    fontSize: 14,
    color: '#1f2937',
  },
  previousExerciseDetails: {
    fontSize: 14,
    color: '#9ca3af',
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
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    fontSize: 24,
    color: '#6b7280',
  },
  exerciseForm: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  formInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  formInputMultiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTypeButton: {
    backgroundColor: '#3b82f6',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeTypeButtonText: {
    color: 'white',
  },
  exerciseList: {
    maxHeight: 300,
  },
  exerciseOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  exerciseOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseOptionImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  exerciseOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  exerciseOptionCategory: {
    fontSize: 14,
    color: '#6b7280',
  },
});

export default WorkoutScreen;
