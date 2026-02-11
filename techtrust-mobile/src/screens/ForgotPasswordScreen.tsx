/**
 * ForgotPasswordScreen - Recuperação de Senha
 * 3 steps: Enter email → Enter code → Set new password
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../i18n';
import api from '../services/api';

export default function ForgotPasswordScreen({ navigation }: any) {
  const { t } = useI18n();
  const [step, setStep] = useState<'email' | 'code' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Step 1: Send reset code
  const handleSendCode = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert(t.common?.error || 'Error', t.auth?.invalidEmail || 'Please enter a valid email');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setStep('code');
      Alert.alert(
        t.common?.success || 'Success',
        t.auth?.resetCodeSent || 'A 6-digit code has been sent to your email.'
      );
    } catch (error: any) {
      // Always show success to prevent email enumeration
      setStep('code');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify code → go to password
  const handleVerifyCode = () => {
    if (code.trim().length !== 6) {
      Alert.alert(t.common?.error || 'Error', t.auth?.invalidCode || 'Please enter the 6-digit code');
      return;
    }
    setStep('password');
  };

  // Step 3: Reset password
  const handleResetPassword = async () => {
    if (newPassword.length < 8) {
      Alert.alert(t.common?.error || 'Error', t.auth?.passwordMinLength || 'Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t.common?.error || 'Error', t.auth?.passwordMismatch || 'Passwords do not match');
      return;
    }
    if (!/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      Alert.alert(t.common?.error || 'Error', t.auth?.passwordRequirements || 'Password must contain at least 1 letter and 1 number');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        token: code.trim(),
        newPassword,
      });
      
      Alert.alert(
        t.common?.success || 'Success',
        t.auth?.passwordResetSuccess || 'Password reset successfully! Please log in with your new password.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error: any) {
      Alert.alert(
        t.common?.error || 'Error',
        error.response?.data?.message || t.auth?.resetFailed || 'Failed to reset password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {['email', 'code', 'password'].map((s, i) => (
        <View key={s} style={styles.stepRow}>
          <View style={[
            styles.stepDot,
            step === s && styles.stepDotActive,
            (['email', 'code', 'password'].indexOf(step) > i) && styles.stepDotDone,
          ]}>
            {(['email', 'code', 'password'].indexOf(step) > i) ? (
              <Ionicons name="checkmark" size={12} color="#fff" />
            ) : (
              <Text style={[styles.stepNumber, step === s && styles.stepNumberActive]}>
                {i + 1}
              </Text>
            )}
          </View>
          {i < 2 && <View style={[
            styles.stepLine,
            (['email', 'code', 'password'].indexOf(step) > i) && styles.stepLineDone,
          ]} />}
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => {
              if (step === 'code') setStep('email');
              else if (step === 'password') setStep('code');
              else navigation.goBack();
            }} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons 
                name={step === 'email' ? 'mail-outline' : step === 'code' ? 'keypad-outline' : 'lock-closed-outline'} 
                size={48} 
                color="#1976d2" 
              />
            </View>
          </View>

          {/* Step Indicator */}
          {renderStepIndicator()}

          {/* STEP 1: Email */}
          {step === 'email' && (
            <>
              <Text style={styles.title}>{t.auth?.forgotPassword || 'Forgot your password?'}</Text>
              <Text style={styles.description}>
                {t.auth?.forgotPasswordDesc || 'Enter your registered email and we will send a 6-digit code to reset your password.'}
              </Text>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t.auth?.email || 'Email'}</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="email@example.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSendCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>
                    {t.auth?.sendCode || 'Send Code'}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* STEP 2: Code */}
          {step === 'code' && (
            <>
              <Text style={styles.title}>{t.auth?.enterCode || 'Enter Code'}</Text>
              <Text style={styles.description}>
                {t.auth?.enterCodeDesc || `Enter the 6-digit code sent to ${email}`}
              </Text>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t.auth?.verificationCode || 'Verification Code'}</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="keypad-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, styles.codeInput]}
                    placeholder="000000"
                    value={code}
                    onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!loading}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.button, code.length !== 6 && styles.buttonDisabled]}
                onPress={handleVerifyCode}
                disabled={code.length !== 6}
              >
                <Text style={styles.buttonText}>
                  {t.auth?.verify || 'Verify'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.resendButton} onPress={handleSendCode}>
                <Text style={styles.resendText}>
                  {t.auth?.resendCode || 'Resend Code'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* STEP 3: New Password */}
          {step === 'password' && (
            <>
              <Text style={styles.title}>{t.auth?.newPassword || 'New Password'}</Text>
              <Text style={styles.description}>
                {t.auth?.newPasswordDesc || 'Create a strong new password for your account.'}
              </Text>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t.auth?.password || 'Password'}</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    editable={!loading}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6b7280" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.hint}>
                  {t.auth?.passwordHint || 'Min. 8 characters, 1 letter, 1 number'}
                </Text>
              </View>

              <View style={styles.inputContainer}>
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

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleResetPassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>
                    {t.auth?.resetPassword || 'Reset Password'}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Back to Login */}
          <TouchableOpacity style={styles.backToLogin} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={16} color="#1976d2" />
            <Text style={styles.backToLoginText}>
              {t.auth?.backToLogin || 'Back to Login'}
            </Text>
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
    flexGrow: 1,
    padding: 24,
  },
  header: {
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#e3f2fd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: '#1976d2',
  },
  stepDotDone: {
    backgroundColor: '#10b981',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  stepNumberActive: {
    color: '#fff',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 4,
  },
  stepLineDone: {
    backgroundColor: '#10b981',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: 20,
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
    paddingHorizontal: 4,
  },
  inputIcon: {
    marginLeft: 12,
  },
  input: {
    flex: 1,
    height: 56,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#111827',
  },
  codeInput: {
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
    fontWeight: '700',
  },
  eyeButton: {
    padding: 12,
  },
  hint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#1976d2',
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  resendText: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '600',
  },
  backToLogin: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  backToLoginText: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '600',
  },
});
