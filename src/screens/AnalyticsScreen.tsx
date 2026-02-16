import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../lib/supabase';
import { format, subMonths, subWeeks, subYears } from 'date-fns';

// Import the logo banner image
const logoBanner = require('../../logo banner.png');

type TimeRange = '1m' | '3m' | '6m' | '1y' | 'all';

interface AnalyticsScreenProps {
  navigation: any;
}

const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('3m');
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    totalSets: 0,
    totalVolume: 0,
    avgWorkoutsPerWeek: 0,
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const { session } = await auth.getSession();
      if (session) {
        const { data: profile } = await db.getClientProfile(session.user.id);
        if (profile) {
          // Load all workouts
          const { data: workoutsData } = await db.getClientWorkouts(profile.id, 100);
          setWorkouts(workoutsData || []);

          // Calculate stats
          const totalWorkouts = workoutsData?.length || 0;
          let totalSets = 0;
          let totalVolume = 0;
          const exerciseMap = new Map();

          workoutsData?.forEach((workout: any) => {
            workout.workout_exercises?.forEach((we: any) => {
              const exerciseName = we.exercises?.name || 'Unknown';
              if (!exerciseMap.has(exerciseName)) {
                exerciseMap.set(exerciseName, {
                  name: exerciseName,
                  category: we.exercises?.category,
                  data: [],
                });
              }

              we.set_entries?.forEach((set: any) => {
                totalSets++;
                totalVolume += set.weight * set.reps;
                exerciseMap.get(exerciseName).data.push({
                  date: workout.date,
                  weight: set.weight,
                  reps: set.reps,
                  volume: set.weight * set.reps,
                });
              });
            });
          });

          setExercises(Array.from(exerciseMap.values()));
          if (!selectedExercise && exerciseMap.size > 0) {
            setSelectedExercise(Array.from(exerciseMap.keys())[0]);
          }

          setStats({
            totalWorkouts,
            totalSets,
            totalVolume: Math.round(totalVolume),
            avgWorkoutsPerWeek: totalWorkouts > 0 ? Math.round((totalWorkouts / 12) * 10) / 10 : 0,
          });
        }
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredData = () => {
    if (!selectedExercise) return [];
    const exercise = exercises.find((e) => e.name === selectedExercise);
    if (!exercise) return [];

    let cutoffDate = new Date();
    switch (timeRange) {
      case '1m':
        cutoffDate = subMonths(new Date(), 1);
        break;
      case '3m':
        cutoffDate = subMonths(new Date(), 3);
        break;
      case '6m':
        cutoffDate = subMonths(new Date(), 6);
        break;
      case '1y':
        cutoffDate = subYears(new Date(), 1);
        break;
      default:
        return exercise.data;
    }

    return exercise.data.filter((d: any) => new Date(d.date) >= cutoffDate);
  };

  const getChartData = () => {
    const data = getFilteredData();
    return data.map((d: any) => d.weight);
  };

  const getPersonalRecords = () => {
    const data = getFilteredData();
    if (data.length === 0) return { maxWeight: 0, maxVolume: 0, maxReps: 0 };

    return {
      maxWeight: Math.max(...data.map((d: any) => d.weight)),
      maxVolume: Math.max(...data.map((d: any) => d.volume)),
      maxReps: Math.max(...data.map((d: any) => d.reps)),
    };
  };

  const renderLineChart = (data: number[]) => {
    if (data.length === 0) return null;

    const chartWidth = Dimensions.get('window').width - 64; // padding
    const chartHeight = 180;
    const padding = 20;
    const innerWidth = chartWidth - padding * 2;
    const innerHeight = chartHeight - padding * 2;

    const minValue = Math.min(...data);
    const maxValue = Math.max(...data);
    const valueRange = maxValue - minValue || 1;

    // Calculate points
    const points = data.map((value, index) => {
      const x = padding + (index / (data.length - 1 || 1)) * innerWidth;
      const y = padding + innerHeight - ((value - minValue) / valueRange) * innerHeight;
      return { x, y, value };
    });

    // Create path for line
    const pathData = points.map((point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      return `L ${point.x} ${point.y}`;
    }).join(' ');

    // Create area fill path
    const areaPath = `${pathData} L ${points[points.length - 1].x} ${chartHeight - padding} L ${padding} ${chartHeight - padding} Z`;

    return (
      <View style={styles.chartSvgContainer}>
        {/* Y-axis labels */}
        <View style={styles.yAxisLabels}>
          <Text style={styles.axisLabel}>{maxValue}kg</Text>
          <Text style={styles.axisLabel}>{Math.round((maxValue + minValue) / 2)}kg</Text>
          <Text style={styles.axisLabel}>{minValue}kg</Text>
        </View>

        {/* Chart area */}
        <View style={[styles.chartCanvas, { width: chartWidth, height: chartHeight }]}>
          {/* Grid lines */}
          <View style={[styles.gridLine, { top: padding }]} />
          <View style={[styles.gridLine, { top: padding + innerHeight / 2 }]} />
          <View style={[styles.gridLine, { top: padding + innerHeight }]} />

          {/* Data points and trend line simulation with View components */}
          <View style={styles.chartLineContainer}>
            {points.map((point, index) => (
              <View key={index}>
                {/* Line segment to next point */}
                {index < points.length - 1 && (
                  <View
                    style={[
                      styles.lineSegment,
                      {
                        left: point.x,
                        top: point.y,
                        width: Math.sqrt(
                          Math.pow(points[index + 1].x - point.x, 2) +
                          Math.pow(points[index + 1].y - point.y, 2)
                        ),
                        transform: [{
                          rotate: `${Math.atan2(
                            points[index + 1].y - point.y,
                            points[index + 1].x - point.x
                          )}rad`
                        }]
                      }
                    ]}
                  />
                )}
                {/* Data point */}
                <View
                  style={[
                    styles.dataPoint,
                    {
                      left: point.x - 4,
                      top: point.y - 4,
                    }
                  ]}
                />
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const chartData = getChartData();
  const records = getPersonalRecords();

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
        <Text style={styles.headerTitle}>Progress & Analytics</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Overall Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={24} color="#3b82f6" />
            <Text style={styles.statValue}>{stats.totalWorkouts}</Text>
            <Text style={styles.statLabel}>Total Workouts</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="repeat" size={24} color="#10b981" />
            <Text style={styles.statValue}>{stats.totalSets}</Text>
            <Text style={styles.statLabel}>Total Sets</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={24} color="#8b5cf6" />
            <Text style={styles.statValue}>{stats.totalVolume.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Volume (kg)</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="flash" size={24} color="#f59e0b" />
            <Text style={styles.statValue}>{stats.avgWorkoutsPerWeek}</Text>
            <Text style={styles.statLabel}>Avg/Week</Text>
          </View>
        </View>

        {/* Exercise Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Exercise</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.exerciseTags}>
            {exercises.map((exercise) => (
              <TouchableOpacity
                key={exercise.name}
                style={[
                  styles.exerciseTag,
                  selectedExercise === exercise.name && styles.exerciseTagActive,
                ]}
                onPress={() => setSelectedExercise(exercise.name)}
              >
                <Text
                  style={[
                    styles.exerciseTagText,
                    selectedExercise === exercise.name && styles.exerciseTagTextActive,
                  ]}
                >
                  {exercise.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Time Range Filter */}
        <View style={styles.timeRangeContainer}>
          {(['1m', '3m', '6m', '1y', 'all'] as TimeRange[]).map((range) => (
            <TouchableOpacity
              key={range}
              style={[styles.timeRangeButton, timeRange === range && styles.timeRangeButtonActive]}
              onPress={() => setTimeRange(range)}
            >
              <Text
                style={[
                  styles.timeRangeText,
                  timeRange === range && styles.timeRangeTextActive,
                ]}
              >
                {range === 'all' ? 'All' : range.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Personal Records */}
        {selectedExercise && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Records</Text>
            <View style={styles.recordsGrid}>
              <View style={styles.recordCard}>
                <Ionicons name="trophy" size={28} color="#f59e0b" />
                <Text style={styles.recordValue}>{records.maxWeight} kg</Text>
                <Text style={styles.recordLabel}>Max Weight</Text>
              </View>
              <View style={styles.recordCard}>
                <Ionicons name="fitness" size={28} color="#10b981" />
                <Text style={styles.recordValue}>{records.maxReps}</Text>
                <Text style={styles.recordLabel}>Max Reps</Text>
              </View>
              <View style={styles.recordCard}>
                <Ionicons name="bar-chart" size={28} color="#8b5cf6" />
                <Text style={styles.recordValue}>{records.maxVolume} kg</Text>
                <Text style={styles.recordLabel}>Max Volume</Text>
              </View>
            </View>
          </View>
        )}

        {/* Weight Progress Chart */}
        {selectedExercise && chartData.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Weight Progress</Text>
            <View style={styles.chartContainer}>
              {renderLineChart(chartData)}
              <View style={styles.chartStats}>
                <Text style={styles.chartStatText}>
                  Min: {Math.min(...chartData)}kg
                </Text>
                <Text style={styles.chartStatText}>
                  {chartData.length} sessions
                </Text>
                <Text style={styles.chartStatText}>
                  Max: {Math.max(...chartData)}kg
                </Text>
              </View>
            </View>
            <Text style={styles.chartLabel}>Session progression over time</Text>
          </View>
        )}

        {/* Recent Sessions */}
        {selectedExercise && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Sessions</Text>
            {getFilteredData()
              .slice(0, 10)
              .map((session: any, index: number) => (
                <View key={index} style={styles.sessionCard}>
                  <Text style={styles.sessionDate}>{format(new Date(session.date), 'MMM d, yyyy')}</Text>
                  <View style={styles.sessionStats}>
                    <Text style={styles.sessionStat}>{session.weight} kg</Text>
                    <Text style={styles.sessionSeparator}>×</Text>
                    <Text style={styles.sessionStat}>{session.reps} reps</Text>
                    <Text style={styles.sessionSeparator}>=</Text>
                    <Text style={styles.sessionVolume}>{session.volume} kg</Text>
                  </View>
                </View>
              ))}
          </View>
        )}

        {exercises.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="stats-chart-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyStateTitle}>No workout data yet</Text>
            <Text style={styles.emptyStateText}>Start logging workouts to see your progress</Text>
          </View>
        )}
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  statCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: '1%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  exerciseTags: {
    flexDirection: 'row',
  },
  exerciseTag: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  exerciseTagActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  exerciseTagText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  exerciseTagTextActive: {
    color: 'white',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 8,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  timeRangeButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  timeRangeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  timeRangeTextActive: {
    color: 'white',
  },
  recordsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  recordCard: {
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
  recordValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  recordLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chartSvgContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  yAxisLabels: {
    marginRight: 8,
    justifyContent: 'space-between',
    height: 180,
    paddingVertical: 20,
  },
  axisLabel: {
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: '500',
  },
  chartCanvas: {
    position: 'relative',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  gridLine: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  chartLineContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  lineSegment: {
    position: 'absolute',
    height: 3,
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  dataPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    borderWidth: 2,
    borderColor: 'white',
  },
  chartStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  chartStatText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  chartPlaceholder: {
    fontSize: 32,
    textAlign: 'center',
    color: '#1f2937',
  },
  chartSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  chartLabel: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
  },
  sessionCard: {
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
  sessionDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  sessionStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionStat: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  sessionSeparator: {
    fontSize: 14,
    color: '#d1d5db',
    marginHorizontal: 6,
  },
  sessionVolume: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
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
});

export default AnalyticsScreen;
