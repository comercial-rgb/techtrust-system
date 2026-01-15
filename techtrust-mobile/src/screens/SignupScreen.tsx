/**
 * Tela de Cadastro
 * ✨ Atualizada com animações e UI melhorada
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { TextInput, Text, useTheme } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';

// ✨ Importando componentes de UI
import {
  FadeInView,
  SlideInView,
  ScalePress,
  ShakeView,
  Toast,
  useToast,
  LoadingOverlay,
  EnhancedButton,
  AnimatedProgressBar,
} from '../components';

export default function SignupScreen({ navigation }: any) {
  const theme = useTheme();
  const { t } = useI18n();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hasError, setHasError] = useState(false);

  // ✨ Toast hook
  const { toast, error, hideToast } = useToast();

  // ✨ Calcular progresso do formulário
  const calculateProgress = () => {
    let filled = 0;
    if (fullName.length > 0) filled++;
    if (email.length > 0) filled++;
    if (phone.length > 0) filled++;
    if (password.length >= 8) filled++;
    if (confirmPassword.length > 0 && confirmPassword === password) filled++;
    return filled / 5;
  };

  // ✨ Validar força da senha
  const getPasswordStrength = () => {
    if (password.length === 0) return { level: 0, text: '', color: '#e5e7eb' };
    if (password.length < 6) return { level: 1, text: t.auth?.passwordWeak || 'Weak', color: '#ef4444' };
    if (password.length < 8) return { level: 2, text: t.auth?.passwordMedium || 'Medium', color: '#f59e0b' };
    if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
      return { level: 4, text: t.auth?.passwordStrong || 'Strong', color: '#22c55e' };
    }
    return { level: 3, text: t.auth?.passwordGood || 'Good', color: '#3b82f6' };
  };

  async function handleSignup() {
    if (!fullName || !email || !phone || !password || !confirmPassword) {
      setHasError(true);
      error(t.auth?.fillAllFields || 'Please fill all fields');
      setTimeout(() => setHasError(false), 500);
      return;
    }

    if (password !== confirmPassword) {
      setHasError(true);
      error(t.auth?.passwordsDoNotMatch || 'Passwords do not match');
      setTimeout(() => setHasError(false), 500);
      return;
    }

    if (password.length < 8) {
      setHasError(true);
      error(t.auth?.passwordMinLength || 'Password must be at least 8 characters');
      setTimeout(() => setHasError(false), 500);
      return;
    }

    setLoading(true);
    try {
      const cleanedPhone = phone
        .trim()
        .replace(/[^\d+]/g, '')
        .replace(/\+(?=\+)/g, '');

      const normalizedPhone = cleanedPhone.startsWith('+')
        ? `+${cleanedPhone.replace(/\D/g, '')}`
        : `+${cleanedPhone.replace(/\D/g, '')}`;

      if (!/^\+\d{10,15}$/.test(normalizedPhone)) {
        throw new Error('Telefone inválido. Use formato E.164 (ex: +5511999999999)');
      }

      const { userId } = await signUp({
        fullName,
        email,
        phone: normalizedPhone,
        password,
        language: 'PT',
      });

      navigation.navigate('OTP', { userId, phone: normalizedPhone });
    } catch (err: any) {
      error(err.message || t.auth?.errorCreatingAccount || 'Error creating account');
    } finally {
      setLoading(false);
    }
  }

  const passwordStrength = getPasswordStrength();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ✨ Header animado */}
        <FadeInView delay={0}>
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.headerIcon}>👤</Text>
            </View>
            <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.primary }]}>
              {t.auth?.createAccount || 'Create Account'}
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              {t.auth?.signupSubtitle || 'Sign up to get started'}
            </Text>
          </View>
        </FadeInView>

        {/* ✨ Progress bar */}
        <FadeInView delay={50}>
          <View style={styles.progressContainer}>
            <AnimatedProgressBar
              progress={calculateProgress()}
              color={theme.colors.primary}
              height={6}
            />
            <Text style={styles.progressText}>
              {Math.round(calculateProgress() * 100)}% {t.common?.complete || 'complete'}
            </Text>
          </View>
        </FadeInView>

        {/* ✨ Formulário com animações */}
        <ShakeView shake={hasError}>
          <View style={styles.form}>
            <SlideInView direction="left" delay={100}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>👤 {t.auth?.fullName || 'Full Name'}</Text>
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  mode="outlined"
                  placeholder={t.auth?.fullNamePlaceholder || 'Your full name'}
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  textColor="#000"
                  error={hasError && !fullName}
                />
              </View>
            </SlideInView>

            <SlideInView direction="right" delay={150}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>✉️ {t.auth?.email || 'Email'}</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  mode="outlined"
                  placeholder="seu@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  textColor="#000"
                  error={hasError && !email}
                />
              </View>
            </SlideInView>

            <SlideInView direction="left" delay={200}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>📱 {t.auth?.phone || 'Phone'}</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  mode="outlined"
                  placeholder="+55 11 99999-9999"
                  keyboardType="phone-pad"
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  textColor="#000"
                  error={hasError && !phone}
                />
              </View>
            </SlideInView>

            <SlideInView direction="right" delay={250}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>🔒 {t.auth?.password || 'Password'}</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  mode="outlined"
                  placeholder={t.auth?.passwordPlaceholder || 'Minimum 8 characters'}
                  secureTextEntry={!showPassword}
                  textColor="#000"
                  right={
                    <TextInput.Icon
                      icon={showPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  error={hasError && password.length < 8}
                />
                {/* ✨ Indicador de força da senha */}
                {password.length > 0 && (
                  <View style={styles.passwordStrength}>
                    <View style={styles.strengthBars}>
                      {[1, 2, 3, 4].map((level) => (
                        <View
                          key={level}
                          style={[
                            styles.strengthBar,
                            {
                              backgroundColor:
                                level <= passwordStrength.level
                                  ? passwordStrength.color
                                  : '#e5e7eb',
                            },
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                      {passwordStrength.text}
                    </Text>
                  </View>
                )}
              </View>
            </SlideInView>

            <SlideInView direction="left" delay={300}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>🔒 {t.auth?.confirmPassword || 'Confirm Password'}</Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  mode="outlined"
                  placeholder={t.auth?.confirmPasswordPlaceholder || 'Enter password again'}
                  secureTextEntry={!showPassword}
                  textColor="#000"
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  error={hasError && confirmPassword !== password}
                />
                {confirmPassword.length > 0 && (
                  <View style={styles.matchIndicator}>
                    {confirmPassword === password ? (
                      <Text style={styles.matchSuccess}>✓ {t.auth?.passwordsMatch || 'Passwords match'}</Text>
                    ) : (
                      <Text style={styles.matchError}>✗ {t.auth?.passwordsDoNotMatch || 'Passwords do not match'}</Text>
                    )}
                  </View>
                )}
              </View>
            </SlideInView>

            {/* Botões */}
            <FadeInView delay={350}>
              <View style={styles.buttonsContainer}>
                <EnhancedButton
                  title={t.auth?.createAccount || 'Create Account'}
                  onPress={handleSignup}
                  variant="primary"
                  size="large"
                  icon="account-plus"
                  fullWidth
                  loading={loading}
                />
              </View>
            </FadeInView>
          </View>
        </ShakeView>

        {/* ✨ Link para login */}
        <FadeInView delay={400}>
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>{t.auth?.alreadyHaveAccount || 'Already have an account?'} </Text>
            <ScalePress onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.loginLink, { color: theme.colors.primary }]}>
                {t.auth?.login || 'Login'}
              </Text>
            </ScalePress>
          </View>
        </FadeInView>

        {/* ✨ Footer */}
        <FadeInView delay={450}>
          <Text style={styles.footer}>
            {t.auth?.signupTerms || 'By signing up, you agree to our'}{'\n'}
            <Text style={{ color: theme.colors.primary }}>{t.common?.termsOfUse || 'Terms of Use'}</Text>
            {' '}{t.common?.and || 'and'}{' '}
            <Text style={{ color: theme.colors.primary }}>{t.common?.privacyPolicy || 'Privacy Policy'}</Text>
          </Text>
        </FadeInView>
      </ScrollView>

      {/* ✨ Loading Overlay */}
      <LoadingOverlay visible={loading} message={t.auth?.creatingAccount || 'Creating your account...'} />

      {/* ✨ Toast */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={hideToast}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 4,
  },
  headerIcon: {
    fontSize: 32,
  },
  title: {
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    opacity: 0.6,
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    marginTop: 4,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
  },
  inputOutline: {
    borderRadius: 12,
  },
  passwordStrength: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  strengthBars: {
    flexDirection: 'row',
    flex: 1,
    gap: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
    minWidth: 50,
  },
  matchIndicator: {
    marginTop: 4,
  },
  matchSuccess: {
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '500',
  },
  matchError: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '500',
  },
  buttonsContainer: {
    marginTop: 16,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  loginText: {
    color: '#666',
  },
  loginLink: {
    fontWeight: '700',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9e9e9e',
    marginTop: 24,
    lineHeight: 18,
  },
});
