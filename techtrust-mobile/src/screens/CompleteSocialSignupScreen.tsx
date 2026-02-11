/**
 * CompleteSocialSignupScreen - Complete social login registration
 * After social login (Google/Apple/Facebook), user must set a password + phone
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';

export default function CompleteSocialSignupScreen({ navigation, route }: any) {
  const { completeSocialSignup } = useAuth();
  const { t } = useI18n();
  
  const { userId, email, fullName, phone: existingPhone, provider } = route.params || {};

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState(existingPhone || '');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    // Validate
    if (!password || password.length < 8) {
      Alert.alert(
        t.common?.error || 'Error',
        t.auth?.passwordMinLength || 'Password must be at least 8 characters'
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        t.common?.error || 'Error',
        t.auth?.passwordMismatch || 'Passwords do not match'
      );
      return;
    }

    // Check password has at least 1 letter and 1 number
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      Alert.alert(
        t.common?.error || 'Error',
        t.auth?.passwordRequirements || 'Password must contain at least 1 letter and 1 number'
      );
      return;
    }

    setLoading(true);
    try {
      const result = await completeSocialSignup(
        userId,
        password,
        phone && phone.startsWith('+') ? phone : undefined
      );

      if (result.status === 'NEEDS_PHONE_VERIFICATION') {
        // Navigate to OTP screen for phone verification
        navigation.replace('OTP', {
          userId: result.userId || userId,
          phone: result.phone || phone,
          fromSocialSignup: true,
        });
      }
      // If AUTHENTICATED, AuthContext sets the user and navigation handles redirect
    } catch (error: any) {
      Alert.alert(
        t.common?.error || 'Error',
        error.message || 'Failed to complete registration'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark-outline" size={48} color="#1976d2" />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {t.auth?.completeSetup || 'Complete Your Account'}
          </Text>
          <Text style={styles.description}>
            {t.auth?.completeSetupDesc || `Signed in with ${provider || 'social account'}. Set a password to secure your account.`}
          </Text>

          {/* User info */}
          {(fullName || email) && (
            <View style={styles.userInfo}>
              <Ionicons name="person-circle-outline" size={32} color="#6b7280" />
              <View style={styles.userInfoText}>
                {fullName && <Text style={styles.userName}>{fullName}</Text>}
                {email && <Text style={styles.userEmail}>{email}</Text>}
              </View>
            </View>
          )}

          {/* Phone Input */}
          {!existingPhone && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t.auth?.phone || 'Phone'}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="+1 (555) 123-4567"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>
              <Text style={styles.hint}>
                {t.auth?.phoneHint || 'Format: +1XXXXXXXXXX'}
              </Text>
            </View>
          )}

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.auth?.password || 'Password'}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>
              {t.auth?.passwordHint || 'Min. 8 characters, 1 letter, 1 number'}
            </Text>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.auth?.confirmPassword || 'Confirm Password'}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!loading}
              />
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleComplete}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {t.auth?.createAccount || 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  userInfoText: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#111827',
  },
  eyeButton: {
    padding: 8,
  },
  hint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#1976d2',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: '#1976d2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
