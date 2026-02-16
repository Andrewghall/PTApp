import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface HamburgerMenuProps {
  visible: boolean;
  onClose: () => void;
  onLogout: () => void;
  userRole: 'client' | 'admin';
  unreadCount?: number;
}

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  visible,
  onClose,
  onLogout,
  userRole,
  unreadCount = 0,
}) => {
  const navigation = useNavigation<any>();

  const navigateTo = (screen: string) => {
    onClose();
    navigation.navigate(screen);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.menuContainer} onStartShouldSetResponder={() => true}>
          <SafeAreaView style={styles.menuContent}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Menu</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.menuItems}>
              <MenuItem
                icon="home"
                label="Dashboard"
                onPress={() => navigateTo('DashboardMain')}
              />
              <MenuItem
                icon="calendar"
                label="Book a Session"
                onPress={() => navigateTo('Book')}
              />
              <MenuItem
                icon="mail"
                label="Messages"
                badge={unreadCount > 0 ? unreadCount : undefined}
                onPress={() => navigateTo('Messages')}
              />
              <MenuItem
                icon="time"
                label="Session History"
                onPress={() => navigateTo('History')}
              />
              <MenuItem
                icon="gift"
                label="Refer a Friend"
                onPress={() => navigateTo('Refer')}
              />
              <MenuItem
                icon="fitness"
                label="My Programme"
                onPress={() => navigateTo('MyProgramme')}
              />
              {userRole === 'admin' && (
                <MenuItem
                  icon="settings"
                  label="Admin Portal"
                  onPress={() => navigateTo('Admin')}
                />
              )}
            </View>

            <View style={styles.menuFooter}>
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={() => {
                  onClose();
                  onLogout();
                }}
              >
                <Ionicons name="log-out" size={20} color="#ef4444" />
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

interface MenuItemProps {
  icon: string;
  label: string;
  badge?: number;
  onPress: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, badge, onPress }) => {
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

export const HamburgerButton: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  return (
    <TouchableOpacity onPress={onPress} style={styles.hamburgerButton}>
      <View style={styles.hamburgerIcon}>
        <View style={styles.hamburgerLine} />
        <View style={styles.hamburgerLine} />
        <View style={styles.hamburgerLine} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
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
