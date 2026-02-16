import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../lib/supabase';
import { format } from 'date-fns';

// Import the logo banner image
const logoBanner = require('../../logo banner.png');

interface ReferralsScreenProps {
  navigation: any;
}

const ReferralsScreen: React.FC<ReferralsScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [creatingCode, setCreatingCode] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { session } = await auth.getSession();
      if (!session) return;

      const { data: profile } = await db.getClientProfile(session.user.id);
      if (!profile) return;

      setClientId(profile.id);

      // Get referral stats
      const { data: referralStats } = await db.getReferralStats(profile.id);

      if (referralStats) {
        setStats(referralStats);
        setReferrals(referralStats.referrals || []);

        // Find existing referral code
        const codeReferral = referralStats.referrals?.find((r: any) => r.referral_code);
        if (codeReferral) {
          setReferralCode(codeReferral.referral_code);
        }
      }
    } catch (error) {
      console.error('Error loading referrals:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReferralCode = async () => {
    if (!clientId || referralCode) return;

    setCreatingCode(true);
    try {
      const { data } = await db.createReferralCode(clientId);
      if (data) {
        setReferralCode(data.referral_code);
        loadData(); // Reload to get updated stats
        Alert.alert('Success!', 'Your referral code has been created!');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create referral code');
    } finally {
      setCreatingCode(false);
    }
  };

  const shareReferralCode = async () => {
    if (!referralCode) return;

    try {
      const message = `Join me at Elevate PT! Use my referral code ${referralCode} when you sign up and we both get a free session! 💪`;

      await Share.share({
        message,
        title: 'Join Elevate PT',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

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

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Refer a Friend</Text>
          <Text style={styles.headerSubtitle}>Earn free sessions together!</Text>
        </View>

        {/* Referral Code Card */}
        <View style={styles.codeCard}>
          <View style={styles.codeHeader}>
            <Ionicons name="gift" size={32} color="#3b82f6" />
            <Text style={styles.codeTitle}>Your Referral Code</Text>
          </View>

          {referralCode ? (
            <>
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>{referralCode}</Text>
              </View>

              <TouchableOpacity
                style={styles.shareButton}
                onPress={shareReferralCode}
              >
                <Ionicons name="share-social" size={20} color="white" />
                <Text style={styles.shareButtonText}>Share Code</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.generateButton}
              onPress={generateReferralCode}
              disabled={creatingCode}
            >
              {creatingCode ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={20} color="white" />
                  <Text style={styles.generateButtonText}>Generate Code</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* How It Works */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>How It Works</Text>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Share Your Code</Text>
              <Text style={styles.stepText}>
                Send your unique referral code to friends who want to start training
              </Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>They Sign Up</Text>
              <Text style={styles.stepText}>
                Your friend uses your code when creating their account
              </Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>You Both Win!</Text>
              <Text style={styles.stepText}>
                You each receive 1 free session (€25 value) added to your account
              </Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        {stats && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Your Referral Stats</Text>

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Ionicons name="time" size={28} color="#f59e0b" />
                <Text style={styles.statValue}>{stats.pending}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>

              <View style={styles.statCard}>
                <Ionicons name="checkmark-circle" size={28} color="#10b981" />
                <Text style={styles.statValue}>{stats.completed}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>

              <View style={styles.statCard}>
                <Ionicons name="wallet" size={28} color="#3b82f6" />
                <Text style={styles.statValue}>€{stats.totalEarned}</Text>
                <Text style={styles.statLabel}>Total Earned</Text>
              </View>
            </View>
          </View>
        )}

        {/* Referral List */}
        {referrals.length > 0 && (
          <View style={styles.referralsSection}>
            <Text style={styles.sectionTitle}>Your Referrals</Text>

            {referrals.map((referral) => (
              <View key={referral.id} style={styles.referralCard}>
                <View style={styles.referralInfo}>
                  <Ionicons
                    name={referral.status === 'completed' ? 'checkmark-circle' : 'time'}
                    size={24}
                    color={referral.status === 'completed' ? '#10b981' : '#f59e0b'}
                  />
                  <View style={styles.referralDetails}>
                    <Text style={styles.referralStatus}>
                      {referral.status === 'completed' ? 'Completed' : 'Pending'}
                    </Text>
                    <Text style={styles.referralDate}>
                      {format(new Date(referral.created_at), 'MMM d, yyyy')}
                    </Text>
                  </View>
                </View>

                {referral.status === 'completed' && (
                  <View style={styles.rewardBadge}>
                    <Text style={styles.rewardText}>+€25</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Terms */}
        <View style={styles.termsSection}>
          <Text style={styles.termsTitle}>Terms & Conditions</Text>
          <Text style={styles.termsText}>
            • Both you and your friend must be new or existing clients{'\n'}
            • Your friend must use your referral code during signup{'\n'}
            • Free session credits are added after their first booking{'\n'}
            • Credits never expire and can be used for any PT session{'\n'}
            • Referral rewards cannot be combined with other offers{'\n'}
            • Elevate PT reserves the right to modify or cancel this program
          </Text>
        </View>
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
  header: {
    padding: 20,
    backgroundColor: 'white',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  codeCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  codeHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  codeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 8,
  },
  codeBox: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  codeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3b82f6',
    letterSpacing: 2,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  shareButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  stepText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  statsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  referralsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  referralCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  referralInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  referralDetails: {
    gap: 2,
  },
  referralStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  referralDate: {
    fontSize: 13,
    color: '#6b7280',
  },
  rewardBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  rewardText: {
    color: '#16a34a',
    fontSize: 14,
    fontWeight: '600',
  },
  termsSection: {
    backgroundColor: '#f9fafb',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 40,
  },
  termsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  termsText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 20,
  },
});

export default ReferralsScreen;
