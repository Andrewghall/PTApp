import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import DashboardScreen from '../screens/DashboardScreen';
import BookingScreen from '../screens/BookingScreen';
import SessionHistoryScreen from '../screens/SessionHistoryScreen';
import ReferralsScreen from '../screens/ReferralsScreen';
import CreditsScreen from '../screens/CreditsScreen';
import WorkoutScreen from '../screens/WorkoutScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import MyProgrammeScreen from '../screens/MyProgrammeScreen';
import AdminScreen from '../screens/AdminScreen';
import ClientDetailsScreen from '../screens/ClientDetailsScreen';

const Stack = createStackNavigator();

interface MainNavigatorProps {
  onLogout: () => void;
  userId: string;
  userRole: 'client' | 'admin';
}

export const MainNavigator: React.FC<MainNavigatorProps> = ({
  onLogout,
  userId,
  userRole,
}) => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {userRole === 'admin' ? (
        <>
          <Stack.Screen name="Admin">
            {(props) => <AdminScreen {...props} onLogout={onLogout} />}
          </Stack.Screen>
          <Stack.Screen name="ClientDetails" component={ClientDetailsScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="DashboardMain" options={{ title: 'Dashboard' }}>
            {(props) => <DashboardScreen {...props} onLogout={onLogout} userId={userId} />}
          </Stack.Screen>
          <Stack.Screen name="Book" component={BookingScreen} options={{ title: 'Book a Session' }} />
          <Stack.Screen name="History" component={SessionHistoryScreen} options={{ title: 'Session History' }} />
          <Stack.Screen name="Refer" component={ReferralsScreen} options={{ title: 'Refer a Friend' }} />
          <Stack.Screen name="Credits" component={CreditsScreen} />
          <Stack.Screen name="Workout" component={WorkoutScreen} />
          <Stack.Screen name="Analytics" component={AnalyticsScreen} />
          <Stack.Screen name="Profile">
            {(props) => <ProfileScreen {...props} route={{ params: { userId } }} />}
          </Stack.Screen>
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="MyProgramme" component={MyProgrammeScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};
