/**
 * Tela de Cadastro
 * ✨ Atualizada com animações e UI melhorada
 * 📱 Com seletor de código de país para SMS
 */

import React, { useState } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  Switch,
} from "react-native";
import { TextInput, Text, useTheme } from "react-native-paper";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../i18n";
import { Ionicons } from "@expo/vector-icons";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

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
} from "../components";

// 🌍 Lista de países com códigos
const COUNTRIES = [
  { code: "US", name: "United States", dialCode: "+1", flag: "🇺🇸" },
  { code: "BR", name: "Brasil", dialCode: "+55", flag: "🇧🇷" },
  { code: "PT", name: "Portugal", dialCode: "+351", flag: "🇵🇹" },
  { code: "ES", name: "España", dialCode: "+34", flag: "🇪🇸" },
  { code: "MX", name: "México", dialCode: "+52", flag: "🇲🇽" },
  { code: "AR", name: "Argentina", dialCode: "+54", flag: "🇦🇷" },
  { code: "CO", name: "Colombia", dialCode: "+57", flag: "🇨🇴" },
  { code: "CL", name: "Chile", dialCode: "+56", flag: "🇨🇱" },
  { code: "PE", name: "Perú", dialCode: "+51", flag: "🇵🇪" },
  { code: "VE", name: "Venezuela", dialCode: "+58", flag: "🇻🇪" },
  { code: "UY", name: "Uruguay", dialCode: "+598", flag: "🇺🇾" },
  { code: "EC", name: "Ecuador", dialCode: "+593", flag: "🇪🇨" },
  { code: "BO", name: "Bolivia", dialCode: "+591", flag: "🇧🇴" },
  { code: "PY", name: "Paraguay", dialCode: "+595", flag: "🇵🇾" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧" },
  { code: "FR", name: "France", dialCode: "+33", flag: "🇫🇷" },
  { code: "DE", name: "Germany", dialCode: "+49", flag: "🇩🇪" },
  { code: "IT", name: "Italy", dialCode: "+39", flag: "🇮🇹" },
  { code: "CA", name: "Canada", dialCode: "+1", flag: "🇨🇦" },
  { code: "AU", name: "Australia", dialCode: "+61", flag: "🇦🇺" },
];

export default function SignupScreen({ navigation }: any) {
  const theme = useTheme();
  const { t } = useI18n();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]); // US by default
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"CLIENT" | "PROVIDER">(
    "CLIENT",
  );
  // Provider-specific fields
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessCity, setBusinessCity] = useState("");
  const [businessState, setBusinessState] = useState("");
  const [businessZipCode, setBusinessZipCode] = useState("");
  const [providerServices, setProviderServices] = useState<Set<string>>(new Set());
  const [providerVehicleTypes, setProviderVehicleTypes] = useState<Set<string>>(
    new Set(['CAR', 'SUV', 'TRUCK', 'VAN']), // common defaults
  );
  const [providerSellsParts, setProviderSellsParts] = useState(false);

  // ✨ Toast hook
  const { toast, error, hideToast } = useToast();

  // ✨ Calcular progresso do formulário
  const calculateProgress = () => {
    let filled = 0;
    const totalFields = selectedRole === "PROVIDER" ? 8 : 5;
    if (fullName.length > 0) filled++;
    if (email.length > 0) filled++;
    if (phone.length > 0) filled++;
    if (password.length >= 8) filled++;
    if (confirmPassword.length > 0 && confirmPassword === password) filled++;
    if (selectedRole === "PROVIDER") {
      if (businessName.length > 0) filled++;
      if (businessAddress.length > 0) filled++;
      if (businessZipCode.length > 0) filled++;
    }
    return filled / totalFields;
  };

  // ✨ Validar força da senha
  const getPasswordStrength = () => {
    if (password.length === 0) return { level: 0, text: "", color: "#e5e7eb" };
    if (password.length < 6)
      return {
        level: 1,
        text: t.auth?.passwordWeak || "Weak",
        color: "#ef4444",
      };
    if (password.length < 8)
      return {
        level: 2,
        text: t.auth?.passwordMedium || "Medium",
        color: "#f59e0b",
      };
    if (
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password)
    ) {
      return {
        level: 4,
        text: t.auth?.passwordStrong || "Strong",
        color: "#22c55e",
      };
    }
    return { level: 3, text: t.auth?.passwordGood || "Good", color: "#3b82f6" };
  };

  // ─── Provider Service & Vehicle Type definitions for signup ───
  const SIGNUP_SERVICES = [
    { key: 'OIL_CHANGE', label: 'Oil Change', icon: 'oil' },
    { key: 'BRAKES', label: 'Brakes', icon: 'car-brake-abs' },
    { key: 'TIRES', label: 'Tires', icon: 'tire' },
    { key: 'ENGINE', label: 'Engine', icon: 'engine' },
    { key: 'TRANSMISSION', label: 'Transmission', icon: 'car-shift-pattern' },
    { key: 'ELECTRICAL_BASIC', label: 'Electrical', icon: 'flash' },
    { key: 'AC_SERVICE', label: 'A/C', icon: 'air-conditioner' },
    { key: 'SUSPENSION', label: 'Suspension', icon: 'car-traction-control' },
    { key: 'BATTERY', label: 'Battery', icon: 'car-battery' },
    { key: 'INSPECTION', label: 'Inspection', icon: 'clipboard-check' },
    { key: 'DIAGNOSTICS', label: 'Diagnostics', icon: 'stethoscope' },
    { key: 'DETAILING', label: 'Detailing', icon: 'car-wash' },
    { key: 'TOWING', label: 'Towing', icon: 'tow-truck' },
    { key: 'ROADSIDE_ASSIST', label: 'Roadside', icon: 'tow-truck' },
    { key: 'LOCKOUT', label: 'Lockout', icon: 'key-variant' },
    { key: 'MAINTENANCE_LIGHT', label: 'Warning Light', icon: 'car-light-alert' },
    { key: 'GENERAL_REPAIR', label: 'General Repair', icon: 'wrench' },
  ];

  const SIGNUP_VEHICLE_TYPES = [
    { key: 'CAR', label: 'Car / Sedan', icon: 'car-side' },
    { key: 'SUV', label: 'SUV', icon: 'car-estate' },
    { key: 'TRUCK', label: 'Pickup Truck', icon: 'truck' },
    { key: 'VAN', label: 'Van / Minivan', icon: 'van-utility' },
    { key: 'HEAVY_TRUCK', label: 'Heavy Truck', icon: 'truck-trailer' },
    { key: 'BUS', label: 'Bus / RV', icon: 'bus' },
  ];

  const toggleProviderService = (key: string) => {
    setProviderServices(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleProviderVehicleType = (key: string) => {
    setProviderVehicleTypes(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  async function handleSignup() {
    if (!fullName || !email || !phone || !password || !confirmPassword) {
      setHasError(true);
      error(t.auth?.fillAllFields || "Please fill all fields");
      setTimeout(() => setHasError(false), 500);
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setHasError(true);
      error(t.auth?.invalidEmail || "Please enter a valid email address");
      setTimeout(() => setHasError(false), 500);
      return;
    }

    if (
      selectedRole === "PROVIDER" &&
      (!businessName || !businessAddress || !businessZipCode)
    ) {
      setHasError(true);
      error(t.auth?.fillBusinessFields || "Please fill all business fields");
      setTimeout(() => setHasError(false), 500);
      return;
    }

    if (selectedRole === "PROVIDER" && providerServices.size === 0) {
      setHasError(true);
      error(t.auth?.selectServices || "Please select at least one service you offer");
      setTimeout(() => setHasError(false), 500);
      return;
    }

    // Full name validation (at least first and last name)
    if (fullName.trim().split(/\s+/).length < 2) {
      setHasError(true);
      error(t.auth?.fullNameRequired || "Please enter your first and last name");
      setTimeout(() => setHasError(false), 500);
      return;
    }

    if (password !== confirmPassword) {
      setHasError(true);
      error(t.auth?.passwordsDoNotMatch || "Passwords do not match");
      setTimeout(() => setHasError(false), 500);
      return;
    }

    if (password.length < 8) {
      setHasError(true);
      error(
        t.auth?.passwordMinLength || "Password must be at least 8 characters",
      );
      setTimeout(() => setHasError(false), 500);
      return;
    }

    setLoading(true);
    try {
      // Limpar telefone e adicionar código do país
      const cleanedPhone = phone.trim().replace(/[^\d]/g, "");
      const normalizedPhone = `${selectedCountry.dialCode}${cleanedPhone}`;

      if (!/^\+\d{10,15}$/.test(normalizedPhone)) {
        throw new Error(
          t.auth?.invalidPhone ||
            "Telefone inválido. Verifique o número e tente novamente.",
        );
      }

      const { userId, otpMethod, email: responseEmail } = await signUp({
        fullName,
        email,
        phone: normalizedPhone,
        password,
        language: "PT",
        role: selectedRole,
        ...(selectedRole === "PROVIDER"
          ? {
              businessName,
              businessAddress,
              businessCity: businessCity,
              businessState: businessState,
              businessZipCode,
              servicesOffered: Array.from(providerServices),
              vehicleTypesServed: Array.from(providerVehicleTypes),
              sellsParts: providerSellsParts,
            }
          : {}),
      });

      navigation.navigate("OTP", { 
        userId, 
        phone: normalizedPhone,
        otpMethod: otpMethod || 'sms',
        email: responseEmail || email,
      });
    } catch (err: any) {
      error(
        err.message || t.auth?.errorCreatingAccount || "Error creating account",
      );
    } finally {
      setLoading(false);
    }
  }

  const passwordStrength = getPasswordStrength();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ✨ Header animado */}
        <FadeInView delay={0}>
          <View style={styles.header}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <Text style={styles.headerIcon}>👤</Text>
            </View>
            <Text
              variant="headlineMedium"
              style={[styles.title, { color: theme.colors.primary }]}
            >
              {t.auth?.createAccount || "Create Account"}
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              {t.auth?.signupSubtitle || "Sign up to get started"}
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
              {Math.round(calculateProgress() * 100)}%{" "}
              {t.common?.complete || "complete"}
            </Text>
          </View>
        </FadeInView>

        {/* 🔄 Role Selector */}
        <FadeInView delay={60}>
          <View style={styles.roleSelectorContainer}>
            <Text style={styles.inputLabel}>
              {t.auth?.accountType || "Account Type"}
            </Text>
            <View style={styles.roleButtons}>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  selectedRole === "CLIENT" && {
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.primary,
                  },
                ]}
                onPress={() => setSelectedRole("CLIENT")}
              >
                <Ionicons
                  name="person"
                  size={20}
                  color={selectedRole === "CLIENT" ? "#fff" : "#6b7280"}
                />
                <Text
                  style={[
                    styles.roleButtonText,
                    selectedRole === "CLIENT" && styles.roleButtonTextActive,
                  ]}
                >
                  {t.auth?.customer || "Customer"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  selectedRole === "PROVIDER" && {
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.primary,
                  },
                ]}
                onPress={() => setSelectedRole("PROVIDER")}
              >
                <Ionicons
                  name="construct"
                  size={20}
                  color={selectedRole === "PROVIDER" ? "#fff" : "#6b7280"}
                />
                <Text
                  style={[
                    styles.roleButtonText,
                    selectedRole === "PROVIDER" && styles.roleButtonTextActive,
                  ]}
                >
                  {t.auth?.provider || "Service Provider"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </FadeInView>

        {/* ✨ Formulário com animações */}
        <ShakeView shake={hasError}>
          <View style={styles.form}>
            <SlideInView direction="left" delay={100}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  👤 {t.auth?.fullName || "Full Name"}
                </Text>
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  mode="outlined"
                  placeholder={t.auth?.fullNamePlaceholder || "Your full name"}
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  textColor="#000"
                  error={hasError && !fullName}
                />
              </View>
            </SlideInView>

            <SlideInView direction="right" delay={150}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  ✉️ {t.auth?.email || "Email"}
                </Text>
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
                <Text style={styles.inputLabel}>
                  📱 {t.auth?.phone || "Phone"}
                </Text>
                <View style={styles.phoneContainer}>
                  {/* Seletor de País */}
                  <TouchableOpacity
                    style={styles.countrySelector}
                    onPress={() => setShowCountryPicker(true)}
                  >
                    <Text style={styles.countryFlag}>
                      {selectedCountry.flag}
                    </Text>
                    <Text style={styles.countryCode}>
                      {selectedCountry.dialCode}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#6b7280" />
                  </TouchableOpacity>
                  {/* Campo de Telefone */}
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    mode="outlined"
                    placeholder="99999-9999"
                    keyboardType="phone-pad"
                    style={[styles.input, styles.phoneInput]}
                    outlineStyle={styles.inputOutline}
                    textColor="#000"
                    error={hasError && !phone}
                  />
                </View>
              </View>
            </SlideInView>

            <SlideInView direction="right" delay={250}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  🔒 {t.auth?.password || "Password"}
                </Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  mode="outlined"
                  placeholder={
                    t.auth?.passwordPlaceholder || "Minimum 8 characters"
                  }
                  secureTextEntry={!showPassword}
                  textColor="#000"
                  right={
                    <TextInput.Icon
                      icon={showPassword ? "eye-off" : "eye"}
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
                                  : "#e5e7eb",
                            },
                          ]}
                        />
                      ))}
                    </View>
                    <Text
                      style={[
                        styles.strengthText,
                        { color: passwordStrength.color },
                      ]}
                    >
                      {passwordStrength.text}
                    </Text>
                  </View>
                )}
              </View>
            </SlideInView>

            <SlideInView direction="left" delay={300}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  🔒 {t.auth?.confirmPassword || "Confirm Password"}
                </Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  mode="outlined"
                  placeholder={
                    t.auth?.confirmPasswordPlaceholder || "Enter password again"
                  }
                  secureTextEntry={!showPassword}
                  textColor="#000"
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  error={hasError && confirmPassword !== password}
                />
                {confirmPassword.length > 0 && (
                  <View style={styles.matchIndicator}>
                    {confirmPassword === password ? (
                      <Text style={styles.matchSuccess}>
                        ✓ {t.auth?.passwordsMatch || "Passwords match"}
                      </Text>
                    ) : (
                      <Text style={styles.matchError}>
                        ✗{" "}
                        {t.auth?.passwordsDoNotMatch ||
                          "Passwords do not match"}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </SlideInView>

            {/* Provider Business Fields */}
            {selectedRole === "PROVIDER" && (
              <>
                <SlideInView direction="right" delay={310}>
                  <View
                    style={[
                      styles.inputContainer,
                      {
                        backgroundColor: "#f0f9ff",
                        padding: 12,
                        borderRadius: 12,
                        marginBottom: 8,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.inputLabel,
                        {
                          color: theme.colors.primary,
                          fontWeight: "700",
                          fontSize: 15,
                          marginBottom: 8,
                        },
                      ]}
                    >
                      🏢 {t.auth?.businessInfo || "Business Information"}
                    </Text>
                    <TextInput
                      value={businessName}
                      onChangeText={setBusinessName}
                      mode="outlined"
                      label={t.auth?.businessName || "Business Name"}
                      placeholder="Ex: John's Auto Repair"
                      style={styles.input}
                      outlineStyle={styles.inputOutline}
                      textColor="#000"
                      error={
                        hasError && selectedRole === "PROVIDER" && !businessName
                      }
                    />
                  </View>
                </SlideInView>
                <SlideInView direction="left" delay={320}>
                  <View style={styles.inputContainer}>
                    <TextInput
                      value={businessAddress}
                      onChangeText={setBusinessAddress}
                      mode="outlined"
                      label={t.auth?.businessAddress || "Business Address"}
                      placeholder="123 Main St"
                      style={styles.input}
                      outlineStyle={styles.inputOutline}
                      textColor="#000"
                      error={
                        hasError &&
                        selectedRole === "PROVIDER" &&
                        !businessAddress
                      }
                    />
                  </View>
                </SlideInView>
                <SlideInView direction="right" delay={330}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={[styles.inputContainer, { flex: 2 }]}>
                      <TextInput
                        value={businessCity}
                        onChangeText={setBusinessCity}
                        mode="outlined"
                        label={t.auth?.city || "City"}
                        placeholder="Miami"
                        style={styles.input}
                        outlineStyle={styles.inputOutline}
                        textColor="#000"
                      />
                    </View>
                    <View style={[styles.inputContainer, { flex: 1 }]}>
                      <TextInput
                        value={businessState}
                        onChangeText={setBusinessState}
                        mode="outlined"
                        label={t.auth?.state || "State"}
                        placeholder="FL"
                        maxLength={2}
                        autoCapitalize="characters"
                        style={styles.input}
                        outlineStyle={styles.inputOutline}
                        textColor="#000"
                      />
                    </View>
                    <View style={[styles.inputContainer, { flex: 1 }]}>
                      <TextInput
                        value={businessZipCode}
                        onChangeText={setBusinessZipCode}
                        mode="outlined"
                        label={t.auth?.zipCode || "ZIP"}
                        placeholder="33101"
                        keyboardType="numeric"
                        maxLength={5}
                        style={styles.input}
                        outlineStyle={styles.inputOutline}
                        textColor="#000"
                        error={
                          hasError &&
                          selectedRole === "PROVIDER" &&
                          !businessZipCode
                        }
                      />
                    </View>
                  </View>
                </SlideInView>

                {/* ── Services You Offer ── */}
                <SlideInView direction="left" delay={340}>
                  <View style={signupCapStyles.sectionContainer}>
                    <Text style={signupCapStyles.sectionLabel}>
                      🔧 {t.auth?.servicesYouOffer || "Services You Offer"}
                    </Text>
                    <Text style={signupCapStyles.sectionHint}>
                      {t.auth?.selectServicesHint || "Select all services your business provides"}
                    </Text>
                    <View style={signupCapStyles.chipGrid}>
                      {SIGNUP_SERVICES.map(svc => {
                        const active = providerServices.has(svc.key);
                        return (
                          <TouchableOpacity
                            key={svc.key}
                            style={[signupCapStyles.chip, active && signupCapStyles.chipActive]}
                            onPress={() => toggleProviderService(svc.key)}
                            activeOpacity={0.7}
                          >
                            <MaterialCommunityIcons name={svc.icon as any} size={16} color={active ? '#fff' : '#6b7280'} />
                            <Text style={[signupCapStyles.chipText, active && signupCapStyles.chipTextActive]}>{svc.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {hasError && providerServices.size === 0 && (
                      <Text style={signupCapStyles.errorText}>Select at least one service</Text>
                    )}
                  </View>
                </SlideInView>

                {/* ── Vehicle Types ── */}
                <SlideInView direction="right" delay={350}>
                  <View style={signupCapStyles.sectionContainer}>
                    <Text style={signupCapStyles.sectionLabel}>
                      🚗 {t.auth?.vehicleTypesYouServe || "Vehicle Types You Serve"}
                    </Text>
                    <View style={signupCapStyles.chipGrid}>
                      {SIGNUP_VEHICLE_TYPES.map(vt => {
                        const active = providerVehicleTypes.has(vt.key);
                        return (
                          <TouchableOpacity
                            key={vt.key}
                            style={[signupCapStyles.chip, active && signupCapStyles.chipActive]}
                            onPress={() => toggleProviderVehicleType(vt.key)}
                            activeOpacity={0.7}
                          >
                            <MaterialCommunityIcons name={vt.icon as any} size={16} color={active ? '#fff' : '#6b7280'} />
                            <Text style={[signupCapStyles.chipText, active && signupCapStyles.chipTextActive]}>{vt.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </SlideInView>

                {/* ── Parts Sales Toggle ── */}
                <SlideInView direction="left" delay={360}>
                  <View style={signupCapStyles.partsRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={signupCapStyles.partsLabel}>
                        📦 {t.auth?.sellParts || "I also sell auto parts"}
                      </Text>
                      <Text style={signupCapStyles.partsHint}>
                        {t.auth?.sellPartsHint || "Enable if you sell parts directly to customers"}
                      </Text>
                    </View>
                    <Switch
                      value={providerSellsParts}
                      onValueChange={setProviderSellsParts}
                      trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
                      thumbColor={providerSellsParts ? '#1976d2' : '#9ca3af'}
                    />
                  </View>
                </SlideInView>
              </>
            )}

            {/* Botões */}
            <FadeInView delay={370}>
              <View style={styles.buttonsContainer}>
                <EnhancedButton
                  title={t.auth?.createAccount || "Create Account"}
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
            <Text style={styles.loginText}>
              {t.auth?.alreadyHaveAccount || "Already have an account?"}{" "}
            </Text>
            <ScalePress onPress={() => navigation.navigate("Login")}>
              <Text style={[styles.loginLink, { color: theme.colors.primary }]}>
                {t.auth?.login || "Login"}
              </Text>
            </ScalePress>
          </View>
        </FadeInView>

        {/* ✨ Footer */}
        <FadeInView delay={450}>
          <Text style={styles.footer}>
            {t.auth?.signupTerms || "By signing up, you agree to our"}
            {"\n"}
            <Text style={{ color: theme.colors.primary }}>
              {t.common?.termsOfUse || "Terms of Use"}
            </Text>{" "}
            {t.common?.and || "and"}{" "}
            <Text style={{ color: theme.colors.primary }}>
              {t.common?.privacyPolicy || "Privacy Policy"}
            </Text>
          </Text>
        </FadeInView>
      </ScrollView>

      {/* ✨ Loading Overlay */}
      <LoadingOverlay
        visible={loading}
        message={t.auth?.creatingAccount || "Creating your account..."}
      />

      {/* ✨ Toast */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={hideToast}
      />

      {/* 🌍 Modal de Seleção de País */}
      <Modal
        visible={showCountryPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t.auth?.selectCountry || "Select Country"}
              </Text>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={COUNTRIES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryItem,
                    selectedCountry.code === item.code &&
                      styles.countryItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedCountry(item);
                    setShowCountryPicker(false);
                  }}
                >
                  <Text style={styles.countryItemFlag}>{item.flag}</Text>
                  <Text style={styles.countryItemName}>{item.name}</Text>
                  <Text style={styles.countryItemCode}>{item.dialCode}</Text>
                  {selectedCountry.code === item.code && (
                    <Ionicons name="checkmark" size={20} color="#1976d2" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    elevation: 4,
  },
  headerIcon: {
    fontSize: 32,
  },
  title: {
    fontWeight: "700",
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
    color: "#6b7280",
    textAlign: "right",
    marginTop: 4,
  },
  roleSelectorContainer: {
    marginBottom: 20,
  },
  roleButtons: {
    flexDirection: "row",
    gap: 12,
  },
  roleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  roleButtonTextActive: {
    color: "#fff",
  },
  form: {
    width: "100%",
  },
  inputContainer: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
  },
  inputOutline: {
    borderRadius: 12,
  },
  passwordStrength: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  strengthBars: {
    flexDirection: "row",
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
    fontWeight: "600",
    marginLeft: 8,
    minWidth: 50,
  },
  matchIndicator: {
    marginTop: 4,
  },
  matchSuccess: {
    fontSize: 12,
    color: "#22c55e",
    fontWeight: "500",
  },
  matchError: {
    fontSize: 12,
    color: "#ef4444",
    fontWeight: "500",
  },
  buttonsContainer: {
    marginTop: 16,
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  loginText: {
    color: "#666",
  },
  loginLink: {
    fontWeight: "700",
  },
  footer: {
    textAlign: "center",
    fontSize: 12,
    color: "#9e9e9e",
    marginTop: 24,
    lineHeight: 18,
  },
  // 📱 Estilos do seletor de país
  phoneContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  countrySelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 6,
  },
  countryFlag: {
    fontSize: 20,
  },
  countryCode: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  phoneInput: {
    flex: 1,
  },
  // 🌍 Estilos do modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  countryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  countryItemSelected: {
    backgroundColor: "#eff6ff",
  },
  countryItemFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryItemName: {
    flex: 1,
    fontSize: 16,
    color: "#374151",
  },
  countryItemCode: {
    fontSize: 14,
    color: "#6b7280",
    marginRight: 8,
  },
});

// Additional styles for provider capabilities in signup
const signupCapStyles = StyleSheet.create({
  sectionContainer: {
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1976d2',
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 10,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 4,
  },
  chipActive: {
    backgroundColor: '#1976d2',
    borderColor: '#1976d2',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  chipTextActive: {
    color: '#fff',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 6,
  },
  partsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  partsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  partsHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
});
