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
import { format, subMonths, subYears } from 'date-fns';

const logoBanner = require('../../logo_banner.png');

type TimeRange = '1m' | '3m' | '6m' | '1y' | 'all';
type ChartMode = 'weight' | 'reps' | 'volume';

interface AnalyticsScreenProps {
  navigation: any;
}

const GOLD = '#c8a94e';
const BG = '#0a0a0a';
const CARD = '#141414';
const BORDER = '#2a2a2a';
const WHITE = '#ffffff';
const MUTED = '#9ca3af';
const GREEN = '#10b981';
const PURPLE = '#8b5cf6';

const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('3m');
  const [chartMode, setChartMode] = useState<ChartMode>('weight');
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalWorkouts: 0, totalSets: 0, totalVolume: 0, avgWorkoutsPerWeek: 0 });

  useEffect(() => { loadAnalytics(); }, []);

  const loadAnalytics = async () => {
    try {
      const { session } = await auth.getSession();
      if (session) {
        const { data: profile } = await db.getClientProfile(session.user.id);
        if (profile) {
          const { data: workoutsData } = await db.getClientWorkouts(profile.id, 1000);

          let totalSets = 0;
          let totalVolume = 0;
          const exerciseMap = new Map<string, { name: string; category: string; sessions: any[] }>();

          workoutsData?.forEach((workout: any) => {
            workout.workout_exercises?.forEach((we: any) => {
              const exerciseName = we.exercises?.name || 'Unknown';
              if (!exerciseMap.has(exerciseName)) {
                exerciseMap.set(exerciseName, { name: exerciseName, category: we.exercises?.category || '', sessions: [] });
              }
              const sets = we.set_entries || [];
              if (sets.length > 0) {
                totalSets += sets.length;
                sets.forEach((s: any) => { totalVolume += (s.weight || 0) * (s.reps || 0); });
                // Best set per session (highest weight, highest reps, highest volume)
                exerciseMap.get(exerciseName)!.sessions.push({
                  date: workout.date,
                  bestWeight: Math.max(...sets.map((s: any) => s.weight || 0)),
                  bestReps: Math.max(...sets.map((s: any) => s.reps || 0)),
                  bestVolume: Math.max(...sets.map((s: any) => (s.weight || 0) * (s.reps || 0))),
                });
              }
            });
          });

          const exerciseList = Array.from(exerciseMap.values());
          setExercises(exerciseList);
          if (!selectedExercise && exerciseList.length > 0) setSelectedExercise(exerciseList[0].name);

          const totalWorkouts = workoutsData?.length || 0;
          setStats({
            totalWorkouts,
            totalSets,
            totalVolume: Math.round(totalVolume),
            avgWorkoutsPerWeek: totalWorkouts > 0 ? Math.round((totalWorkouts / Math.max(1, totalWorkouts / 3)) * 10) / 10 : 0,
          });
        }
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredSessions = () => {
    if (!selectedExercise) return [];
    const exercise = exercises.find((e) => e.name === selectedExercise);
    if (!exercise) return [];
    const now = new Date();
    const cutoff: Date | null =
      timeRange === '1m' ? subMonths(now, 1) :
      timeRange === '3m' ? subMonths(now, 3) :
      timeRange === '6m' ? subMonths(now, 6) :
      timeRange === '1y' ? subYears(now, 1) : null;
    const filtered = cutoff ? exercise.sessions.filter((s: any) => new Date(s.date) >= cutoff!) : exercise.sessions;
    return [...filtered].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const getPersonalRecords = () => {
    const s = getFilteredSessions();
    if (!s.length) return { maxWeight: 0, maxReps: 0, maxVolume: 0 };
    return {
      maxWeight: Math.max(...s.map((x: any) => x.bestWeight)),
      maxReps: Math.max(...s.map((x: any) => x.bestReps)),
      maxVolume: Math.max(...s.map((x: any) => x.bestVolume)),
    };
  };

  const renderSVGChart = (values: number[], dates: string[]) => {
    if (values.length < 2) {
      return <View style={styles.chartEmpty}><Text style={styles.chartEmptyText}>Need at least 2 sessions to chart</Text></View>;
    }

    const width = Math.min(Dimensions.get('window').width - 80, 700);
    const height = 200;
    const padL = 50, padR = 16, padT = 16, padB = 32;
    const innerW = width - padL - padR;
    const innerH = height - padT - padB;
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;
    const toX = (i: number) => padL + (i / (values.length - 1)) * innerW;
    const toY = (v: number) => padT + innerH - ((v - minVal) / range) * innerH;

    const points = values.map((v, i) => ({ x: toX(i), y: toY(v), v }));
    const polyPoints = points.map(p => `${p.x},${p.y}`).join(' ');
    const areaPath = `M ${points[0].x},${points[0].y} ` +
      points.map(p => `L ${p.x},${p.y}`).join(' ') +
      ` L ${points[points.length - 1].x},${padT + innerH} L ${padL},${padT + innerH} Z`;

    const color = chartMode === 'weight' ? GOLD : chartMode === 'reps' ? GREEN : PURPLE;
    const unit = chartMode === 'reps' ? '' : 'kg';
    const mid = Math.round((maxVal + minVal) / 2);
    const dateLabels = [0, Math.floor((values.length - 1) / 2), values.length - 1];

    return (
      // @ts-ignore
      <svg width={width} height={height} style={{ display: 'block' }}>
        {/* Grid + Y labels */}
        {[maxVal, mid, minVal].map((val, i) => {
          const y = toY(val);
          return (
            // @ts-ignore
            <g key={i}>
              {/* @ts-ignore */}
              <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="#2a2a2a" strokeWidth="1" />
              {/* @ts-ignore */}
              <text x={padL - 6} y={y + 4} textAnchor="end" fontSize="10" fill={MUTED}>{val}{unit}</text>
            </g>
          );
        })}
        {/* Area */}
        {/* @ts-ignore */}
        <path d={areaPath} fill={color} fillOpacity="0.12" />
        {/* Line */}
        {/* @ts-ignore */}
        <polyline points={polyPoints} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Dots */}
        {points.map((p, i) => (
          // @ts-ignore
          <circle key={i} cx={p.x} cy={p.y} r="4" fill={color} stroke={CARD} strokeWidth="2" />
        ))}
        {/* X date labels */}
        {dateLabels.map(i => (
          // @ts-ignore
          <text key={i} x={toX(i)} y={height - 6} textAnchor="middle" fontSize="10" fill={MUTED}>
            {format(new Date(dates[i]), 'MMM d')}
          </text>
        ))}
      </svg>
    );
  };

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={GOLD} /></View>;
  }

  const sessions = getFilteredSessions();
  const values = chartMode === 'weight' ? sessions.map((s: any) => s.bestWeight)
    : chartMode === 'reps' ? sessions.map((s: any) => s.bestReps)
    : sessions.map((s: any) => s.bestVolume);
  const dates = sessions.map((s: any) => s.date);
  const records = getPersonalRecords();

  return (
    <SafeAreaView style={styles.container}>
      <Image source={logoBanner} style={styles.heroBanner} resizeMode="cover" />
      <View style={styles.backRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={WHITE} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Progress & Analytics</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* Stats */}
        <View style={styles.statsGrid}>
          {[
            { icon: 'calendar', color: GOLD, value: stats.totalWorkouts, label: 'Workouts' },
            { icon: 'repeat', color: GREEN, value: stats.totalSets, label: 'Total Sets' },
            { icon: 'trending-up', color: PURPLE, value: stats.totalVolume.toLocaleString(), label: 'Volume (kg)' },
            { icon: 'flash', color: '#f59e0b', value: stats.avgWorkoutsPerWeek, label: 'Avg/Week' },
          ].map((s, i) => (
            <View key={i} style={styles.statCard}>
              <Ionicons name={s.icon as any} size={22} color={s.color} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Exercise picker */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exercise</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {exercises.map((ex) => (
              <TouchableOpacity
                key={ex.name}
                style={[styles.tag, selectedExercise === ex.name && styles.tagActive]}
                onPress={() => setSelectedExercise(ex.name)}
              >
                <Text style={[styles.tagText, selectedExercise === ex.name && styles.tagTextActive]}>{ex.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {selectedExercise && (
          <>
            {/* Time range */}
            <View style={styles.row}>
              {(['1m', '3m', '6m', '1y', 'all'] as TimeRange[]).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.filterBtn, timeRange === r && styles.filterBtnActive]}
                  onPress={() => setTimeRange(r)}
                >
                  <Text style={[styles.filterTxt, timeRange === r && styles.filterTxtActive]}>{r === 'all' ? 'All' : r.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Personal bests */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Personal Bests</Text>
              <View style={styles.pbRow}>
                <View style={styles.pbCard}>
                  <Ionicons name="trophy" size={22} color={GOLD} />
                  <Text style={styles.pbValue}>{records.maxWeight} kg</Text>
                  <Text style={styles.pbLabel}>Max Weight</Text>
                </View>
                <View style={styles.pbCard}>
                  <Ionicons name="fitness" size={22} color={GREEN} />
                  <Text style={styles.pbValue}>{records.maxReps}</Text>
                  <Text style={styles.pbLabel}>Max Reps</Text>
                </View>
                <View style={styles.pbCard}>
                  <Ionicons name="bar-chart" size={22} color={PURPLE} />
                  <Text style={[styles.pbValue, { fontSize: 15 }]}>{records.maxVolume} kg</Text>
                  <Text style={styles.pbLabel}>Max Volume</Text>
                </View>
              </View>
            </View>

            {/* Chart */}
            <View style={styles.section}>
              <View style={styles.chartHeaderRow}>
                <Text style={styles.sectionTitle}>Progression</Text>
                <View style={styles.toggle}>
                  {([
                    { key: 'weight' as ChartMode, label: 'Weight', color: GOLD },
                    { key: 'reps' as ChartMode, label: 'Reps', color: GREEN },
                    { key: 'volume' as ChartMode, label: 'Volume', color: PURPLE },
                  ]).map(({ key, label, color }) => (
                    <TouchableOpacity
                      key={key}
                      style={[styles.toggleBtn, chartMode === key && { backgroundColor: color, borderColor: color }]}
                      onPress={() => setChartMode(key)}
                    >
                      <Text style={[styles.toggleTxt, chartMode === key && { color: BG }]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.chartCard}>
                {renderSVGChart(values, dates)}
                <View style={styles.chartFooter}>
                  <Text style={styles.chartFooterTxt}>{sessions.length} session{sessions.length !== 1 ? 's' : ''} · best set per session</Text>
                  {values.length > 1 && (
                    <Text style={styles.chartFooterTxt}>{Math.min(...values)} → {Math.max(...values)}{chartMode === 'reps' ? ' reps' : ' kg'}</Text>
                  )}
                </View>
              </View>
            </View>

            {/* History */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>History</Text>
              <View style={styles.historyCard}>
                {[...sessions].reverse().map((s: any, i: number) => (
                  <View key={i} style={[styles.historyRow, i > 0 && styles.historyRowBorder]}>
                    <Text style={styles.historyDate}>{format(new Date(s.date), 'dd MMM yyyy')}</Text>
                    <View style={styles.historyStats}>
                      <Text style={[styles.historyStat, { color: GOLD }]}>{s.bestWeight}kg</Text>
                      <Text style={styles.historyX}>×</Text>
                      <Text style={[styles.historyStat, { color: GREEN }]}>{s.bestReps}r</Text>
                      <Text style={styles.historyX}>=</Text>
                      <Text style={[styles.historyStat, { color: PURPLE }]}>{s.bestVolume}kg</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {exercises.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="stats-chart-outline" size={64} color={MUTED} />
            <Text style={styles.emptyTitle}>No workout data yet</Text>
            <Text style={styles.emptyText}>Start logging workouts to see your progress</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  heroBanner: { width: '100%', height: 140 },
  backRow: { backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER },
  backButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  backText: { fontSize: 16, color: WHITE, marginLeft: 8, fontWeight: '500' },
  header: { backgroundColor: CARD, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: WHITE },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40, maxWidth: 800, width: '100%', alignSelf: 'center' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: CARD, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  statValue: { fontSize: 24, fontWeight: 'bold', color: WHITE, marginTop: 8 },
  statLabel: { fontSize: 11, color: MUTED, marginTop: 4, textAlign: 'center' },

  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: WHITE, marginBottom: 12 },

  tag: { backgroundColor: CARD, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: BORDER },
  tagActive: { backgroundColor: GOLD, borderColor: GOLD },
  tagText: { fontSize: 13, color: MUTED, fontWeight: '500' },
  tagTextActive: { color: BG },

  row: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 12, gap: 6 },
  filterBtn: { flex: 1, paddingVertical: 7, backgroundColor: CARD, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  filterBtnActive: { backgroundColor: GOLD, borderColor: GOLD },
  filterTxt: { fontSize: 12, fontWeight: '600', color: MUTED },
  filterTxtActive: { color: BG },

  pbRow: { flexDirection: 'row', gap: 10 },
  pbCard: { flex: 1, backgroundColor: CARD, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  pbValue: { fontSize: 18, fontWeight: 'bold', color: WHITE, marginTop: 6 },
  pbLabel: { fontSize: 11, color: MUTED, marginTop: 4, textAlign: 'center' },

  chartHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  toggle: { flexDirection: 'row', gap: 6 },
  toggleBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD },
  toggleTxt: { fontSize: 12, fontWeight: '600', color: MUTED },

  chartCard: { backgroundColor: CARD, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: BORDER },
  chartEmpty: { height: 80, justifyContent: 'center', alignItems: 'center' },
  chartEmptyText: { color: MUTED, fontSize: 13 },
  chartFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: BORDER },
  chartFooterTxt: { fontSize: 11, color: MUTED },

  historyCard: { backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  historyRowBorder: { borderTopWidth: 1, borderTopColor: BORDER },
  historyDate: { fontSize: 13, color: WHITE, fontWeight: '500' },
  historyStats: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  historyStat: { fontSize: 13, fontWeight: '600' },
  historyX: { fontSize: 12, color: MUTED },

  empty: { alignItems: 'center', paddingVertical: 64, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: MUTED, marginTop: 16 },
  emptyText: { fontSize: 14, color: BORDER, marginTop: 8, textAlign: 'center' },
});

export default AnalyticsScreen;
