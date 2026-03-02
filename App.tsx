import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View, TouchableOpacity, Text, StyleSheet, Modal, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Import CSS for web to fix scrolling
if (Platform.OS === 'web') {
  require('./App.css');
}

import { auth, supabase, db } from './src/lib/supabase';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import BookingScreen from './src/screens/BookingScreen';
import WorkoutScreen from './src/screens/WorkoutScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import AdminScreen from './src/screens/AdminScreen';
import CreditsScreen from './src/screens/CreditsScreen';

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

const linking = {
  prefixes: [],
  config: {
    screens: {
      Login: 'login',
      DashboardMain: '',
      Book: 'book',
      History: 'history',
      Refer: 'refer',
      Credits: 'credits',
      Workout: 'workout',
      Analytics: 'analytics',
      Profile: 'profile',
      Notifications: 'notifications',
      MyProgramme: 'programme',
      Admin: 'admin',
      BlockBookings: 'admin/block-bookings',
      ProgrammeAssignments: 'admin/programme-assignments',
      ClientDetails: 'admin/client/:clientId',
    },
  },
};

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'client' | 'admin'>('client');
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

  const loadUserRole = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    if (data?.role) {
      setUserRole(data.role);
    }

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
      <NavigationContainer linking={linking}>
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
          />
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
