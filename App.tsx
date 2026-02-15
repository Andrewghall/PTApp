import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View } from 'react-native';
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

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Custom Tab Bar Icon - Simple blue filled/gray outlined style
const TabBarIcon = ({ iconName, focused }: { iconName: any; focused: boolean }) => {
  return (
    <Ionicons
      name={iconName}
      size={24}
      color={focused ? '#3b82f6' : '#9ca3af'}
    />
  );
};

// Dashboard Stack Navigator (includes Credits, Workout, Analytics, Profile screens)
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
          <Tab.Navigator
            screenOptions={({ route }) => ({
              tabBarIcon: ({ focused }) => {
                let iconName: any;

                if (route.name === 'Dashboard') {
                  iconName = focused ? 'home' : 'home-outline';
                } else if (route.name === 'Book') {
                  iconName = focused ? 'calendar' : 'calendar-outline';
                } else if (route.name === 'Messages') {
                  iconName = focused ? 'mail' : 'mail-outline';
                } else if (route.name === 'History') {
                  iconName = focused ? 'time' : 'time-outline';
                } else if (route.name === 'Refer') {
                  iconName = focused ? 'gift' : 'gift-outline';
                } else if (route.name === 'Admin') {
                  iconName = focused ? 'settings' : 'settings-outline';
                }

                return <TabBarIcon iconName={iconName} focused={focused} />;
              },
              tabBarActiveTintColor: '#3b82f6',
              tabBarInactiveTintColor: '#9ca3af',
              tabBarStyle: {
                backgroundColor: '#ffffff',
                borderTopColor: '#e5e7eb',
                borderTopWidth: 1,
                paddingBottom: 8,
                paddingTop: 12,
                height: 80,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 12,
              },
              tabBarLabelStyle: {
                fontSize: 11,
                fontWeight: '600',
                marginTop: 4,
              },
              tabBarIconStyle: {
                marginBottom: 0,
              },
              headerShown: false,
            })}
          >
            <Tab.Screen name="Dashboard">
              {() => <DashboardStack onLogout={handleLogout} userId={session.user.id} />}
            </Tab.Screen>
            <Tab.Screen name="Book" component={BookingScreen} />
            <Tab.Screen
              name="Messages"
              component={MessagingScreen}
              options={{
                tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
              }}
            />
            <Tab.Screen name="History" component={SessionHistoryScreen} />
            <Tab.Screen name="Refer" component={ReferralsScreen} />
            {userRole === 'admin' && <Tab.Screen name="Admin" component={AdminScreen} />}
          </Tab.Navigator>
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
