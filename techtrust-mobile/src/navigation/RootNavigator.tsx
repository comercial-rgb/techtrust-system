import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../contexts/AuthContext";

// Landing Screen (Initial entry point)
import LandingScreen from "../screens/LandingScreen";

// Auth Screens (shared)
import LoginScreen from "../screens/LoginScreen";
import SignupScreen from "../screens/SignupScreen";
import OTPScreen from "../screens/OTPScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import CompleteSocialSignupScreen from "../screens/CompleteSocialSignupScreen";

// Navigators
import CustomerNavigator from "./CustomerNavigator";
import ProviderNavigator from "./ProviderNavigator";

// Onboarding
import ProviderOnboardingScreen from "../screens/provider/ProviderOnboardingScreen";
import ProviderServicesScreen from "../screens/provider/ProviderServicesScreen";

const Stack = createNativeStackNavigator();

// ─── Error Boundary to prevent white screens ───
class ProviderErrorBoundary extends React.Component<
  { children: React.ReactNode; onLogout: () => void },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Provider view crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={ebStyles.container}>
          <Text style={ebStyles.emoji}>⚠️</Text>
          <Text style={ebStyles.title}>Something went wrong</Text>
          <Text style={ebStyles.subtitle}>
            The provider dashboard encountered an error. Please try again.
          </Text>
          <TouchableOpacity
            style={ebStyles.retryBtn}
            onPress={() => this.setState({ hasError: false })}
          >
            <Text style={ebStyles.retryText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={ebStyles.logoutBtn}
            onPress={this.props.onLogout}
          >
            <Text style={ebStyles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const ebStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32, backgroundColor: "#f8fafc" },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#6b7280", textAlign: "center", marginBottom: 24, lineHeight: 20 },
  retryBtn: { backgroundColor: "#1976d2", paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, marginBottom: 12 },
  retryText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  logoutBtn: { paddingHorizontal: 32, paddingVertical: 14 },
  logoutText: { color: "#ef4444", fontWeight: "600", fontSize: 14 },
});

// Auth Stack Component
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="OTP" component={OTPScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen
        name="CompleteSocialSignup"
        component={CompleteSocialSignupScreen}
      />
    </Stack.Navigator>
  );
}

// Wrapper that shows onboarding before provider tabs
function ProviderWithOnboarding() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProviderOnboarding" component={ProviderOnboardingScreen} />
      <Stack.Screen name="ProviderMain" component={ProviderNavigator} />
      <Stack.Screen name="OnboardingServices" component={ProviderServicesScreen} />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const { user, isAuthenticated, loading, hasCompletedOnboarding, logout } = useAuth();

  // Determine which navigator to show based on user role
  const isProvider = user?.role === "PROVIDER";

  if (loading) {
    return null; // Or a loading screen
  }

  // When authenticated, show the appropriate navigator directly
  if (isAuthenticated) {
    if (isProvider) {
      // Show onboarding for new providers who haven't completed it
      if (!hasCompletedOnboarding) {
        return (
          <ProviderErrorBoundary onLogout={logout}>
            <ProviderWithOnboarding />
          </ProviderErrorBoundary>
        );
      }
      return (
        <ProviderErrorBoundary onLogout={logout}>
          <ProviderNavigator />
        </ProviderErrorBoundary>
      );
    }
    return <CustomerNavigator />;
  }

  // When not authenticated, show auth stack
  return <AuthStack />;
}
