/**
 * Tela de Cadastro
 * ✨ Atualizada com animações e UI melhorada
 * 📱 Com seletor de código de país para SMS
 */

import React, { useEffect, useState } from "react";
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
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import * as paymentService from "../services/payment.service";

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

interface ClientPlanOption {
  id: string;
  name: string;
  price: number;
  vehicleLimit: number;
  serviceRequestsPerMonth: number | null;
  isFeatured?: boolean;
}

const DEFAULT_CLIENT_PLANS: ClientPlanOption[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    vehicleLimit: 2,
    serviceRequestsPerMonth: 4,
  },
  {
    id: "starter",
    name: "Starter",
    price: 9.99,
    vehicleLimit: 3,
    serviceRequestsPerMonth: 10,
  },
  {
    id: "pro",
    name: "Pro",
    price: 19.99,
    vehicleLimit: 5,
    serviceRequestsPerMonth: null,
    isFeatured: true,
  },
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
  const [selectedRole, setSelectedRole] = useState<"CLIENT" | "PROVIDER" | "MARKETPLACE">(
    "CLIENT",
  );
  // Provider-specific fields
  const [businessName, setBusinessName] = useState("");
  const [providerLegalName, setProviderLegalName] = useState("");
  const [providerEin, setProviderEin] = useState("");
  const [providerSunbizDocumentNumber, setProviderSunbizDocumentNumber] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessCity, setBusinessCity] = useState("");
  const [businessState, setBusinessState] = useState("");
  const [businessZipCode, setBusinessZipCode] = useState("");
  const [providerServices, setProviderServices] = useState<Set<string>>(
    new Set(),
  );
  const [providerVehicleTypes, setProviderVehicleTypes] = useState<Set<string>>(
    new Set(["CAR", "SUV", "TRUCK", "VAN"]), // common defaults
  );
  const [providerSellsParts, setProviderSellsParts] = useState(false);
  const [providerPayoutMethod, setProviderPayoutMethod] = useState<"MANUAL" | "ZELLE" | "BANK_TRANSFER">("MANUAL");
  const [providerZelleContact, setProviderZelleContact] = useState("");
  const [providerBankTransferLabel, setProviderBankTransferLabel] = useState("");
  const [providerCityBtr, setProviderCityBtr] = useState("");
  const [providerCountyBtr, setProviderCountyBtr] = useState("");
  const [providerInsuranceDisclosureAccepted, setProviderInsuranceDisclosureAccepted] = useState(false);
  const [showInsuranceModal, setShowInsuranceModal] = useState(false);
  const [zipLookupLoading, setZipLookupLoading] = useState(false);
  const [otpMethod, setOtpMethod] = useState<"sms" | "email">("sms");

  // Marketplace-specific fields
  const [marketplaceType, setMarketplaceType] = useState<"CAR_WASH" | "AUTO_PARTS">("CAR_WASH");
  const [marketplacePlan, setMarketplacePlan] = useState<"basic" | "pro" | "pro_plus">("basic");
  const [clientPlans, setClientPlans] = useState<ClientPlanOption[]>(DEFAULT_CLIENT_PLANS);
  const [selectedClientPlan, setSelectedClientPlan] = useState("free");

  // ✨ Toast hook
  const { toast, error, hideToast } = useToast();

  useEffect(() => {
    let mounted = true;

    paymentService
      .getSubscriptionPlans()
      .then((plans) => {
        if (!mounted || !Array.isArray(plans) || plans.length === 0) return;
        setClientPlans(
          plans.map((plan: any) => ({
            id: String(plan.planKey || plan.id).toLowerCase(),
            name: plan.name,
            price: Number(plan.monthlyPrice || 0),
            vehicleLimit: Number(plan.vehicleLimit || 0),
            serviceRequestsPerMonth: plan.serviceRequestsPerMonth,
            isFeatured: Boolean(plan.isFeatured),
          })),
        );
      })
      .catch(() => {
        // Keep local fallback plans if content API is unavailable.
      });

    return () => {
      mounted = false;
    };
  }, []);

  // ZIP → city/state auto-fill (provider & marketplace forms)
  useEffect(() => {
    if (businessZipCode.length !== 5 || !/^\d{5}$/.test(businessZipCode)) return;
    let cancelled = false;
    setZipLookupLoading(true);
    fetch(`https://api.zippopotam.us/us/${businessZipCode}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.places?.[0]) return;
        const place = data.places[0];
        if (!businessCity) setBusinessCity(place["place name"] || "");
        if (!businessState) setBusinessState(place["state abbreviation"] || "");
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setZipLookupLoading(false); });
    return () => { cancelled = true; };
  }, [businessZipCode]);

  // ✨ Calcular progresso do formulário
  const calculateProgress = () => {
    let filled = 0;
    const totalFields = selectedRole === "PROVIDER" ? 7 : selectedRole === "MARKETPLACE" ? 5 : 4;
    if (fullName.length > 0) filled++;
    if (email.length > 0) filled++;
    if (password.length >= 8) filled++;
    if (confirmPassword.length > 0 && confirmPassword === password) filled++;
    if (selectedRole === "PROVIDER") {
      if (businessName.length > 0) filled++;
      if (businessAddress.length > 0) filled++;
      if (businessZipCode.length > 0) filled++;
    }
    if (selectedRole === "MARKETPLACE") {
      if (businessName.length > 0) filled++;
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
  // Updated per Mobile App Service & Diagnostic Tree — Feb 2026
  const SIGNUP_SERVICES = [
    // Maintenance
    { key: "OIL_CHANGE", label: "Oil Change", icon: "oil" },
    { key: "AIR_FILTER", label: "Air Filter Service", icon: "air-filter" },
    { key: "FUEL_SYSTEM", label: "Fuel System", icon: "gas-station" },
    { key: "BRAKES", label: "Brakes", icon: "car-brake-alert" },
    { key: "COOLING_SYSTEM", label: "Cooling System", icon: "coolant-temperature" },
    { key: "TIRES", label: "Tires & Wheels", icon: "tire" },
    { key: "BELTS_HOSES", label: "Belts & Hoses", icon: "connection" },
    // Repairs
    { key: "AC_SERVICE", label: "A/C & Heating", icon: "air-conditioner" },
    { key: "STEERING", label: "Steering & Suspension", icon: "steering" },
    { key: "ELECTRICAL_BASIC", label: "Electrical System", icon: "flash" },
    { key: "EXHAUST", label: "Exhaust System", icon: "pipe-leak" },
    { key: "DRIVETRAIN", label: "Drivetrain", icon: "cog-transfer" },
    { key: "ENGINE", label: "Engine", icon: "engine" },
    { key: "TRANSMISSION", label: "Transmission", icon: "car-shift-pattern" },
    { key: "BATTERY", label: "Battery", icon: "car-battery" },
    { key: "GENERAL_REPAIR", label: "General Repair", icon: "wrench" },
    // Fluid Services & Packages
    { key: "FLUID_SERVICES", label: "Fluid Services", icon: "water" },
    { key: "PREVENTIVE_PACKAGES", label: "Preventive Maintenance", icon: "package-variant-closed-check" },
    // Inspection & Diagnostics
    { key: "INSPECTION", label: "Inspection", icon: "clipboard-check" },
    { key: "DIAGNOSTICS", label: "Diagnostics", icon: "stethoscope" },
    // Detailing
    { key: "DETAILING", label: "Detailing", icon: "car-wash" },
    // SOS / Roadside
    { key: "TOWING", label: "Towing", icon: "tow-truck" },
    { key: "ROADSIDE_ASSIST", label: "Roadside Assist", icon: "tow-truck" },
    { key: "LOCKOUT", label: "Lockout", icon: "key-variant" },
  ];

  const SIGNUP_VEHICLE_TYPES = [
    { key: "CAR", label: "Car / Sedan", icon: "car-side" },
    { key: "SUV", label: "SUV", icon: "car-estate" },
    { key: "TRUCK", label: "Pickup Truck", icon: "car-pickup" },
    { key: "VAN", label: "Van / Minivan", icon: "van-utility" },
    { key: "HEAVY_TRUCK", label: "Heavy Truck", icon: "truck" },
    { key: "BUS", label: "Bus / RV", icon: "bus" },
  ];

  const toggleProviderService = (key: string) => {
    setProviderServices((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleProviderVehicleType = (key: string) => {
    setProviderVehicleTypes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  async function handleSignup() {
    if (!fullName || !email || !password || !confirmPassword) {
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

    if (selectedRole === "MARKETPLACE" && !businessName) {
      setHasError(true);
      error(t.auth?.fillBusinessFields || "Please fill your business name");
      setTimeout(() => setHasError(false), 500);
      return;
    }

    if (selectedRole === "PROVIDER" && providerServices.size === 0) {
      setHasError(true);
      error(
        t.auth?.selectServices ||
          "Please select at least one service you offer",
      );
      setTimeout(() => setHasError(false), 500);
      return;
    }

    // Full name validation (at least first and last name)
    if (fullName.trim().split(/\s+/).length < 2) {
      setHasError(true);
      error(
        t.auth?.fullNameRequired || "Please enter your first and last name",
      );
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
      // Limpar telefone e adicionar código do país (if provided)
      let normalizedPhone: string | undefined;
      if (phone.trim()) {
        const cleanedPhone = phone.trim().replace(/[^\d]/g, "");
        normalizedPhone = `${selectedCountry.dialCode}${cleanedPhone}`;

        if (!/^\+\d{10,15}$/.test(normalizedPhone)) {
          throw new Error(
            t.auth?.invalidPhone ||
              "Invalid phone number. Please check and try again.",
          );
        }
      }

      // If no phone provided, default to email OTP
      const effectiveOtpMethod = normalizedPhone ? otpMethod : "email";

      const {
        userId,
        otpMethod: responseOtpMethod,
        email: responseEmail,
      } = await signUp({
        fullName,
        email,
        ...(normalizedPhone ? { phone: normalizedPhone } : {}),
        password,
        language: "PT",
        role: selectedRole === "MARKETPLACE" ? "PROVIDER" : selectedRole,
        preferredOtpMethod: effectiveOtpMethod,
        ...(selectedRole === "CLIENT" ? { selectedPlan: selectedClientPlan } : {}),
        ...(selectedRole === "PROVIDER"
          ? {
              businessName,
              legalName: providerLegalName.trim() || undefined,
              ein: providerEin.trim() || undefined,
              sunbizDocumentNumber: providerSunbizDocumentNumber.trim() || undefined,
              businessAddress,
              businessCity: businessCity,
              businessState: businessState,
              businessZipCode,
              servicesOffered: Array.from(providerServices),
              vehicleTypesServed: Array.from(providerVehicleTypes),
              sellsParts: providerSellsParts,
              payoutMethod: providerPayoutMethod,
              zelleEmail: providerZelleContact.includes("@") ? providerZelleContact.trim() : undefined,
              zellePhone: providerZelleContact && !providerZelleContact.includes("@") ? providerZelleContact.trim() : undefined,
              bankTransferLabel: providerBankTransferLabel.trim() || undefined,
              cityBusinessTaxReceiptNumber: providerCityBtr.trim() || undefined,
              countyBusinessTaxReceiptNumber: providerCountyBtr.trim() || undefined,
              insuranceDisclosureAccepted: providerInsuranceDisclosureAccepted,
              marketplaceFacilitatorTaxAcknowledged: true,
            }
          : {}),
        ...(selectedRole === "MARKETPLACE"
          ? {
              businessName,
              businessAddress,
              businessCity: businessCity,
              businessState: businessState,
              businessZipCode,
              marketplaceType,
              marketplacePlan,
            }
          : {}),
      });

      navigation.navigate("OTP", {
        userId,
        phone: normalizedPhone || "",
        otpMethod: responseOtpMethod || effectiveOtpMethod || "email",
        email: responseEmail || email,
        selectedPlan: selectedRole === "CLIENT" ? selectedClientPlan : "free",
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
      {/* Back button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-back" size={24} color="#374151" />
      </TouchableOpacity>

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
            <View style={styles.roleCards}>
              {([
                { key: "CLIENT",      icon: "person",     color: theme.colors.primary, label: t.auth?.customer || "Customer",         desc: "Request auto services" },
                { key: "PROVIDER",    icon: "construct",  color: theme.colors.primary, label: t.auth?.provider || "Service Provider",  desc: "Offer repair & maintenance" },
                { key: "MARKETPLACE", icon: "storefront", color: "#0891b2",            label: t.auth?.marketplace || "Marketplace",    desc: "Car wash or auto parts store" },
              ] as const).map(({ key, icon, color, label, desc }) => {
                const active = selectedRole === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.roleCard, active && { borderColor: color, backgroundColor: color + "12" }]}
                    onPress={() => setSelectedRole(key)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.roleCardIcon, { backgroundColor: active ? color : "#f3f4f6" }]}>
                      <Ionicons name={icon as any} size={22} color={active ? "#fff" : "#6b7280"} />
                    </View>
                    <View style={styles.roleCardText}>
                      <Text style={[styles.roleCardLabel, active && { color }]}>{label}</Text>
                      <Text style={styles.roleCardDesc}>{desc}</Text>
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={20} color={color} />}
                  </TouchableOpacity>
                );
              })}
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
                  📱 {t.auth?.phoneOptional || "Phone (Optional)"}
                </Text>
                <Text style={styles.optionalHint}>
                  {t.auth?.phoneOptionalHint || "Add your phone number to receive SMS notifications"}
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

            {/* Customer Plan Selection */}
            {selectedRole === "CLIENT" && (
              <SlideInView direction="left" delay={305}>
                <View style={[signupCapStyles.sectionContainer, { backgroundColor: "#f8fafc", padding: 12, borderRadius: 12 }]}>
                  <Text style={signupCapStyles.sectionLabel}>
                    {t.auth?.selectPlan || "Select Your Plan"}
                  </Text>
                  <Text style={signupCapStyles.sectionHint}>
                    Paid plans include a 7-day trial. Card is collected securely after verification.
                  </Text>
                  {clientPlans.map((plan) => {
                    const active = selectedClientPlan === plan.id;
                    const planColor = plan.isFeatured ? "#2B5EA7" : plan.price > 0 ? "#0891b2" : "#6b7280";
                    return (
                      <TouchableOpacity
                        key={plan.id}
                        style={[
                          {
                            flexDirection: "row",
                            alignItems: "center",
                            padding: 12,
                            borderRadius: 10,
                            borderWidth: 2,
                            borderColor: active ? planColor : "#e5e7eb",
                            backgroundColor: active ? "#eff6ff" : "#fff",
                            marginTop: 8,
                          },
                        ]}
                        onPress={() => setSelectedClientPlan(plan.id)}
                      >
                        <Ionicons
                          name={active ? "checkmark-circle" : "ellipse-outline"}
                          size={22}
                          color={active ? planColor : "#9ca3af"}
                          style={{ marginRight: 10 }}
                        />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text style={{ fontWeight: "700", fontSize: 15, color: "#111827" }}>
                              {plan.name}
                            </Text>
                            {plan.isFeatured && (
                              <View style={{ backgroundColor: planColor, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>
                                  POPULAR
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>
                            {plan.vehicleLimit} vehicles • {plan.serviceRequestsPerMonth === null ? "Unlimited" : plan.serviceRequestsPerMonth} requests/mo
                            {plan.price > 0 ? " • 7-day trial" : ""}
                          </Text>
                        </View>
                        <Text style={{ fontWeight: "700", color: planColor, fontSize: 14 }}>
                          {plan.price === 0 ? "Free" : `$${plan.price.toFixed(2)}/mo`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </SlideInView>
            )}

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
                        right={zipLookupLoading ? <TextInput.Icon icon="loading" /> : undefined}
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
                      {t.auth?.selectServicesHint ||
                        "Select all services your business provides"}
                    </Text>
                    <View style={signupCapStyles.chipGrid}>
                      {SIGNUP_SERVICES.map((svc) => {
                        const active = providerServices.has(svc.key);
                        return (
                          <TouchableOpacity
                            key={svc.key}
                            style={[
                              signupCapStyles.chip,
                              active && signupCapStyles.chipActive,
                            ]}
                            onPress={() => toggleProviderService(svc.key)}
                            activeOpacity={0.7}
                          >
                            <MaterialCommunityIcons
                              name={svc.icon as any}
                              size={16}
                              color={active ? "#fff" : "#6b7280"}
                            />
                            <Text
                              style={[
                                signupCapStyles.chipText,
                                active && signupCapStyles.chipTextActive,
                              ]}
                            >
                              {svc.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {hasError && providerServices.size === 0 && (
                      <Text style={signupCapStyles.errorText}>
                        Select at least one service
                      </Text>
                    )}
                  </View>
                </SlideInView>

                {/* ── Vehicle Types ── */}
                <SlideInView direction="right" delay={350}>
                  <View style={signupCapStyles.sectionContainer}>
                    <Text style={signupCapStyles.sectionLabel}>
                      🚗{" "}
                      {t.auth?.vehicleTypesYouServe ||
                        "Vehicle Types You Serve"}
                    </Text>
                    <View style={signupCapStyles.chipGrid}>
                      {SIGNUP_VEHICLE_TYPES.map((vt) => {
                        const active = providerVehicleTypes.has(vt.key);
                        return (
                          <TouchableOpacity
                            key={vt.key}
                            style={[
                              signupCapStyles.chip,
                              active && signupCapStyles.chipActive,
                            ]}
                            onPress={() => toggleProviderVehicleType(vt.key)}
                            activeOpacity={0.7}
                          >
                            <MaterialCommunityIcons
                              name={vt.icon as any}
                              size={16}
                              color={active ? "#fff" : "#6b7280"}
                            />
                            <Text
                              style={[
                                signupCapStyles.chipText,
                                active && signupCapStyles.chipTextActive,
                              ]}
                            >
                              {vt.label}
                            </Text>
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
                        {t.auth?.sellPartsHint ||
                          "Enable if you sell parts directly to customers"}
                      </Text>
                    </View>
                    <Switch
                      value={providerSellsParts}
                      onValueChange={setProviderSellsParts}
                      trackColor={{ false: "#e5e7eb", true: "#93c5fd" }}
                      thumbColor={providerSellsParts ? "#2B5EA7" : "#9ca3af"}
                    />
                  </View>
                </SlideInView>

                <SlideInView direction="right" delay={365}>
                  <View style={signupCapStyles.sectionContainer}>
                    <Text style={signupCapStyles.sectionLabel}>
                      💵 Payout and tax setup
                    </Text>
                    <Text style={signupCapStyles.sectionHint}>
                      Optional now. TechTrust can pay manually by Zelle or transfer while Stripe Connect is not set up.
                    </Text>
                    <View style={signupCapStyles.chipGrid}>
                      {[
                        { key: "MANUAL", label: "Later" },
                        { key: "ZELLE", label: "Zelle" },
                        { key: "BANK_TRANSFER", label: "Transfer" },
                      ].map((option) => {
                        const active = providerPayoutMethod === option.key;
                        return (
                          <TouchableOpacity
                            key={option.key}
                            style={[
                              signupCapStyles.chip,
                              active && signupCapStyles.chipActive,
                            ]}
                            onPress={() => setProviderPayoutMethod(option.key as any)}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                signupCapStyles.chipText,
                                active && signupCapStyles.chipTextActive,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {providerPayoutMethod === "ZELLE" && (
                      <TextInput
                        value={providerZelleContact}
                        onChangeText={setProviderZelleContact}
                        mode="outlined"
                        label="Zelle email or phone"
                        style={styles.input}
                        outlineStyle={styles.inputOutline}
                        textColor="#000"
                      />
                    )}

                    {providerPayoutMethod === "BANK_TRANSFER" && (
                      <TextInput
                        value={providerBankTransferLabel}
                        onChangeText={setProviderBankTransferLabel}
                        mode="outlined"
                        label="Bank name or account nickname"
                        style={styles.input}
                        outlineStyle={styles.inputOutline}
                        textColor="#000"
                      />
                    )}

                    <Text style={[signupCapStyles.partsHint, { marginTop: 4 }]}>
                      Business identity is optional now. TechTrust reviews it manually against official Sunbiz, FDACS, and local tax records.
                    </Text>
                    <TextInput
                      value={providerLegalName}
                      onChangeText={setProviderLegalName}
                      mode="outlined"
                      label="Legal business name (optional)"
                      style={styles.input}
                      outlineStyle={styles.inputOutline}
                      textColor="#000"
                    />
                    <TextInput
                      value={providerEin}
                      onChangeText={setProviderEin}
                      mode="outlined"
                      label="EIN / FEI (optional)"
                      style={styles.input}
                      outlineStyle={styles.inputOutline}
                      textColor="#000"
                    />
                    <TextInput
                      value={providerSunbizDocumentNumber}
                      onChangeText={setProviderSunbizDocumentNumber}
                      mode="outlined"
                      label="Sunbiz document # (optional)"
                      style={styles.input}
                      outlineStyle={styles.inputOutline}
                      textColor="#000"
                    />

                    <TextInput
                      value={providerCityBtr}
                      onChangeText={setProviderCityBtr}
                      mode="outlined"
                      label="City business tax receipt (optional)"
                      style={styles.input}
                      outlineStyle={styles.inputOutline}
                      textColor="#000"
                    />
                    <TextInput
                      value={providerCountyBtr}
                      onChangeText={setProviderCountyBtr}
                      mode="outlined"
                      label="County business tax receipt (optional)"
                      style={styles.input}
                      outlineStyle={styles.inputOutline}
                      textColor="#000"
                    />
                  </View>
                </SlideInView>

                <SlideInView direction="left" delay={370}>
                  <View style={signupCapStyles.partsRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={signupCapStyles.partsLabel}>
                        🛡 Insurance disclosure
                      </Text>
                      <Text style={signupCapStyles.partsHint}>
                        If you do not add insurance, customers will see that TechTrust does not provide insurance coverage for your work.
                      </Text>
                    </View>
                    <Switch
                      value={providerInsuranceDisclosureAccepted}
                      onValueChange={(val) => {
                        if (val) {
                          setShowInsuranceModal(true);
                        } else {
                          setProviderInsuranceDisclosureAccepted(false);
                        }
                      }}
                      trackColor={{ false: "#e5e7eb", true: "#fbbf24" }}
                      thumbColor={providerInsuranceDisclosureAccepted ? "#d97706" : "#9ca3af"}
                    />
                  </View>
                </SlideInView>
              </>
            )}

            {/* Marketplace Business Fields */}
            {selectedRole === "MARKETPLACE" && (
              <>
                <SlideInView direction="right" delay={310}>
                  <View
                    style={[
                      styles.inputContainer,
                      {
                        backgroundColor: "#f0fdfa",
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
                          color: '#0891b2',
                          fontWeight: "700",
                          fontSize: 15,
                          marginBottom: 8,
                        },
                      ]}
                    >
                      🏪 {t.auth?.marketplaceInfo || "Marketplace Registration"}
                    </Text>

                    {/* Business Type Selector */}
                    <Text style={[styles.inputLabel, { marginBottom: 6 }]}>
                      {t.auth?.businessType || "Business Type"}
                    </Text>
                    <View style={[styles.roleButtons, { marginBottom: 12 }]}>
                      <TouchableOpacity
                        style={[
                          styles.roleButton,
                          marketplaceType === "CAR_WASH" && {
                            backgroundColor: '#06b6d4',
                            borderColor: '#06b6d4',
                          },
                        ]}
                        onPress={() => setMarketplaceType("CAR_WASH")}
                      >
                        <Ionicons
                          name="water"
                          size={18}
                          color={marketplaceType === "CAR_WASH" ? "#fff" : "#6b7280"}
                        />
                        <Text
                          style={[
                            styles.roleButtonText,
                            marketplaceType === "CAR_WASH" && styles.roleButtonTextActive,
                          ]}
                        >
                          {t.auth?.carWash || "Car Wash"}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.roleButton,
                          marketplaceType === "AUTO_PARTS" && {
                            backgroundColor: '#f97316',
                            borderColor: '#f97316',
                          },
                        ]}
                        onPress={() => setMarketplaceType("AUTO_PARTS")}
                      >
                        <Ionicons
                          name="cube"
                          size={18}
                          color={marketplaceType === "AUTO_PARTS" ? "#fff" : "#6b7280"}
                        />
                        <Text
                          style={[
                            styles.roleButtonText,
                            marketplaceType === "AUTO_PARTS" && styles.roleButtonTextActive,
                          ]}
                        >
                          {t.auth?.autoParts || "Auto Parts"}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <TextInput
                      value={businessName}
                      onChangeText={setBusinessName}
                      mode="outlined"
                      label={marketplaceType === "CAR_WASH"
                        ? (t.auth?.carWashName || "Car Wash Name")
                        : (t.auth?.storeName || "Store Name")}
                      placeholder={marketplaceType === "CAR_WASH" ? "Ex: Shine & Go Car Wash" : "Ex: FastParts Auto Store"}
                      style={styles.input}
                      outlineStyle={styles.inputOutline}
                      textColor="#000"
                      error={hasError && selectedRole === "MARKETPLACE" && !businessName}
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
                      />
                    </View>
                  </View>
                </SlideInView>

                {/* Plan Selection */}
                <SlideInView direction="left" delay={340}>
                  <View style={[signupCapStyles.sectionContainer, { backgroundColor: '#f0fdfa', padding: 12, borderRadius: 12 }]}>
                    <Text style={[signupCapStyles.sectionLabel, { color: '#0891b2' }]}>
                      📋 {t.auth?.selectPlan || "Select Your Plan"}
                    </Text>
                    {[
                      { key: 'basic' as const, name: 'Basic', price: '$29.99/mo', icon: '⭐', color: '#6b7280', desc: marketplaceType === 'CAR_WASH' ? '10mi • 5 photos • 1 package' : '10mi • 50 products • 8% fee' },
                      { key: 'pro' as const, name: 'Pro', price: '$49.99/mo', icon: '🚀', color: '#8b5cf6', desc: marketplaceType === 'CAR_WASH' ? '20mi • 15 photos • 5 packages • Verified' : '20mi • 200 products • 6% fee • Verified', badge: 'POPULAR' },
                      { key: 'pro_plus' as const, name: 'Pro+', price: '$89.99/mo', icon: '👑', color: '#f59e0b', desc: marketplaceType === 'CAR_WASH' ? '50mi • 30 photos • Unlimited • Featured' : '50mi • Unlimited • 4% fee • Featured', badge: 'BEST VALUE' },
                    ].map(plan => (
                      <TouchableOpacity
                        key={plan.key}
                        style={[
                          {
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: 12,
                            borderRadius: 10,
                            borderWidth: 2,
                            borderColor: marketplacePlan === plan.key ? plan.color : '#e5e7eb',
                            backgroundColor: marketplacePlan === plan.key ? `${plan.color}10` : '#fff',
                            marginBottom: 8,
                          },
                        ]}
                        onPress={() => setMarketplacePlan(plan.key)}
                      >
                        <Text style={{ fontSize: 22, marginRight: 10 }}>{plan.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontWeight: '700', fontSize: 15, color: '#111' }}>{plan.name}</Text>
                            {plan.badge && (
                              <View style={{ backgroundColor: plan.color, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{plan.badge}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>{plan.desc}</Text>
                        </View>
                        <Text style={{ fontWeight: '700', color: plan.color, fontSize: 14 }}>{plan.price}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </SlideInView>
              </>
            )}

            {/* ── OTP Method Choice ── */}
            <SlideInView direction="left" delay={365}>
              <View style={signupCapStyles.otpMethodContainer}>
                <Text style={signupCapStyles.otpMethodLabel}>
                  {t.auth?.otpMethodLabel || "How would you like to verify your account?"}
                </Text>
                <View style={signupCapStyles.otpMethodRow}>
                  <TouchableOpacity
                    style={[
                      signupCapStyles.otpMethodCard,
                      otpMethod === "sms" && signupCapStyles.otpMethodCardActive,
                      !phone.trim() && { opacity: 0.4 },
                    ]}
                    onPress={() => {
                      if (phone.trim()) {
                        setOtpMethod("sms");
                      }
                    }}
                    activeOpacity={0.7}
                    disabled={!phone.trim()}
                  >
                    <Text style={signupCapStyles.otpMethodIcon}>📱</Text>
                    <Text
                      style={[
                        signupCapStyles.otpMethodTitle,
                        otpMethod === "sms" && signupCapStyles.otpMethodTitleActive,
                      ]}
                    >
                      SMS
                    </Text>
                    <Text style={signupCapStyles.otpMethodDesc}>
                      {!phone.trim()
                        ? (t.auth?.otpSmsRequiresPhone || "Requires phone number")
                        : (t.auth?.otpViaSms || "Code via text")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      signupCapStyles.otpMethodCard,
                      otpMethod === "email" && signupCapStyles.otpMethodCardActive,
                    ]}
                    onPress={() => setOtpMethod("email")}
                    activeOpacity={0.7}
                  >
                    <Text style={signupCapStyles.otpMethodIcon}>📧</Text>
                    <Text
                      style={[
                        signupCapStyles.otpMethodTitle,
                        otpMethod === "email" && signupCapStyles.otpMethodTitleActive,
                      ]}
                    >
                      Email
                    </Text>
                    <Text style={signupCapStyles.otpMethodDesc}>
                      {t.auth?.otpViaEmail || "Code via email"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </SlideInView>

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

      {/* 🛡 Insurance Disclosure Confirmation Modal */}
      <Modal
        visible={showInsuranceModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowInsuranceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { padding: 24, borderRadius: 20 }]}>
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#fef3c7", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <Ionicons name="shield-outline" size={28} color="#d97706" />
              </View>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827", textAlign: "center" }}>
                Insurance Disclosure
              </Text>
            </View>
            <Text style={{ fontSize: 14, color: "#374151", lineHeight: 22, marginBottom: 8 }}>
              By accepting this disclosure, you confirm that:
            </Text>
            <View style={{ gap: 8, marginBottom: 20 }}>
              {[
                "You do not carry general liability insurance for the services you offer through TechTrust.",
                "Customers will be clearly notified before booking that TechTrust does not provide insurance coverage for your work.",
                "You accept full responsibility for any damages or liability arising from your services.",
              ].map((item, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                  <Ionicons name="alert-circle-outline" size={16} color="#d97706" style={{ marginTop: 3 }} />
                  <Text style={{ flex: 1, fontSize: 13, color: "#4b5563", lineHeight: 20 }}>{item}</Text>
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 12, color: "#9ca3af", marginBottom: 20, fontStyle: "italic" }}>
              Providers with valid insurance can upload their certificate later in the Settings → Compliance section.
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: "#e5e7eb", alignItems: "center" }}
                onPress={() => setShowInsuranceModal(false)}
              >
                <Text style={{ fontWeight: "600", color: "#6b7280" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: "#d97706", alignItems: "center" }}
                onPress={() => {
                  setProviderInsuranceDisclosureAccepted(true);
                  setShowInsuranceModal(false);
                }}
              >
                <Text style={{ fontWeight: "700", color: "#fff" }}>I Understand</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
                    <Ionicons name="checkmark" size={20} color="#2B5EA7" />
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
  backButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 16,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  roleSelectorContainer: {
    marginBottom: 20,
  },
  roleCards: {
    gap: 10,
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  roleCardIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  roleCardText: {
    flex: 1,
  },
  roleCardLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  roleCardDesc: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
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
  optionalHint: {
    fontSize: 12,
    color: "#9ca3af",
    marginBottom: 8,
    fontStyle: "italic",
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
    backgroundColor: "#f0f9ff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2B5EA7",
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 10,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 4,
  },
  chipActive: {
    backgroundColor: "#2B5EA7",
    borderColor: "#2B5EA7",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#374151",
  },
  chipTextActive: {
    color: "#fff",
  },
  errorText: {
    fontSize: 12,
    color: "#ef4444",
    marginTop: 6,
  },
  partsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f9ff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  partsLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  partsHint: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  otpMethodContainer: {
    marginBottom: 8,
  },
  otpMethodLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 10,
  },
  otpMethodRow: {
    flexDirection: "row",
    gap: 10,
  },
  otpMethodCard: {
    flex: 1,
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  otpMethodCardActive: {
    borderColor: "#2B5EA7",
    backgroundColor: "#eff6ff",
  },
  otpMethodIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  otpMethodTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
  },
  otpMethodTitleActive: {
    color: "#2B5EA7",
  },
  otpMethodDesc: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 2,
  },
});
