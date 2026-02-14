import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View } from 'react-native';

import { auth, supabase } from './src/lib/supabase';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import BookingScreen from './src/screens/BookingScreen';
import WorkoutScreen from './src/screens/WorkoutScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import AdminScreen from './src/screens/AdminScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

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
      <NavigationContainer>
        {!session ? (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login">
              {() => <LoginScreen />}
            </Stack.Screen>
          </Stack.Navigator>
        ) : (
          <Tab.Navigator
            screenOptions={({ route }) => ({
              tabBarIcon: ({ focused, color, size }) => {
                let iconName: any;
                if (route.name === 'Dashboard') iconName = focused ? 'home' : 'home-outline';
                else if (route.name === 'Book') iconName = focused ? 'calendar' : 'calendar-outline';
                else if (route.name === 'Workout') iconName = focused ? 'barbell' : 'barbell-outline';
                else if (route.name === 'Analytics') iconName = focused ? 'stats-chart' : 'stats-chart-outline';
                else if (route.name === 'Admin') iconName = focused ? 'settings' : 'settings-outline';
                return <Ionicons name={iconName} size={size} color={color} />;
              },
              tabBarActiveTintColor: '#3b82f6',
              tabBarInactiveTintColor: '#9ca3af',
              headerShown: false,
            })}
          >
            <Tab.Screen name="Dashboard">
              {(props) => <DashboardScreen {...props} onLogout={handleLogout} userId={session.user.id} />}
            </Tab.Screen>
            <Tab.Screen name="Book" component={BookingScreen} />
            <Tab.Screen name="Workout" component={WorkoutScreen} />
            <Tab.Screen name="Analytics" component={AnalyticsScreen} />
            {userRole === 'admin' && <Tab.Screen name="Admin" component={AdminScreen} />}
          </Tab.Navigator>
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
