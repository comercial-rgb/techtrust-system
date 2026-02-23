/**
 * LoginScreen - Tela de Login
 * Com opção de entrar como Cliente ou Fornecedor
 * Suporte a Social Login (Google/Apple) e Login Biométrico
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import { useI18n, languages, Language } from "../i18n";
import { logos } from "../constants/images";
import { BiometricPromptCard } from "../components";
import {
  signInWithGoogle,
  signInWithApple,
  isAppleSignInAvailable,
  getBiometricInfo,
  isBiometricLoginEnabled,
  hasBiometricPromptBeenShown,
  attemptBiometricLogin,
  BiometricInfo,
} from "../services/authService";

export default function LoginScreen({ navigation }: any) {
  const { login, loginAsProvider, socialLogin } = useAuth();
  const { language, setLanguage, t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "apple" | null>(
    null,
  );
  const [loginType, setLoginType] = useState<"customer" | "provider">(
    "customer",
  );
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  // Biometric states
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [pendingCredentials, setPendingCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [biometricInfo, setBiometricInfo] = useState<BiometricInfo | null>(
    null,
  );
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  const currentLanguage =
    languages.find((l) => l.code === language) || languages[0];

  // Check biometric availability on mount
  useEffect(() => {
    checkBiometricStatus();
    checkAppleAvailability();
  }, []);

  const checkBiometricStatus = async () => {
    const info = await getBiometricInfo();
    setBiometricInfo(info);

    const enabled = await isBiometricLoginEnabled();
    setBiometricEnabled(enabled);
  };

  const checkAppleAvailability = async () => {
    const available = await isAppleSignInAvailable();
    setAppleAvailable(available);
  };

  // Handle biometric quick login
  const handleBiometricLogin = async () => {
    setLoading(true);
    try {
      const credentials = await attemptBiometricLogin(
        t.biometric?.loginPrompt || "Log in to TechTrust",
      );

      if (credentials) {
        if (loginType === "provider") {
          await loginAsProvider(credentials.email, credentials.password);
        } else {
          await login(credentials.email, credentials.password);
        }
      }
    } catch (error: any) {
      Alert.alert(t.common.error, error.message || t.auth.loginFailed);
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Sign-In
  const handleGoogleLogin = async () => {
    setSocialLoading("google");
    try {
      const googleUser = await signInWithGoogle();

      if (googleUser) {
        // Send to backend for authentication/registration
        const result = await socialLogin("GOOGLE", googleUser.id, {
          fullName: googleUser.name,
        });

        if (result.status === "NEEDS_PASSWORD") {
          // Navigate to complete signup screen
          navigation.navigate("CompleteSocialSignup", {
            userId: result.userId,
            email: result.email,
            fullName: result.fullName,
            phone: result.phone,
            provider: "Google",
          });
        }
        // If AUTHENTICATED, AuthContext already set the user
      }
    } catch (error: any) {
      if (error.message !== "Google Sign-In not configured") {
        Alert.alert(t.common.error, error.message || t.auth.loginFailed);
      }
    } finally {
      setSocialLoading(null);
    }
  };

  // Handle Apple Sign-In
  const handleAppleLogin = async () => {
    if (!appleAvailable) {
      Alert.alert(
        t.common.error,
        t.auth?.appleNotAvailable ||
          "Apple Sign-In is not available on this device",
      );
      return;
    }

    setSocialLoading("apple");
    try {
      const appleUser = await signInWithApple();

      if (appleUser) {
        // Send to backend for authentication/registration
        const result = await socialLogin("APPLE", appleUser.identityToken, {
          appleUserId: appleUser.id,
          fullName: appleUser.fullName || undefined,
        });

        if (result.status === "NEEDS_PASSWORD") {
          navigation.navigate("CompleteSocialSignup", {
            userId: result.userId,
            email: result.email,
            fullName: result.fullName,
            phone: result.phone,
            provider: "Apple",
          });
        }
      }
    } catch (error: any) {
      Alert.alert(t.common.error, error.message || t.auth.loginFailed);
    } finally {
      setSocialLoading(null);
    }
  };

  const handleSocialLogin = (provider: "google" | "apple" | "facebook") => {
    if (provider === "google") {
      handleGoogleLogin();
    } else if (provider === "apple") {
      handleAppleLogin();
    } else {
      // Facebook - will be implemented with expo-facebook SDK
      Alert.alert(
        t.common?.comingSoon || "Coming Soon",
        `Facebook ${t.auth?.socialLoginComingSoon || "login will be available soon!"}`,
        [{ text: t.common?.ok || "OK" }],
      );
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t.common.error, t.auth.fillEmailPassword);
      return;
    }

    setLoading(true);
    try {
      if (loginType === "provider") {
        await loginAsProvider(email, password);
      } else {
        await login(email, password);
      }

      // Check if we should show biometric prompt
      const promptShown = await hasBiometricPromptBeenShown();
      const info = await getBiometricInfo();

      if (!promptShown && info.isAvailable && info.isEnrolled) {
        // Store credentials temporarily for biometric setup
        setPendingCredentials({ email, password });
        setShowBiometricPrompt(true);
      }
    } catch (error: any) {
      console.log("🔴 Login error:", error.code, error.message);

      // Verificar se é erro de telefone não verificado
      if (error.code === "PHONE_NOT_VERIFIED") {
        const userId = error.data?.userId;
        const phone = error.data?.phone;
        Alert.alert(
          t.auth.verificationRequired || "Verificação necessária",
          t.auth.phoneNotVerifiedMessage ||
            "Seu telefone ainda não foi verificado. Deseja reenviar o código?",
          [
            { text: t.common.cancel || "Cancelar", style: "cancel" },
            {
              text: t.auth.resendCode || "Reenviar código",
              onPress: () => {
                // Navegar para tela de OTP para verificar telefone
                navigation.navigate("OTP", {
                  userId,
                  phone,
                  otpMethod: "sms",
                  email,
                });
              },
            },
          ],
        );
      } else {
        Alert.alert(t.common.error, error.message || t.auth.loginFailed);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricPromptComplete = (enabled: boolean) => {
    setShowBiometricPrompt(false);
    setPendingCredentials(null);
    setBiometricEnabled(enabled);
  };

  const handleLanguageSelect = async (langCode: Language) => {
    await setLanguage(langCode);
    setShowLanguageModal(false);
  };

  const getBiometricIcon = () => {
    if (!biometricInfo) return "fingerprint";
    switch (biometricInfo.biometricType) {
      case "facial":
        return Platform.OS === "ios" ? "face-recognition" : "face-recognition";
      case "fingerprint":
        return "fingerprint";
      default:
        return "fingerprint";
    }
  };

  const getBiometricLabel = () => {
    if (!biometricInfo) return "Biometrics";
    switch (biometricInfo.biometricType) {
      case "facial":
        return Platform.OS === "ios" ? "Face ID" : "Face";
      case "fingerprint":
        return Platform.OS === "ios" ? "Touch ID" : "Fingerprint";
      default:
        return "Biometrics";
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Back Button and Language Selector */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#2B5EA7" />
        </TouchableOpacity>

        {/* Language Selector Button */}
        <TouchableOpacity
          style={styles.languageButtonInRow}
          onPress={() => setShowLanguageModal(true)}
        >
          <Text style={styles.languageFlag}>{currentLanguage.flag}</Text>
          <Text style={styles.languageText}>{currentLanguage.nativeName}</Text>
          <MaterialCommunityIcons
            name="chevron-down"
            size={16}
            color="#6b7280"
          />
        </TouchableOpacity>
      </View>

      {/* Language Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLanguageModal(false)}
        >
          <View style={styles.languageModalContent}>
            <Text style={styles.languageModalTitle}>
              {t.settings.selectLanguage}
            </Text>
            {languages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageOption,
                  language === lang.code && styles.languageOptionSelected,
                ]}
                onPress={() => handleLanguageSelect(lang.code)}
              >
                <Text style={styles.languageOptionFlag}>{lang.flag}</Text>
                <Text
                  style={[
                    styles.languageOptionText,
                    language === lang.code && styles.languageOptionTextSelected,
                  ]}
                >
                  {lang.nativeName}
                </Text>
                {language === lang.code && (
                  <MaterialCommunityIcons
                    name="check"
                    size={20}
                    color="#2B5EA7"
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={logos.withText}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>
              {t.auth.tagline || "Welcome, to your must trust car hub"}
            </Text>
          </View>

          {/* Login Type Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, loginType === "customer" && styles.tabActive]}
              onPress={() => setLoginType("customer")}
            >
              <MaterialCommunityIcons
                name="account"
                size={20}
                color={loginType === "customer" ? "#2B5EA7" : "#9ca3af"}
              />
              <Text
                style={[
                  styles.tabText,
                  loginType === "customer" && styles.tabTextActive,
                ]}
              >
                {t.auth.asCustomer}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, loginType === "provider" && styles.tabActive]}
              onPress={() => setLoginType("provider")}
            >
              <MaterialCommunityIcons
                name="store"
                size={20}
                color={loginType === "provider" ? "#2B5EA7" : "#9ca3af"}
              />
              <Text
                style={[
                  styles.tabText,
                  loginType === "provider" && styles.tabTextActive,
                ]}
              >
                {t.auth.asProvider}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.welcomeText}>{t.auth.welcomeBack}</Text>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons
                name="email-outline"
                size={20}
                color="#9ca3af"
              />
              <TextInput
                style={styles.input}
                placeholder={t.auth.email}
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                color="#000"
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons
                name="lock-outline"
                size={20}
                color="#9ca3af"
              />
              <TextInput
                style={styles.input}
                placeholder={t.auth.password}
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                color="#000"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <MaterialCommunityIcons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotButton}
              onPress={() => navigation.navigate("ForgotPassword")}
            >
              <Text style={styles.forgotText}>{t.auth.forgotPassword}</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                loading && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.loginButtonText}>{t.auth.login}</Text>
                  <MaterialCommunityIcons
                    name="arrow-right"
                    size={20}
                    color="#fff"
                  />
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t.auth.orContinueWith}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Login */}
            <View style={styles.socialContainer}>
              <TouchableOpacity
                style={[
                  styles.socialButton,
                  socialLoading === "google" && styles.socialButtonLoading,
                ]}
                onPress={() => handleSocialLogin("google")}
                disabled={socialLoading !== null}
              >
                {socialLoading === "google" ? (
                  <ActivityIndicator size="small" color="#ea4335" />
                ) : (
                  <MaterialCommunityIcons
                    name="google"
                    size={24}
                    color="#ea4335"
                  />
                )}
              </TouchableOpacity>
              {Platform.OS === "ios" && (
                <TouchableOpacity
                  style={[
                    styles.socialButton,
                    socialLoading === "apple" && styles.socialButtonLoading,
                  ]}
                  onPress={() => handleSocialLogin("apple")}
                  disabled={socialLoading !== null}
                >
                  {socialLoading === "apple" ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <MaterialCommunityIcons
                      name="apple"
                      size={24}
                      color="#000"
                    />
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Biometric Login Button */}
            {biometricEnabled &&
              biometricInfo?.isAvailable &&
              biometricInfo?.isEnrolled && (
                <TouchableOpacity
                  style={styles.biometricButton}
                  onPress={handleBiometricLogin}
                  disabled={loading}
                >
                  <MaterialCommunityIcons
                    name={getBiometricIcon() as any}
                    size={24}
                    color="#2B5EA7"
                  />
                  <Text style={styles.biometricButtonText}>
                    {t.biometric?.loginWith || "Log in with"}{" "}
                    {getBiometricLabel()}
                  </Text>
                </TouchableOpacity>
              )}

            {/* Signup Link */}
            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>{t.auth.dontHaveAccount} </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
                <Text style={styles.signupLink}>{t.auth.signup}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Biometric Prompt Card */}
      {pendingCredentials && (
        <BiometricPromptCard
          visible={showBiometricPrompt}
          email={pendingCredentials.email}
          password={pendingCredentials.password}
          onComplete={handleBiometricPromptComplete}
          onDismiss={() => setShowBiometricPrompt(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  // Header Row Styles
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
  },
  // Language Selector Styles
  languageButtonInRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 20,
    gap: 6,
  },
  languageButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    marginRight: 16,
    backgroundColor: "#f3f4f6",
    borderRadius: 20,
    gap: 6,
  },
  languageFlag: {
    fontSize: 16,
  },
  languageText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  languageModalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "80%",
    maxWidth: 320,
  },
  languageModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 16,
  },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#f8fafc",
  },
  languageOptionSelected: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#2B5EA7",
  },
  languageOptionFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  languageOptionText: {
    flex: 1,
    fontSize: 16,
    color: "#374151",
    fontWeight: "500",
  },
  languageOptionTextSelected: {
    color: "#2B5EA7",
    fontWeight: "600",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  logoContainer: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 30,
  },
  logoImage: {
    width: 280,
    height: 112,
    marginBottom: 12,
  },
  tagline: {
    fontSize: 16,
    color: "#2B5EA7",
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9ca3af",
  },
  tabTextActive: {
    color: "#2B5EA7",
  },
  form: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1f2937",
    marginLeft: 10,
  },
  forgotButton: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotText: {
    fontSize: 14,
    color: "#2B5EA7",
    fontWeight: "500",
  },
  loginButton: {
    backgroundColor: "#2B5EA7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e5e7eb",
  },
  dividerText: {
    paddingHorizontal: 12,
    color: "#9ca3af",
    fontSize: 14,
  },
  socialContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginBottom: 24,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  socialButtonLoading: {
    opacity: 0.7,
  },
  biometricButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    marginBottom: 24,
    gap: 10,
  },
  biometricButtonText: {
    color: "#2B5EA7",
    fontSize: 15,
    fontWeight: "600",
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  signupText: {
    fontSize: 14,
    color: "#6b7280",
  },
  signupLink: {
    fontSize: 14,
    color: "#2B5EA7",
    fontWeight: "600",
  },
});
