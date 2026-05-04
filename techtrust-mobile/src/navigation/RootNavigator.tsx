import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type {
  AuthStackParamList,
  CustomerOnboardingStackParamList,
  MarketplaceOnboardingStackParamList,
  ProviderOnboardingStackParamList,
} from "./types";
import { useAuth } from "../contexts/AuthContext";

// Landing Screen (Initial entry point)
import LandingScreen from "../screens/LandingScreen";

// Auth Screens (shared)
import LoginScreen from "../screens/LoginScreen";
import SignupScreen from "../screens/SignupScreen";
import AccountTypeScreen from "../screens/AccountTypeScreen";
import OTPScreen from "../screens/OTPScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import CompleteSocialSignupScreen from "../screens/CompleteSocialSignupScreen";

// Legal & support (same screens as customer stacks — needed on auth stack for logged-out landing footer)
import TermsAndPoliciesScreen from "../screens/customer/TermsAndPoliciesScreen";
import HelpCenterScreen from "../screens/customer/HelpCenterScreen";
import ContactUsScreen from "../screens/customer/ContactUsScreen";
import SupportChatScreen from "../screens/SupportChatScreen";
import RateAppScreen from "../screens/customer/RateAppScreen";

// Navigators
import CustomerNavigator from "./CustomerNavigator";
import ProviderNavigator from "./ProviderNavigator";

// Onboarding
import ProviderOnboardingScreen from "../screens/provider/ProviderOnboardingScreen";
import ProviderServicesScreen from "../screens/provider/ProviderServicesScreen";
import CustomerOnboardingScreen from "../screens/customer/CustomerOnboardingScreen";
import MarketplaceOnboardingScreen from "../screens/marketplace/MarketplaceOnboardingScreen";
import { log } from "../utils/logger";
import { translate } from "../i18n";

const AuthStackNav = createNativeStackNavigator<AuthStackParamList>();
const CustomerOnboardingNav =
  createNativeStackNavigator<CustomerOnboardingStackParamList>();
const MarketplaceOnboardingNav =
  createNativeStackNavigator<MarketplaceOnboardingStackParamList>();
const ProviderOnboardingNav =
  createNativeStackNavigator<ProviderOnboardingStackParamList>();

