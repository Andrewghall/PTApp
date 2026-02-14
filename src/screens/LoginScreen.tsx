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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { auth } from '../lib/supabase';

// Import the logo banner image
const logoBanner = require('../../logo banner.png');

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      setErrorMsg('Please enter email and password');
      return;
    }
    if (isSignUp && (!firstName || !lastName)) {
      setErrorMsg('Please enter your name');
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    if (isSignUp) {
      const { error } = await auth.signUp(email, password, firstName, lastName);
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
    } else {
      const { error } = await auth.signIn(email, password);
      setLoading(false);
      if (error) {
        if (error.message?.toLowerCase().includes('email not confirmed')) {
          setErrorMsg(
            'Email not confirmed yet. Check your inbox for the confirmation link, or ask your admin to confirm your account.'
          );
        } else {
          setErrorMsg(error.message);
        }
        return;
      }
      // Success - auth state change will be handled by App.tsx
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>Elevate Gym</Text>
          </View>
          <Image source={logoBanner} style={styles.heroBanner as any} resizeMode="cover" />
          <Text style={styles.subtitle}>
            {isSignUp ? 'Create your account' : 'Welcome back'}
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
              <View style={styles.inputContainer}>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                />
              </View>
            </>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                placeholder={isSignUp ? 'Choose a password (min 6 chars)' : 'Enter your password'}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                  {showPassword ? (
                    <>
                      <Path
                        d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"
                        stroke="#9ca3af"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <Circle cx={12} cy={12} r={3} stroke="#9ca3af" strokeWidth={2} />
                    </>
                  ) : (
                    <>
                      <Path
                        d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"
                        stroke="#9ca3af"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <Path
                        d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"
                        stroke="#9ca3af"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <Path
                        d="M14.12 14.12a3 3 0 1 1-4.24-4.24"
                        stroke="#9ca3af"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <Line x1={1} y1={1} x2={23} y2={23} stroke="#9ca3af" strokeWidth={2} strokeLinecap="round" />
                    </>
                  )}
                </Svg>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleAuth}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading
                ? isSignUp
                  ? 'Creating account...'
                  : 'Signing in...'
                : isSignUp
                ? 'Sign Up'
                : 'Sign In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            style={styles.switchButton}
          >
            <Text style={styles.switchButtonText}>
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  heroBanner: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    textAlign: 'center',
  },
  successBox: {
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  successText: {
    color: '#16a34a',
    fontSize: 13,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  switchButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default LoginScreen;
