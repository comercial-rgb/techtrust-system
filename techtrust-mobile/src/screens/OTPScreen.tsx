/**
 * Tela de Verificação OTP
 * ✨ Atualizada com animações e UI melhorada
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TextInput as RNTextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, useTheme } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';

// ✨ Importando componentes de UI
import {
  FadeInView,
  SlideInView,
  ScalePress,
  ShakeView,
  PulseView,
  Toast,
  useToast,
  LoadingOverlay,
  EnhancedButton,
} from '../components';

export default function OTPScreen({ route, navigation }: any) {
  const theme = useTheme();
  const { t } = useI18n();
  const { verifyOTP, resendOTP } = useAuth();

  const routeUserId = route?.params?.userId as string | undefined;
  const routePhone = route?.params?.phone as string | undefined;

  const [userId, setUserId] = useState<string | null>(routeUserId ?? null);
  const [phone, setPhone] = useState<string | null>(routePhone ?? null);

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<(RNTextInput | null)[]>([]);

  // ✨ Toast hook
  const { toast, success, error, hideToast } = useToast();

  // ✨ Countdown timer para reenvio
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  // Recupera pending user caso o app seja fechado/retomado durante o fluxo
  useEffect(() => {
    if (userId) return;

    (async () => {
      try {
        const pendingRaw = await AsyncStorage.getItem('@TechTrust:pendingUser');
        if (!pendingRaw) return;

        const pending = JSON.parse(pendingRaw);
        if (pending?.userId) setUserId(pending.userId);
        if (pending?.phone) setPhone(pending.phone);
      } catch {
        // ignore
      }
    })();
  }, [userId]);

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      // Handle paste
      const pastedCode = value.slice(0, 6).split('');
      const newOtp = [...otp];
      pastedCode.forEach((digit, i) => {
        if (i < 6) newOtp[i] = digit;
      });
      setOtp(newOtp);
      if (pastedCode.length === 6) {
        inputRefs.current[5]?.focus();
      }
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus próximo input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  async function handleVerify() {
    // Trim para remover espaços e garantir validação correta
    const otpCode = otp.join('').trim();

    if (!userId) {
      setHasError(true);
      error(t.auth?.errorCreatingAccount || 'Missing signup data. Please sign up again.');
      setTimeout(() => setHasError(false), 500);
      return;
    }
    
    if (otpCode.length !== 6) {
      setHasError(true);
      error(t.auth?.enterOtpCode || 'Enter the 6-digit code');
      setTimeout(() => setHasError(false), 500);
      return;
    }

    setLoading(true);
    try {
      await verifyOTP(userId, otpCode);
      success(t.auth?.verificationComplete || 'Verification complete!');
    } catch (err: any) {
      setHasError(true);
      error(err.message || t.auth?.invalidCode || 'Invalid code');
      setTimeout(() => setHasError(false), 500);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  const handleResend = () => {
    if (!canResend) return;

    if (!userId) {
      error(t.auth?.errorCreatingAccount || 'Missing signup data. Please sign up again.');
      return;
    }

    setLoading(true);
    resendOTP(userId)
      .then(() => {
        success(t.auth?.codeSent || 'Code sent!');
        setResendTimer(60);
        setCanResend(false);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      })
      .catch((err: any) => {
        error(err.message || 'Erro ao reenviar código');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const isComplete = otp.every(digit => digit !== '');

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* ✨ Header animado */}
        <FadeInView delay={0}>
          <View style={styles.header}>
            <PulseView>
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.headerIcon}>🔐</Text>
              </View>
            </PulseView>
            <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.primary }]}>
              {t.auth?.verification || 'Verification'}
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              {t.auth?.enterCodeSentTo || 'Enter the code sent to'}
            </Text>
            <Text variant="bodyLarge" style={[styles.phone, { color: theme.colors.primary }]}>
              {phone}
            </Text>
          </View>
        </FadeInView>

        {/* ✨ OTP Input */}
        <SlideInView direction="up" delay={100}>
          <ShakeView shake={hasError}>
            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <RNTextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  style={[
                    styles.otpInput,
                    digit && styles.otpInputFilled,
                    hasError && styles.otpInputError,
                    { borderColor: digit ? theme.colors.primary : '#e5e7eb' },
                  ]}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value.replace(/[^0-9]/g, ''), index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={index === 0 ? 6 : 1}
                  selectTextOnFocus
                />
              ))}
            </View>
          </ShakeView>
        </SlideInView>

        {/* Hint removido para produção */}

        {/* ✨ Botão de verificar */}
        <FadeInView delay={200}>
          <View style={styles.buttonsContainer}>
            <EnhancedButton
              title={t.auth?.verify || 'Verify'}
              onPress={handleVerify}
              variant="primary"
              size="large"
              icon="shield-check"
              fullWidth
              loading={loading}
              disabled={!isComplete}
            />
          </View>
        </FadeInView>

        {/* ✨ Reenviar código */}
        <FadeInView delay={250}>
          <View style={styles.resendContainer}>
            {canResend ? (
              <ScalePress onPress={handleResend}>
                <Text style={[styles.resendText, { color: theme.colors.primary }]}>
                  {t.auth?.resendCode || 'Resend code'}
                </Text>
              </ScalePress>
            ) : (
              <Text style={styles.timerText}>
                {t.auth?.resendIn || 'Resend in'} <Text style={styles.timerNumber}>{resendTimer}s</Text>
              </Text>
            )}
          </View>
        </FadeInView>

        {/* ✨ Voltar */}
        <FadeInView delay={300}>
          <ScalePress onPress={() => navigation.goBack()}>
            <View style={styles.backButton}>
              <Text style={styles.backIcon}>←</Text>
              <Text style={styles.backText}>{t.common?.back || 'Back'}</Text>
            </View>
          </ScalePress>
        </FadeInView>
      </View>

      {/* ✨ Loading Overlay */}
      <LoadingOverlay visible={loading} message={t.auth?.verifying || 'Verifying...'} />

      {/* ✨ Toast */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={hideToast}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    elevation: 4,
  },
  headerIcon: {
    fontSize: 36,
  },
  title: {
    fontWeight: '700',
    marginBottom: 12,
  },
  subtitle: {
    opacity: 0.6,
    marginBottom: 4,
  },
  phone: {
    fontWeight: '700',
    fontSize: 18,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  otpInput: {
    width: 50,
    height: 60,
    borderWidth: 2,
    borderRadius: 14,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    backgroundColor: '#f9fafb',
    color: '#1f2937',
  },
  otpInputFilled: {
    backgroundColor: '#e3f2fd',
  },
  otpInputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  hintIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  hintText: {
    fontSize: 13,
    color: '#92400e',
    fontWeight: '500',
  },
  buttonsContainer: {
    marginBottom: 20,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  resendText: {
    fontSize: 15,
    fontWeight: '600',
  },
  timerText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  timerNumber: {
    fontWeight: '700',
    color: '#374151',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  backIcon: {
    fontSize: 18,
    marginRight: 8,
    color: '#6b7280',
  },
  backText: {
    fontSize: 15,
    color: '#6b7280',
    fontWeight: '500',
  },
});
