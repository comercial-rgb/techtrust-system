/**
 * Tela de Verificação OTP
 * ✨ Atualizada com animações e UI melhorada
 */

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput as RNTextInput,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text, useTheme } from "react-native-paper";
import * as WebBrowser from "expo-web-browser";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../i18n";
import * as paymentService from "../services/payment.service";

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
} from "../components";

export default function OTPScreen({ route, navigation }: any) {
  const theme = useTheme();
  const { t } = useI18n();
  const authText = t.auth as any;
  const { verifyOTP, resendOTP } = useAuth();

  const routeUserId = route?.params?.userId as string | undefined;
  const routePhone = route?.params?.phone as string | undefined;
  const routeOtpMethod = route?.params?.otpMethod as
    | "sms"
    | "email"
    | undefined;
  const routeEmail = route?.params?.email as string | undefined;
  const routeSelectedPlan = route?.params?.selectedPlan as string | undefined;

  const [userId, setUserId] = useState<string | null>(routeUserId ?? null);
  const [phone, setPhone] = useState<string | null>(routePhone ?? null);
  const [otpMethod, setOtpMethod] = useState<"sms" | "email">(
    routeOtpMethod || "sms",
  );
  const [email, setEmail] = useState<string | null>(routeEmail ?? null);
  const [selectedPlan, setSelectedPlan] = useState<string>(
    (routeSelectedPlan || "free").toLowerCase(),
  );

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
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
        const pendingRaw = await AsyncStorage.getItem("@TechTrust:pendingUser");
        if (!pendingRaw) return;

        const pending = JSON.parse(pendingRaw);
        if (pending?.userId) setUserId(pending.userId);
        if (pending?.phone) setPhone(pending.phone);
        if (pending?.otpMethod) setOtpMethod(pending.otpMethod);
        if (pending?.email) setEmail(pending.email);
        if (pending?.selectedPlan) {
          setSelectedPlan(String(pending.selectedPlan).toLowerCase());
        }
      } catch {
        // ignore
      }
    })();
  }, [userId]);

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      // Handle paste
      const pastedCode = value.slice(0, 6).split("");
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
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  async function handleVerify() {
    // Limpa e valida o código
    const otpCode = otp.join("").replace(/\s/g, ""); // Remove todos os espaços

    if (!userId) {
      setHasError(true);
      error(
        authText?.errorCreatingAccount ||
          "Missing signup data. Please sign up again.",
      );
      setTimeout(() => setHasError(false), 500);
      return;
    }

    if (!otpCode || otpCode.length !== 6) {
      setHasError(true);
      error(authText?.enterOtpCode || "Digite o código de 6 dígitos");
      setTimeout(() => setHasError(false), 500);
      return;
    }

    // Valida se são apenas números
    if (!/^\d{6}$/.test(otpCode)) {
      setHasError(true);
      error("Código deve conter apenas números");
      setTimeout(() => setHasError(false), 500);
      return;
    }

    setLoading(true);
    try {
      await verifyOTP(userId, otpCode, otpMethod);

      if (selectedPlan && selectedPlan !== "free") {
        const checkout = await paymentService.createSubscriptionCheckoutSession(
          selectedPlan,
          "monthly",
        );

        if (!checkout.checkoutUrl) {
          throw new Error("Checkout URL was not returned.");
        }

        success("Account verified. Complete checkout to start your trial.");
        await WebBrowser.openBrowserAsync(checkout.checkoutUrl);
        return;
      }

      success(authText?.verificationComplete || "Verification complete!");
    } catch (err: any) {
      setHasError(true);
      const isExpired = err?.code === "OTP_EXPIRED";
      error(err.message || authText?.invalidCode || "Invalid code");
      setTimeout(() => setHasError(false), 500);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      if (isExpired) {
        setResendTimer(0);
        setCanResend(true);
      }
    } finally {
      setLoading(false);
    }
  }

  const handleResend = () => {
    if (!canResend) return;

    if (!userId) {
      error(
        authText?.errorCreatingAccount ||
          "Missing signup data. Please sign up again.",
      );
      return;
    }

    setLoading(true);
    resendOTP(userId, otpMethod)
      .then((result) => {
        if (result?.method === "email" || result?.method === "sms") {
          setOtpMethod(result.method);
        }
        success(authText?.codeSent || "Code sent!");
        setResendTimer(60);
        setCanResend(false);
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      })
      .catch((err: any) => {
        error(err.message || "Erro ao reenviar código");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const isComplete = otp.every((digit) => digit !== "");

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ✨ Header animado */}
        <FadeInView delay={0}>
          <View style={styles.header}>
            <PulseView>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                <Text style={styles.headerIcon}>🔐</Text>
              </View>
            </PulseView>
            <Text
              variant="headlineMedium"
              style={[styles.title, { color: theme.colors.primary }]}
            >
              {authText?.verification || "Verification"}
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              {otpMethod === "email"
                ? authText?.enterCodeSentToEmail ||
                  "Enter the code sent to your email"
                : authText?.enterCodeSentTo || "Enter the code sent to"}
            </Text>
            <Text
              variant="bodyLarge"
              style={[styles.phone, { color: theme.colors.primary }]}
            >
              {otpMethod === "email" ? email : phone}
            </Text>
            {otpMethod === "email" && (
              <Text
                variant="bodySmall"
                style={{ color: "#f59e0b", marginTop: 4, textAlign: "center" }}
              >
                {authText?.smsFallbackNotice ||
                  "SMS was unavailable. Code sent via email instead."}
              </Text>
            )}

            {/* Switch OTP method */}
            <TouchableOpacity
              onPress={() => {
                const newMethod = otpMethod === "sms" ? "email" : "sms";
                if (userId) {
                  setLoading(true);
                  resendOTP(userId, newMethod)
                    .then((result) => {
                      const deliveredMethod = result?.method || newMethod;
                      setOtpMethod(deliveredMethod);
                      setOtp(["", "", "", "", "", ""]);
                      setCanResend(false);
                      setResendTimer(60);
                      success(
                        deliveredMethod === "email"
                          ? (authText?.codeSentToEmail || "Code sent to your email!")
                          : (authText?.codeSentToPhone || "Code sent to your phone!")
                      );
                    })
                    .catch((err: any) => {
                      error(err.message || "Could not send verification code.");
                    })
                    .finally(() => setLoading(false));
                }
              }}
              style={{
                marginTop: 12,
                alignSelf: "center",
                backgroundColor: "#f0f9ff",
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: theme.colors.primary,
                }}
              >
                {otpMethod === "sms"
                  ? (authText?.switchToEmail || "📧 Switch to Email verification")
                  : (authText?.switchToSms || "📱 Switch to SMS verification")
                }
              </Text>
            </TouchableOpacity>
          </View>
        </FadeInView>

        {/* ✨ OTP Input */}
        <SlideInView direction="up" delay={100}>
          <ShakeView shake={hasError}>
            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <RNTextInput
                  key={index}
                  ref={(ref) => {
                    inputRefs.current[index] = ref;
                  }}
                  style={[
                    styles.otpInput,
                    digit && styles.otpInputFilled,
                    hasError && styles.otpInputError,
                    { borderColor: digit ? theme.colors.primary : "#e5e7eb" },
                  ]}
                  value={digit}
                  onChangeText={(value) =>
                    handleOtpChange(value.replace(/[^0-9]/g, ""), index)
                  }
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
              title={authText?.verify || "Verify"}
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
                <Text
                  style={[styles.resendText, { color: theme.colors.primary }]}
                >
                  {authText?.resendCode || "Resend code"}
                </Text>
              </ScalePress>
            ) : (
              <Text style={styles.timerText}>
                {authText?.resendIn || "Resend in"}{" "}
                <Text style={styles.timerNumber}>{resendTimer}s</Text>
              </Text>
            )}
          </View>
        </FadeInView>

        {/* ✨ Voltar */}
        <FadeInView delay={300}>
          <ScalePress onPress={() => navigation.goBack()}>
            <View style={styles.backButton}>
              <Text style={styles.backIcon}>←</Text>
              <Text style={styles.backText}>{t.common?.back || "Back"}</Text>
            </View>
          </ScalePress>
        </FadeInView>
      </ScrollView>

      {/* ✨ Loading Overlay */}
      <LoadingOverlay
        visible={loading}
        message={authText?.verifying || "Verifying..."}
      />

      {/* ✨ Toast */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        position="top"
        onDismiss={hideToast}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    elevation: 4,
  },
  headerIcon: {
    fontSize: 36,
  },
  title: {
    fontWeight: "700",
    marginBottom: 12,
  },
  subtitle: {
    opacity: 0.6,
    marginBottom: 4,
  },
  phone: {
    fontWeight: "700",
    fontSize: 18,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 20,
  },
  otpInput: {
    width: 50,
    height: 60,
    borderWidth: 2,
    borderRadius: 14,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    backgroundColor: "#f9fafb",
    color: "#1f2937",
  },
  otpInputFilled: {
    backgroundColor: "#e3f2fd",
  },
  otpInputError: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
  },
  hintContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fffbeb",
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
    color: "#92400e",
    fontWeight: "500",
  },
  buttonsContainer: {
    marginBottom: 20,
  },
  resendContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  resendText: {
    fontSize: 15,
    fontWeight: "600",
  },
  timerText: {
    fontSize: 14,
    color: "#9ca3af",
  },
  timerNumber: {
    fontWeight: "700",
    color: "#374151",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  backIcon: {
    fontSize: 18,
    marginRight: 8,
    color: "#6b7280",
  },
  backText: {
    fontSize: 15,
    color: "#6b7280",
    fontWeight: "500",
  },
});
