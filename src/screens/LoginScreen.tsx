import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  SafeAreaView,
  Image,
  ActivityIndicator,
} from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { auth } from '../lib/supabase';

const logoBanner = require('../../logo_banner.png');

const GOLD = '#c8a94e';
const BG_DARK = '#0a0a0a';
const BG_CARD = '#141414';
const BG_INPUT = '#1a1a1a';
const BORDER = '#2a2a2a';
const TEXT_WHITE = '#ffffff';
const TEXT_MUTED = '#9ca3af';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | 'prefer_not_to_say' | ''>('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleForgotPassword = async () => {
    if (!email) {
      setErrorMsg('Please enter your email address');
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const { error } = await auth.resetPassword(email);
      setLoading(false);
      if (error) {
        setErrorMsg(error.message);
        return;
      }
      setSuccessMsg('Password reset email sent! Check your inbox and follow the link to reset your password.');
    } catch (e: any) {
      setLoading(false);
      setErrorMsg(e?.message || 'Something went wrong. Please try again.');
    }
  };

  const handleAuth = async () => {
    if (!email || !password) {
      setErrorMsg('Please enter email and password');
      return;
    }
    if (isSignUp && (!firstName || !lastName || !phone || !dateOfBirth)) {
      setErrorMsg('Please fill in all required fields');
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await auth.signUp(email, password, firstName, lastName, phone, dateOfBirth, gender, referralCode);
        setLoading(false);
        if (error) {
          setErrorMsg(error.message);
          return;
        }
        setSuccessMsg('Account created! Check your email to confirm, then sign in.');
        setIsSignUp(false);
        setEmail('');
        setPassword('');
        setFirstName('');
        setLastName('');
        setPhone('');
        setDateOfBirth('');
        setGender('');
        setReferralCode('');
      } else {
        const { error } = await auth.signIn(email, password);
        setLoading(false);
        if (error) {
          if (error.message?.toLowerCase().includes('email not confirmed')) {
            setErrorMsg('Email not confirmed yet. Check your inbox for the confirmation link.');
          } else {
            setErrorMsg(error.message);
          }
          return;
        }
      }
    } catch (e: any) {
      setLoading(false);
      setErrorMsg(e?.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Image source={logoBanner} style={styles.heroBanner as any} resizeMode="cover" />

          <Text style={styles.subtitle}>
            {isForgotPassword ? 'Reset your password' : isSignUp ? 'Create your account' : 'Welcome back'}
          </Text>

          {errorMsg && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}
          {successMsg && (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{successMsg}</Text>
            </View>
          )}

          {isSignUp && (
            <>
              <View style={styles.row}>
                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <Text style={styles.label}>First Name</Text>
                  <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="First name" placeholderTextColor="#555" />
                </View>
                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <Text style={styles.label}>Last Name</Text>
                  <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Last name" placeholderTextColor="#555" />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Enter your phone number" placeholderTextColor="#555" keyboardType="phone-pad" />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Date of Birth</Text>
                <TextInput style={styles.input} value={dateOfBirth} onChangeText={setDateOfBirth} placeholder="DD/MM/YYYY" placeholderTextColor="#555" />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Gender (Optional)</Text>
                <View style={styles.genderContainer}>
                  {(['male', 'female', 'other', 'prefer_not_to_say'] as const).map((g) => (
                    <TouchableOpacity key={g} style={[styles.genderButton, gender === g && styles.genderButtonActive]} onPress={() => setGender(g)}>
                      <Text style={[styles.genderButtonText, gender === g && styles.genderButtonTextActive]}>
                        {g === 'prefer_not_to_say' ? 'Skip' : g.charAt(0).toUpperCase() + g.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Referral Code (Optional)</Text>
                <TextInput style={styles.input} value={referralCode} onChangeText={(t) => setReferralCode(t.toUpperCase())} placeholder="Enter referral code" placeholderTextColor="#555" autoCapitalize="characters" />
                <Text style={styles.helperText}>Have a referral code? Both you and your friend get a free session!</Text>
              </View>
            </>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Enter your email" placeholderTextColor="#555" keyboardType="email-address" autoCapitalize="none" />
          </View>

          {!isForgotPassword && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={isSignUp ? 'Min 6 characters' : 'Enter your password'}
                  placeholderTextColor="#555"
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                    {showPassword ? (
                      <>
                        <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" stroke={TEXT_MUTED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                        <Circle cx={12} cy={12} r={3} stroke={TEXT_MUTED} strokeWidth={2} />
                      </>
                    ) : (
                      <>
                        <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke={TEXT_MUTED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                        <Path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke={TEXT_MUTED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                        <Path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" stroke={TEXT_MUTED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                        <Line x1={1} y1={1} x2={23} y2={23} stroke={TEXT_MUTED} strokeWidth={2} strokeLinecap="round" />
                      </>
                    )}
                  </Svg>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {isForgotPassword ? (
            <>
              <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleForgotPassword} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={BG_DARK} />
                ) : (
                  <Text style={styles.buttonText}>SEND RESET LINK</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setIsForgotPassword(false); setErrorMsg(null); setSuccessMsg(null); }} style={styles.switchButton}>
                <Text style={styles.switchButtonText}>Back to Sign In</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleAuth} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={BG_DARK} />
                ) : (
                  <Text style={styles.buttonText}>{isSignUp ? 'SIGN UP' : 'SIGN IN'}</Text>
                )}
              </TouchableOpacity>

              {!isSignUp && (
                <TouchableOpacity onPress={() => { setIsForgotPassword(true); setErrorMsg(null); setSuccessMsg(null); }} style={styles.forgotButton}>
                  <Text style={styles.forgotButtonText}>Forgot your password?</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={() => { setIsSignUp(!isSignUp); setErrorMsg(null); setSuccessMsg(null); }} style={styles.switchButton}>
                <Text style={styles.switchButtonText}>
                  {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </Text>
              </TouchableOpacity>
            </>
          )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: BG_CARD,
    borderRadius: 16,
    padding: 24,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  heroBanner: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorBox: {
    backgroundColor: '#3b1111',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#5b2020',
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
    textAlign: 'center',
  },
  successBox: {
    backgroundColor: '#0f2d1a',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1a4a2a',
  },
  successText: {
    color: '#4ade80',
    fontSize: 13,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_MUTED,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: BG_INPUT,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: TEXT_WHITE,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeIcon: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  button: {
    backgroundColor: GOLD,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: BG_DARK,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  forgotButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  forgotButtonText: {
    color: TEXT_MUTED,
    fontSize: 14,
    fontWeight: '400',
    textDecorationLine: 'underline',
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchButtonText: {
    color: GOLD,
    fontSize: 14,
    fontWeight: '500',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  genderButton: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: BG_INPUT,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: '#2a2210',
    borderColor: GOLD,
  },
  genderButtonText: {
    fontSize: 13,
    color: TEXT_MUTED,
    fontWeight: '500',
  },
  genderButtonTextActive: {
    color: GOLD,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 6,
    fontStyle: 'italic',
  },
});

export default LoginScreen;
