import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View, TouchableOpacity, Text, StyleSheet, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { auth, supabase, db } from './src/lib/supabase';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import BookingScreen from './src/screens/BookingScreen';
import WorkoutScreen from './src/screens/WorkoutScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import AdminScreen from './src/screens/AdminScreen';
import CreditsScreen from './src/screens/CreditsScreen';
import MessagingScreen from './src/screens/MessagingScreen';
import SessionHistoryScreen from './src/screens/SessionHistoryScreen';
import ReferralsScreen from './src/screens/ReferralsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import BlockBookingsScreen from './src/screens/BlockBookingsScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ProgrammeAssignmentsScreen from './src/screens/ProgrammeAssignmentsScreen';
import MyProgrammeScreen from './src/screens/MyProgrammeScreen';
import ClientDetailsScreen from './src/screens/ClientDetailsScreen';
import { MainNavigator } from './src/components/MainNavigator';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Dashboard Stack Navigator (includes Credits, Workout, Analytics, Profile, Notifications, MyProgramme screens)
function DashboardStack({ onLogout, userId }: { onLogout: () => void; userId: string }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardHome">
        {(props) => <DashboardScreen {...props} onLogout={onLogout} userId={userId} />}
      </Stack.Screen>
      <Stack.Screen name="Credits" component={CreditsScreen} />
      <Stack.Screen name="Workout" component={WorkoutScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      <Stack.Screen name="Profile">
        {(props) => <ProfileScreen {...props} route={{ params: { userId } }} />}
      </Stack.Screen>
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="MyProgramme" component={MyProgrammeScreen} />
    </Stack.Navigator>
  );
}

// Admin Stack Navigator (includes BlockBookings, ProgrammeAssignments, and ClientDetails screens)
function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminHome" component={AdminScreen} />
      <Stack.Screen name="BlockBookings" component={BlockBookingsScreen} />
      <Stack.Screen name="ProgrammeAssignments" component={ProgrammeAssignmentsScreen} />
      <Stack.Screen name="ClientDetails" component={ClientDetailsScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'client' | 'admin'>('client');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Check for existing session
    auth.getSession().then(({ session }) => {
      setSession(session);
      if (session) {
        loadUserRole(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadUserRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;

    // Subscribe to new messages for real-time unread count updates
    const messageSubscription = supabase
      .channel('messages-unread')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.new.recipient_id === session.user.id) {
          loadUnreadCount(session.user.id);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.new.recipient_id === session.user.id) {
          loadUnreadCount(session.user.id);
        }
      })
      .subscribe();

    return () => {
      messageSubscription.unsubscribe();
    };
  }, [session]);

  const loadUserRole = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    if (data?.role) {
      setUserRole(data.role);
    }

    // Load unread message count
    loadUnreadCount(userId);
  };

  const loadUnreadCount = async (userId: string) => {
    const { count } = await db.getUnreadCount(userId);
    setUnreadCount(count || 0);
  };

  const handleLogout = async () => {
    await auth.signOut();
    setSession(null);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {!session ? (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login">
              {() => <LoginScreen />}
            </Stack.Screen>
          </Stack.Navigator>
        ) : (
          <MainNavigator
            onLogout={handleLogout}
            userId={session.user.id}
            userRole={userRole}
            unreadCount={unreadCount}
          />
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
