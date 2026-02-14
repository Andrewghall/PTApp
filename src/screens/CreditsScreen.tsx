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

// Import the logo banner image
const logoBanner = require('../../logo banner.png');

const CreditsScreen: React.FC = () => {
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

          // Load current balance
          const { data: credits } = await db.getCreditBalance(profile.id);
          setCurrentBalance(credits?.balance || 0);
        }
      }

      // Load credit packs
      const { data: packs } = await db.getCreditPacks();
      setCreditPacks(packs || []);
    } catch (error) {
      console.error('Error loading credits data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (pack: any) => {
    if (!clientId) return;

    const displayPrice = Number(pack.price);
    Alert.alert(
      'Purchase Sessions',
      `Buy ${pack.credits} sessions for £${displayPrice}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy Now',
          onPress: async () => {
            setPurchasing(true);
            try {
              // In real app, this would integrate with Stripe
              // For now, we'll simulate the purchase
              await db.addCredits(
                clientId,
                pack.credits,
                `Purchased ${pack.credits} session pack for £${displayPrice}`
              );

              Alert.alert('Success!', `${pack.credits} sessions added to your account!`);
              loadData(); // Refresh balance
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Purchase failed');
            } finally {
              setPurchasing(false);
            }
          },
        },
      ]
    );
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

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Buy Sessions</Text>
          <Text style={styles.headerSubtitle}>Choose your package</Text>
        </View>

        {/* Current Balance */}
        <View style={styles.balanceCard}>
          <Ionicons name="wallet" size={32} color="#3b82f6" />
          <View style={styles.balanceInfo}>
            <Text style={styles.balanceLabel}>Current Balance</Text>
            <Text style={styles.balanceAmount}>{currentBalance} sessions</Text>
          </View>
        </View>

        {/* Credit Packs */}
        <View style={styles.packsSection}>
          <Text style={styles.sectionTitle}>Session Packages</Text>
          {creditPacks.map((pack) => {
            const hasDiscount = pack.discount_percent > 0;
            // Format price properly - remove decimals for whole numbers
            const displayPrice = Math.round(Number(pack.price));
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
                      £{pricePerCredit} per session
                    </Text>
                    {hasDiscount && (
                      <Text style={styles.savingsText}>Save £{savings}!</Text>
                    )}
                  </View>

                  <View style={styles.packPricing}>
                    <Text style={styles.packPrice}>£{displayPrice}</Text>
                    {hasDiscount && (
                      <Text style={styles.originalPrice}>
                        £{(pack.credits * 25)}
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
                    <ActivityIndicator color="white" />
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
            <Ionicons name="information-circle" size={24} color="#3b82f6" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>How It Works</Text>
              <Text style={styles.infoText}>
                • 1 session = £25{'\n'}
                • Sessions never expire{'\n'}
                • Book anytime{'\n'}
                • Full refund if cancelled in advance
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="shield-checkmark" size={24} color="#10b981" />
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
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  heroBanner: {
    width: '100%',
    height: 160,
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
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  balanceInfo: {
    marginLeft: 16,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  packsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  packCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  packCardFeatured: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  discountBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: '#10b981',
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
    color: '#1f2937',
  },
  packDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  savingsText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
    marginTop: 4,
  },
  packPricing: {
    alignItems: 'flex-end',
  },
  packPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  originalPrice: {
    fontSize: 14,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  buyButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buyButtonFeatured: {
    backgroundColor: '#10b981',
  },
  buyButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    padding: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
});

export default CreditsScreen;
