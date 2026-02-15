import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../lib/supabase';
import { format } from 'date-fns';

interface Exercise {
  id: string;
  name: string;
  category: string;
}

interface SetEntry {
  id?: string;
  weight: number;
  reps: number;
  notes?: string;
}

interface WorkoutExercise {
  id?: string;
  exercise_id: string;
  exercise_name: string;
  sets: SetEntry[];
}

const WorkoutScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [todayWorkout, setTodayWorkout] = useState<any>(null);
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadWorkoutData();
  }, []);

  useEffect(() => {
    // Reload workout when date changes
    if (clientId) {
      loadWorkoutForDate();
    }
  }, [selectedDate, clientId]);

  const loadWorkoutData = async () => {
    try {
      const { session } = await auth.getSession();
      if (session) {
        const { data: profile } = await db.getClientProfile(session.user.id);
        if (profile) {
          setClientId(profile.id);

          // Load all exercises
          const { data: exercises } = await db.getExercises();
          setAllExercises(exercises || []);

          // Load workout for selected date
          await loadWorkoutForDate(profile.id);
        }
      }
    } catch (error) {
      console.error('Error loading workout:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkoutForDate = async (profileId?: string) => {
    const id = profileId || clientId;
    if (!id) return;

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data: workouts } = await db.getClientWorkouts(id, 30);
      const workout = workouts?.find((w: any) => w.date === dateStr);

      if (workout) {
        setTodayWorkout(workout);
        // Parse workout exercises with sets
        const parsedExercises: WorkoutExercise[] =
          workout.workout_exercises?.map((we: any) => ({
            id: we.id,
            exercise_id: we.exercise_id,
            exercise_name: we.exercises?.name || 'Unknown',
            sets: we.set_entries?.map((se: any) => ({
              id: se.id,
              weight: se.weight,
              reps: se.reps,
              notes: se.notes,
            })) || [],
          })) || [];
        setWorkoutExercises(parsedExercises);
      } else {
        setTodayWorkout(null);
        setWorkoutExercises([]);
      }
    } catch (error) {
      console.error('Error loading workout for date:', error);
    }
  };

  const startNewWorkout = async () => {
    if (!clientId) return;
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data, error } = await db.createWorkout(clientId, dateStr);
      if (error) throw error;
      setTodayWorkout(data);
      Alert.alert('Success', 'New workout started!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start workout');
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

  const addExercise = async (exercise: Exercise) => {
    if (!todayWorkout) {
      await startNewWorkout();
    }

    try {
      const orderIndex = workoutExercises.length;
      const { data, error } = await db.addWorkoutExercise(
        todayWorkout?.id,
        exercise.id,
        orderIndex
      );
      if (error) throw error;

      setWorkoutExercises([
        ...workoutExercises,
        {
          id: data.id,
          exercise_id: exercise.id,
          exercise_name: exercise.name,
          sets: [],
        },
      ]);
      setShowExercisePicker(false);
      setSearchQuery('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add exercise');
    }
  };

  const addSet = async (exerciseIndex: number) => {
    const workoutExercise = workoutExercises[exerciseIndex];
    if (!workoutExercise.id) return;

    // Get previous set values for quick entry
    const lastSet = workoutExercise.sets[workoutExercise.sets.length - 1];
    const weight = lastSet?.weight || 0;
    const reps = lastSet?.reps || 0;

    try {
      const { data, error } = await db.addSetEntry(workoutExercise.id, weight, reps);
      if (error) throw error;

      const updatedExercises = [...workoutExercises];
      updatedExercises[exerciseIndex].sets.push({
        id: data.id,
        weight,
        reps,
      });
      setWorkoutExercises(updatedExercises);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add set');
    }
  };

  const updateSetValue = (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', value: string) => {
    const updatedExercises = [...workoutExercises];
    const numValue = parseFloat(value) || 0;
    updatedExercises[exerciseIndex].sets[setIndex][field] = numValue;
    setWorkoutExercises(updatedExercises);
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const updatedExercises = [...workoutExercises];
    updatedExercises[exerciseIndex].sets.splice(setIndex, 1);
    setWorkoutExercises(updatedExercises);
  };

  const filteredExercises = allExercises.filter((ex) =>
    ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ex.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Date Navigation */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Workout Log</Text>
        <View style={styles.dateNavigation}>
          <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateNavButton}>
            <Ionicons name="chevron-back" size={24} color="#3b82f6" />
          </TouchableOpacity>
          <View style={styles.dateDisplay}>
            <Text style={styles.headerDate}>{format(selectedDate, 'EEEE, MMM d')}</Text>
            {!isToday && (
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
        {workoutExercises.length > 0 ? (
          <>
            {workoutExercises.map((exercise, exerciseIndex) => (
              <View key={exerciseIndex} style={styles.exerciseCard}>
                <Text style={styles.exerciseName}>{exercise.exercise_name}</Text>

                {/* Sets Table */}
                <View style={styles.setsTable}>
                  <View style={styles.tableHeader}>
                    <Text style={styles.tableHeaderText}>Set</Text>
                    <Text style={styles.tableHeaderText}>Weight (kg)</Text>
                    <Text style={styles.tableHeaderText}>Reps</Text>
                    <Text style={styles.tableHeaderText}></Text>
                  </View>

                  {exercise.sets.map((set, setIndex) => (
                    <View key={setIndex} style={styles.tableRow}>
                      <Text style={styles.setNumber}>{setIndex + 1}</Text>
                      <TextInput
                        style={styles.setInput}
                        value={set.weight.toString()}
                        onChangeText={(val) => updateSetValue(exerciseIndex, setIndex, 'weight', val)}
                        keyboardType="decimal-pad"
                        placeholder="0"
                      />
                      <TextInput
                        style={styles.setInput}
                        value={set.reps.toString()}
                        onChangeText={(val) => updateSetValue(exerciseIndex, setIndex, 'reps', val)}
                        keyboardType="number-pad"
                        placeholder="0"
                      />
                      <TouchableOpacity
                        onPress={() => removeSet(exerciseIndex, setIndex)}
                        style={styles.removeButton}
                      >
                        <Ionicons name="close-circle" size={20} color="#dc2626" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                {/* Add Set Button */}
                <TouchableOpacity
                  style={styles.addSetButton}
                  onPress={() => addSet(exerciseIndex)}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#3b82f6" />
                  <Text style={styles.addSetText}>Add Set</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="barbell-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyStateTitle}>No exercises yet</Text>
            <Text style={styles.emptyStateText}>
              Add your first exercise to start logging
            </Text>
          </View>
        )}

        {/* Add Exercise Button */}
        <TouchableOpacity
          style={styles.addExerciseButton}
          onPress={() => setShowExercisePicker(true)}
        >
          <Ionicons name="add-circle" size={24} color="white" />
          <Text style={styles.addExerciseText}>Add Exercise</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Exercise Picker Modal */}
      <Modal visible={showExercisePicker} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Exercise</Text>
            <TouchableOpacity onPress={() => setShowExercisePicker(false)}>
              <Ionicons name="close" size={28} color="#1f2937" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search exercises..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>

          <ScrollView style={styles.exerciseList}>
            {filteredExercises.map((exercise) => (
              <TouchableOpacity
                key={exercise.id}
                style={styles.exerciseItem}
                onPress={() => addExercise(exercise)}
              >
                <View>
                  <Text style={styles.exerciseItemName}>{exercise.name}</Text>
                  <Text style={styles.exerciseItemCategory}>{exercise.category}</Text>
                </View>
                <Ionicons name="add-circle-outline" size={24} color="#3b82f6" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
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
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerDate: {
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
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  exerciseCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  setsTable: {
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 8,
  },
  tableHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  setNumber: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    textAlign: 'center',
  },
  setInput: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 4,
  },
  removeButton: {
    flex: 1,
    alignItems: 'center',
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  addSetText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
    marginLeft: 6,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  addExerciseText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9ca3af',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#d1d5db',
    marginTop: 8,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: '#1f2937',
  },
  exerciseList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  exerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  exerciseItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  exerciseItemCategory: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
});

export default WorkoutScreen;
