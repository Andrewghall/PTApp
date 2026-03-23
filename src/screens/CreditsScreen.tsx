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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../lib/supabase';

const logoBanner = require('../../logo_banner.png');

const GOLD = '#c8a94e';
const BG_DARK = '#0a0a0a';
const BG_CARD = '#141414';
const BG_INPUT = '#1a1a1a';
const BORDER = '#2a2a2a';
const TEXT_WHITE = '#ffffff';
const TEXT_MUTED = '#9ca3af';
const GREEN = '#10b981';

interface CreditsScreenProps {
  navigation: any;
}

const CreditsScreen: React.FC<CreditsScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [creditPacks, setCreditPacks] = useState<any[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { session } = await auth.getSession();
      if (session) {
        const { data: profile } = await db.getClientProfile(session.user.id);
        if (profile) {
          setClientId(profile.id);
          const { data: credits } = await db.getCreditBalance(profile.id);
          setCurrentBalance(credits?.balance || 0);
        }
      }
      const { data: packs } = await db.getCreditPacks();
      setCreditPacks(packs || []);
    } catch (error) {
      console.error('Error loading credits data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle return from Stripe Checkout
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('payment') === 'success') {
        Alert.alert('Payment Successful!', 'Your sessions have been added to your account.');
        window.history.replaceState({}, '', window.location.pathname);
        loadData();
      } else if (params.get('payment') === 'cancelled') {
        Alert.alert('Payment Cancelled', 'Your payment was not completed.');
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  const handlePurchase = async (pack: any) => {
    if (!clientId) return;
    setPurchasing(true);
    try {
      const { data, error } = await db.createCheckoutSession(pack.id, clientId);
      if (error) throw new Error(error.message || 'Failed to create checkout session');
      if (data?.url) {
        if (typeof window !== 'undefined') {
          window.location.href = data.url;
        }
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start checkout');
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={GOLD} />
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
          <Ionicons name="arrow-back" size={24} color={GOLD} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Buy Sessions</Text>
          <Text style={styles.headerSubtitle}>Choose your package</Text>
        </View>

        {/* Current Balance */}
        <View style={styles.balanceCard}>
          <Ionicons name="wallet" size={32} color={GOLD} />
          <View style={styles.balanceInfo}>
            <Text style={styles.balanceLabel}>Current Balance</Text>
            <Text style={styles.balanceAmount}>{currentBalance} sessions</Text>
          </View>
        </View>

        {/* Low Credit Warning */}
        {currentBalance <= 2 && (
          <View style={styles.lowCreditWarning}>
            <Ionicons name="warning" size={20} color="#f59e0b" />
            <Text style={styles.lowCreditText}>
              {currentBalance === 0
                ? 'You have no sessions remaining. Buy a pack to book your next session!'
                : `You're running low on sessions. Top up to keep training!`}
            </Text>
          </View>
        )}

        {/* Credit Packs */}
        <View style={styles.packsSection}>
          <Text style={styles.sectionTitle}>Session Packages</Text>
          {creditPacks.map((pack) => {
            const hasDiscount = pack.discount_percent > 0;
            const displayPrice = Math.round(Number(pack.price) / 100);
            const pricePerCredit = Math.round(displayPrice / pack.credits);
            const savings = hasDiscount
              ? Math.round((pack.credits * 25 * pack.discount_percent) / 100)
              : 0;

            return (
              <View
                key={pack.id}
                style={[styles.packCard, hasDiscount && styles.packCardFeatured]}
              >
                {hasDiscount && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>{pack.discount_percent}% OFF</Text>
                  </View>
                )}

                <View style={styles.packContent}>
                  <View style={styles.packInfo}>
                    <Text style={styles.packCredits}>{pack.credits} Sessions</Text>
                    <Text style={styles.packDescription}>
                      {'\u20AC'}{pricePerCredit} per session
                    </Text>
                    {hasDiscount && (
                      <Text style={styles.savingsText}>Save {'\u20AC'}{savings}!</Text>
                    )}
                  </View>

                  <View style={styles.packPricing}>
                    <Text style={styles.packPrice}>{'\u20AC'}{displayPrice}</Text>
                    {hasDiscount && (
                      <Text style={styles.originalPrice}>
                        {'\u20AC'}{(pack.credits * 25)}
                      </Text>
                    )}
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.buyButton,
                    hasDiscount && styles.buyButtonFeatured,
                    purchasing && styles.buyButtonDisabled,
                  ]}
                  onPress={() => handlePurchase(pack)}
                  disabled={purchasing}
                >
                  {purchasing ? (
                    <ActivityIndicator color={BG_DARK} />
                  ) : (
                    <Text style={styles.buyButtonText}>Buy Now</Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color={GOLD} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>How It Works</Text>
              <Text style={styles.infoText}>
                {'\u2022'} 1 session = {'\u20AC'}25{'\n'}
                {'\u2022'} Sessions never expire{'\n'}
                {'\u2022'} Book anytime{'\n'}
                {'\u2022'} Cancel within the cancellation window for a credit back
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="shield-checkmark" size={24} color={GREEN} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Secure Payment</Text>
              <Text style={styles.infoText}>
                Payments are processed securely via Stripe. Your payment information is
                never stored on our servers.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_DARK,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BG_DARK,
  },
  heroBanner: {
    width: '100%',
    height: 160,
  },
  backButtonContainer: {
    backgroundColor: BG_CARD,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: GOLD,
    marginLeft: 8,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: BG_CARD,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: TEXT_WHITE,
  },
  headerSubtitle: {
    fontSize: 16,
    color: TEXT_MUTED,
    marginTop: 4,
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1710',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: GOLD,
  },
  balanceInfo: {
    marginLeft: 16,
  },
  balanceLabel: {
    fontSize: 14,
    color: TEXT_MUTED,
    fontWeight: '500',
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: GOLD,
  },
  lowCreditWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1500',
    marginHorizontal: 20,
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f59e0b44',
  },
  lowCreditText: {
    fontSize: 14,
    color: '#f59e0b',
    marginLeft: 10,
    flex: 1,
  },
  packsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: TEXT_WHITE,
    marginBottom: 16,
  },
  packCard: {
    backgroundColor: BG_CARD,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  packCardFeatured: {
    borderColor: GREEN,
    backgroundColor: '#0a1a10',
  },
  discountBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: GREEN,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 1,
  },
  discountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  packContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  packInfo: {
    flex: 1,
  },
  packCredits: {
    fontSize: 24,
    fontWeight: 'bold',
    color: TEXT_WHITE,
  },
  packDescription: {
    fontSize: 14,
    color: TEXT_MUTED,
    marginTop: 4,
  },
  savingsText: {
    fontSize: 14,
    color: GREEN,
    fontWeight: '600',
    marginTop: 4,
  },
  packPricing: {
    alignItems: 'flex-end',
  },
  packPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: GOLD,
  },
  originalPrice: {
    fontSize: 14,
    color: TEXT_MUTED,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  buyButton: {
    backgroundColor: GOLD,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buyButtonFeatured: {
    backgroundColor: GREEN,
  },
  buyButtonDisabled: {
    backgroundColor: '#555',
  },
  buyButtonText: {
    color: BG_DARK,
    fontSize: 16,
    fontWeight: '700',
  },
  infoSection: {
    padding: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: BG_CARD,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_WHITE,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: TEXT_MUTED,
    lineHeight: 20,
  },
});

export default CreditsScreen;
