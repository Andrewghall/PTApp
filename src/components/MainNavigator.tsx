import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createStackNavigator } from '@react-navigation/stack';

const logoBanner = require('../../logo banner.png');

import DashboardScreen from '../screens/DashboardScreen';
import BookingScreen from '../screens/BookingScreen';
import MessagingScreen from '../screens/MessagingScreen';
import SessionHistoryScreen from '../screens/SessionHistoryScreen';
import ReferralsScreen from '../screens/ReferralsScreen';
import CreditsScreen from '../screens/CreditsScreen';
import WorkoutScreen from '../screens/WorkoutScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import MyProgrammeScreen from '../screens/MyProgrammeScreen';
import AdminScreen from '../screens/AdminScreen';
import BlockBookingsScreen from '../screens/BlockBookingsScreen';
import ProgrammeAssignmentsScreen from '../screens/ProgrammeAssignmentsScreen';
import ClientDetailsScreen from '../screens/ClientDetailsScreen';

const Stack = createStackNavigator();

interface MainNavigatorProps {
  onLogout: () => void;
  userId: string;
  userRole: 'client' | 'admin';
  unreadCount: number;
}

export const MainNavigator: React.FC<MainNavigatorProps> = ({
  onLogout,
  userId,
  userRole,
  unreadCount,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="DashboardMain"
          options={{ title: 'Dashboard' }}
        >
          {(props) => <DashboardScreen {...props} onLogout={onLogout} userId={userId} />}
        </Stack.Screen>
        <Stack.Screen name="Book" component={BookingScreen} options={{ title: 'Book a Session' }} />
        <Stack.Screen name="Messages" component={MessagingScreen} options={{ title: 'Messages' }} />
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
        {userRole === 'admin' && (
          <>
            <Stack.Screen name="Admin" component={AdminScreen} options={{ title: 'Admin Portal' }} />
            <Stack.Screen name="BlockBookings" component={BlockBookingsScreen} />
            <Stack.Screen name="ProgrammeAssignments" component={ProgrammeAssignmentsScreen} />
            <Stack.Screen name="ClientDetails" component={ClientDetailsScreen} />
          </>
        )}
      </Stack.Navigator>

      {/* Hamburger Menu Modal */}
      <Modal
        visible={menuVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer} onStartShouldSetResponder={() => true}>
            <SafeAreaView style={styles.menuContent}>
              <View style={styles.menuHeader}>
                <Text style={styles.menuTitle}>Menu</Text>
                <TouchableOpacity onPress={() => setMenuVisible(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.menuItems}>
                <MenuItem
                  icon="home"
                  label="Dashboard"
                  onPress={() => { setMenuVisible(false); }}
                  navigationTarget="DashboardMain"
                />
                <MenuItem
                  icon="calendar"
                  label="Book a Session"
                  onPress={() => { setMenuVisible(false); }}
                  navigationTarget="Book"
                />
                <MenuItem
                  icon="mail"
                  label="Messages"
                  badge={unreadCount > 0 ? unreadCount : undefined}
                  onPress={() => { setMenuVisible(false); }}
                  navigationTarget="Messages"
                />
                <MenuItem
                  icon="time"
                  label="Session History"
                  onPress={() => { setMenuVisible(false); }}
                  navigationTarget="History"
                />
                <MenuItem
                  icon="gift"
                  label="Refer a Friend"
                  onPress={() => { setMenuVisible(false); }}
                  navigationTarget="Refer"
                />
                {userRole === 'admin' && (
                  <MenuItem
                    icon="settings"
                    label="Admin Portal"
                    onPress={() => { setMenuVisible(false); }}
                    navigationTarget="Admin"
                  />
                )}
              </View>

              <View style={styles.menuFooter}>
                <TouchableOpacity style={styles.logoutButton} onPress={() => { setMenuVisible(false); onLogout(); }}>
                  <Ionicons name="log-out" size={20} color="#ef4444" />
                  <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

interface MenuItemProps {
  icon: string;
  label: string;
  badge?: number;
  onPress: () => void;
  navigationTarget: string;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, badge, onPress, navigationTarget }) => {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <Ionicons name={icon as any} size={24} color="#1f2937" />
        <Text style={styles.menuItemText}>{label}</Text>
      </View>
      {badge !== undefined && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  heroBanner: {
    width: '100%',
    height: 160,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  hamburgerButton: {
    padding: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  hamburgerIcon: {
    width: 24,
    height: 18,
    justifyContent: 'space-between',
  },
  hamburgerLine: {
    width: 24,
    height: 3,
    backgroundColor: '#1f2937',
    borderRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
  },
  menuContainer: {
    width: '80%',
    maxWidth: 320,
    height: '100%',
    backgroundColor: 'white',
  },
  menuContent: {
    flex: 1,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  menuTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    fontSize: 32,
    color: '#6b7280',
    fontWeight: '300',
  },
  menuItems: {
    flex: 1,
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  menuFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
});
