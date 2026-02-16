import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { db, supabase, auth } from '../lib/supabase';
import { HamburgerButton, HamburgerMenu } from '../components/HamburgerMenu';

const logoBanner = require('../../logo banner.png');

interface ProfileScreenProps {
  navigation: any;
  route: any;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation, route }) => {
  const { userId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [creditBalance, setCreditBalance] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const [userRole, setUserRole] = useState<'client' | 'admin'>('client');

  useEffect(() => {
    loadProfileData();
  }, [userId]);

  const loadProfileData = async () => {
    try {
      // Get client profile
      const { data: profile } = await db.getClientProfile(userId);
      if (profile) {
        setClientProfile(profile);
        setPhone(profile.phone || '');

        // Get user role
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();
        if (userProfile?.role) {
          setUserRole(userProfile.role);
        }

        // Load profile image if exists
        if (profile.profile_image_url) {
          setProfileImage(profile.profile_image_url);
        }

        // Get credit balance
        const { data: credits } = await db.getCreditBalance(profile.id);
        setCreditBalance(credits?.balance || 0);

        // Get total sessions (completed bookings)
        const { data: bookings } = await db.getClientBookings(profile.id, 'completed');
        setTotalSessions(bookings?.length || 0);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveField = async (field: string) => {
    if (!clientProfile?.id) return;
    setSaving(true);
    setSaveMsg(null);

    const updates: any = {};
    if (field === 'phone') updates.phone = phone;

    const { error } = await db.updateClientProfile(clientProfile.id, updates);
    setSaving(false);

    if (error) {
      setSaveMsg('Failed to save');
    } else {
      setSaveMsg('Saved!');
      setEditingField(null);
      await loadProfileData(); // Refresh data
    }

    setTimeout(() => setSaveMsg(null), 3000);
  };

  const handleImageUpload = async () => {
    // Request permission to access media library
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to upload a photo.');
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const imageUri = result.assets[0].uri;

      try {
        // Show loading
        setProfileImage(imageUri); // Update UI immediately with local image

        // Upload to Supabase Storage
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const fileExt = imageUri.split('.').pop() || 'jpg';
        const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('profile-images')
          .upload(filePath, blob, {
            contentType: `image/${fileExt}`,
            upsert: true
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('profile-images')
          .getPublicUrl(filePath);

        // Save URL to database
        const { error: updateError } = await db.updateClientProfile(profile.id, {
          profile_image_url: urlData.publicUrl
        });

        if (updateError) throw updateError;

        Alert.alert('Success', 'Profile picture updated!');
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to upload image');
        console.error('Image upload error:', error);
      }
    }
  };

  const calculateAge = (dateString: string | null) => {
    if (!dateString) return null;
    const dob = new Date(dateString);
    const today = new Date();
    const age = Math.floor((today.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    return age;
  };

  const calculateMembershipMonths = (dateString: string | null) => {
    if (!dateString) return 0;
    const startDate = new Date(dateString);
    const today = new Date();
    const months = Math.floor((today.getTime() - startDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000));
    return months;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!clientProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load profile</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const age = calculateAge(clientProfile.date_of_birth);
  const membershipMonths = calculateMembershipMonths(clientProfile.created_at);
  const fullName = `${clientProfile.first_name} ${clientProfile.last_name}`;

  return (
    <SafeAreaView style={styles.container}>
      {/* Hero Banner */}
      <Image source={logoBanner} style={styles.heroBanner} resizeMode="cover" />

      {/* Navigation Bar */}
      <View style={styles.navigationBar}>
        <HamburgerButton onPress={() => setMenuVisible(true)} />
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

        {/* Profile Picture Section */}
        <View style={styles.profilePictureSection}>
          <TouchableOpacity onPress={handleImageUpload} style={styles.profilePictureContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profilePicture} />
            ) : (
              <View style={styles.profilePicturePlaceholder}>
                <Ionicons name="person" size={48} color="#9ca3af" />
              </View>
            )}
            <View style={styles.uploadOverlay}>
              <Ionicons name="camera" size={20} color="white" />
            </View>
          </TouchableOpacity>
          <Text style={styles.profileName}>{fullName}</Text>
          <Text style={styles.profileEmail}>{clientProfile.email || 'No email'}</Text>
          <TouchableOpacity onPress={handleImageUpload} style={styles.uploadButton}>
            <Text style={styles.uploadButtonText}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Gender</Text>
            <Text style={styles.infoValue}>
              {clientProfile.gender === 'male' ? 'Male' : clientProfile.gender === 'female' ? 'Female' : 'Not specified'}
            </Text>
          </View>

          {clientProfile.date_of_birth && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date of Birth</Text>
                <Text style={styles.infoValue}>
                  {new Date(clientProfile.date_of_birth).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>

              {age && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Age</Text>
                  <Text style={styles.infoValue}>{age} years</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Contact Information — editable */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>

          {saveMsg && (
            <View
              style={{
                backgroundColor: saveMsg === 'Saved!' ? '#f0fdf4' : '#fef2f2',
                padding: 10,
                borderRadius: 8,
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  color: saveMsg === 'Saved!' ? '#16a34a' : '#dc2626',
                  fontSize: 13,
                  textAlign: 'center',
                }}
              >
                {saveMsg}
              </Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{clientProfile.email || 'Not set'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mobile Number</Text>
            {editingField === 'phone' ? (
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0, paddingVertical: 8, fontSize: 14 }]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter mobile number"
                  keyboardType="phone-pad"
                />
                <TouchableOpacity
                  onPress={() => saveField('phone')}
                  disabled={saving}
                  style={{
                    backgroundColor: '#3b82f6',
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>
                    {saving ? '...' : 'Save'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setEditingField(null);
                    setPhone(clientProfile.phone || '');
                  }}
                  style={{ paddingHorizontal: 8, paddingVertical: 8 }}
                >
                  <Text style={{ color: '#6b7280', fontSize: 13 }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setEditingField('phone')}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <Text style={[styles.infoValue, { marginRight: 8 }]}>{phone || 'Not set'}</Text>
                <Text style={{ color: '#3b82f6', fontSize: 13, fontWeight: '600' }}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Membership Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Membership Information</Text>

          {clientProfile.created_at && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Member Since</Text>
              <Text style={styles.infoValue}>
                {new Date(clientProfile.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Sessions Attended</Text>
            <Text style={styles.infoValue}>{totalSessions}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Credits Remaining</Text>
            <Text style={styles.infoValue}>{creditBalance}</Text>
          </View>

          {membershipMonths > 0 && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Membership Length</Text>
              <Text style={styles.infoValue}>{membershipMonths} months</Text>
            </View>
          )}
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalSessions}</Text>
            <Text style={styles.statLabel}>Total Sessions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{membershipMonths}</Text>
            <Text style={styles.statLabel}>Months Active</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Hamburger Menu */}
      <HamburgerMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onLogout={async () => {
          await auth.signOut();
          navigation.navigate('Login');
        }}
        userRole={userRole}
        unreadCount={0}
      />
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#6b7280',
    marginBottom: 20,
  },
  navigationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  scrollView: {
    flex: 1,
  },
  heroBanner: {
    width: '100%',
    height: 160,
  },
  profilePictureSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: 'white',
    marginBottom: 16,
  },
  profilePictureContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profilePicturePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3b82f6',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  uploadButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: 'white',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default ProfileScreen;