// ─── Error Boundary to prevent white screens ───
class ProviderErrorBoundary extends React.Component<
  { children: React.ReactNode; onLogout: () => void },
  { hasError: boolean; errorMessage: string; errorStack: string }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, errorMessage: "", errorStack: "" };
  }

  static getDerivedStateFromError(error: any) {
    const raw = error?.message ?? error;
    const hasMsg =
      raw !== undefined &&
      raw !== null &&
      String(raw).trim().length > 0;
    return {
      hasError: true,
      errorMessage: hasMsg
        ? String(raw)
        : translate("common.unknownError"),
      errorStack: String(error?.stack || ""),
    };
  }

  componentDidCatch(error: any, errorInfo: any) {
    log.error("Provider view crashed:", error, errorInfo);
    // Include component stack for debugging
    if (errorInfo?.componentStack) {
      this.setState((prev) => ({
        errorStack:
          prev.errorStack + "\n\nComponent Stack:" + errorInfo.componentStack,
      }));
    }
  }

  handleCopyError = async () => {
    const fullError = `Error: ${this.state.errorMessage}\n\nStack: ${this.state.errorStack}`;
    Alert.alert(translate("common.errorDetailsTitle"), fullError);
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={ebStyles.container}>
          <Text style={ebStyles.emoji}>⚠️</Text>
          <Text style={ebStyles.title}>
            {translate("common.providerDashboardCrashTitle")}
          </Text>
          <Text style={ebStyles.subtitle}>
            {translate("common.providerDashboardCrashSubtitle")}
          </Text>
          <ScrollView
            style={ebStyles.errorScroll}
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            <Text style={ebStyles.errorDetail} selectable>
              {this.state.errorMessage}
            </Text>
            {this.state.errorStack ? (
              <Text style={ebStyles.errorStack} selectable numberOfLines={8}>
                {this.state.errorStack.slice(0, 500)}
              </Text>
            ) : null}
          </ScrollView>
          <TouchableOpacity
            style={ebStyles.copyBtn}
            onPress={this.handleCopyError}
          >
            <Text style={ebStyles.copyText}>
              {translate("common.copyErrorDetailsButton")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={ebStyles.retryBtn}
            onPress={() =>
              this.setState({
                hasError: false,
                errorMessage: "",
                errorStack: "",
              })
            }
          >
            <Text style={ebStyles.retryText}>
              {translate("common.tryAgainButton")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={ebStyles.logoutBtn}
            onPress={this.props.onLogout}
          >
            <Text style={ebStyles.logoutText}>
              {translate("auth.logout")}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const ebStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#f8fafc",
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 8 },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  errorScroll: { maxHeight: 120, width: "100%", marginBottom: 12 },
  errorDetail: {
    fontSize: 12,
    color: "#ef4444",
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    paddingHorizontal: 8,
  },
  errorStack: {
    fontSize: 9,
    color: "#9ca3af",
    textAlign: "left",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    paddingHorizontal: 8,
    marginTop: 4,
  },
  copyBtn: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  copyText: { color: "#374151", fontWeight: "500", fontSize: 13 },
  retryBtn: {
    backgroundColor: "#2B5EA7",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  retryText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  logoutBtn: { paddingHorizontal: 32, paddingVertical: 14 },
  logoutText: { color: "#ef4444", fontWeight: "600", fontSize: 14 },
});

// Auth Stack Component
function AuthStack() {
  return (
    <AuthStackNav.Navigator screenOptions={{ headerShown: false }}>
      <AuthStackNav.Screen name="Landing" component={LandingScreen} />
      <AuthStackNav.Screen name="Login" component={LoginScreen} />
      <AuthStackNav.Screen name="AccountType" component={AccountTypeScreen} />
      <AuthStackNav.Screen name="Signup" component={SignupScreen} />
      <AuthStackNav.Screen name="OTP" component={OTPScreen} />
      <AuthStackNav.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStackNav.Screen
        name="CompleteSocialSignup"
        component={CompleteSocialSignupScreen}
      />
      <AuthStackNav.Screen name="TermsAndPolicies" component={TermsAndPoliciesScreen} />
      <AuthStackNav.Screen name="HelpCenter" component={HelpCenterScreen} />
      <AuthStackNav.Screen name="ContactUs" component={ContactUsScreen} />
      <AuthStackNav.Screen name="SupportChat" component={SupportChatScreen} />
      <AuthStackNav.Screen name="RateApp" component={RateAppScreen} />
    </AuthStackNav.Navigator>
  );
}

// Wrapper that shows onboarding before customer tabs
function CustomerWithOnboarding() {
  return (
    <CustomerOnboardingNav.Navigator screenOptions={{ headerShown: false }}>
      <CustomerOnboardingNav.Screen
        name="CustomerOnboarding"
        component={CustomerOnboardingScreen}
      />
      <CustomerOnboardingNav.Screen name="CustomerMain" component={CustomerNavigator} />
    </CustomerOnboardingNav.Navigator>
  );
}

// Wrapper that shows onboarding before marketplace tabs
function MarketplaceWithOnboarding() {
  return (
    <MarketplaceOnboardingNav.Navigator screenOptions={{ headerShown: false }}>
      <MarketplaceOnboardingNav.Screen
        name="MarketplaceOnboarding"
        component={MarketplaceOnboardingScreen}
      />
      <MarketplaceOnboardingNav.Screen name="ProviderMain" component={ProviderNavigator} />
    </MarketplaceOnboardingNav.Navigator>
  );
}

// Wrapper that shows onboarding before provider tabs
function ProviderWithOnboarding() {
  return (
    <ProviderOnboardingNav.Navigator screenOptions={{ headerShown: false }}>
      <ProviderOnboardingNav.Screen
        name="ProviderOnboarding"
        component={ProviderOnboardingScreen}
      />
      <ProviderOnboardingNav.Screen name="ProviderMain" component={ProviderNavigator} />
      <ProviderOnboardingNav.Screen
        name="OnboardingServices"
        component={ProviderServicesScreen}
      />
    </ProviderOnboardingNav.Navigator>
  );
}

export default function RootNavigator() {
  const { user, isAuthenticated, loading, hasCompletedOnboarding, logout } =
    useAuth();

  // Determine which navigator to show based on user role
  const isProvider = user?.role === "PROVIDER";
  const isMarketplace = user?.role === "MARKETPLACE";

  if (loading) {
    return null; // Or a loading screen
  }

  // When authenticated, show the appropriate navigator directly
  if (isAuthenticated) {
    if (isProvider || isMarketplace) {
      if (!hasCompletedOnboarding) {
        const OnboardingWrapper = isMarketplace ? MarketplaceWithOnboarding : ProviderWithOnboarding;
        return (
          <ProviderErrorBoundary onLogout={logout}>
            <OnboardingWrapper />
          </ProviderErrorBoundary>
        );
      }
      return (
        <ProviderErrorBoundary onLogout={logout}>
          <ProviderNavigator />
        </ProviderErrorBoundary>
      );
    }
    // Show onboarding for new customers who haven't completed it
    if (!hasCompletedOnboarding) {
      return <CustomerWithOnboarding />;
    }
    return <CustomerNavigator />;
  }

  // When not authenticated, show auth stack
  return <AuthStack />;
}
