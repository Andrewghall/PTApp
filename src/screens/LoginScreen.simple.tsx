import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface LoginScreenProps {
  email?: string;
  setEmail?: (email: string) => void;
  password?: string;
  setPassword?: (password: string) => void;
  isLoading?: boolean;
  onLogin?: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ 
  email: propEmail, 
  setEmail: propSetEmail, 
  password: propPassword, 
  setPassword: propSetPassword,
  isLoading: propIsLoading,
  onLogin: propOnLogin
}) => {
  const [email, setEmail] = useState(propEmail || '');
  const [password, setPassword] = useState(propPassword || '');
  const [isLoading, setIsLoading] = useState(propIsLoading || false);
  const [isSigningUp, setIsSigningUp] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    if (propOnLogin) {
      propOnLogin();
      return;
    }

    setIsLoading(true);
    
    try {
      // Simulate authentication
      setTimeout(() => {
        Alert.alert('Success', isSigningUp ? 'Account created!' : 'Login successful!');
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      Alert.alert('Error', 'Authentication failed. Please try again.');
      setIsLoading(false);
    }
  };

  const currentEmail = propEmail !== undefined ? propEmail : email;
  const currentPassword = propPassword !== undefined ? propPassword : password;
  const currentIsLoading = propIsLoading !== undefined ? propIsLoading : isLoading;
  const currentSetEmail = propSetEmail || setEmail;
  const currentSetPassword = propSetPassword || setPassword;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>PT Business</Text>
            <Text style={styles.subtitle}>Your Personal Training Business</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                value={currentEmail}
                onChangeText={currentSetEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                value={currentPassword}
                onChangeText={currentSetPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity 
              style={[styles.button, styles.primaryButton]}
              onPress={handleAuth}
              disabled={currentIsLoading}
            >
              {currentIsLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>
                  {isSigningUp ? 'Create Account' : 'Sign In'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => setIsSigningUp(!isSigningUp)}
            >
              <Text style={styles.secondaryButtonText}>
                {isSigningUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default LoginScreen;
