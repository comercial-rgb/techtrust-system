import React from "react";
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
  const { user, isAuthenticated, loading, hasCompletedOnboarding } = useAuth();

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
        return <ProviderWithOnboarding />;
      }
      return <ProviderNavigator />;
    }
    return <CustomerNavigator />;
  }

  // When not authenticated, show auth stack
  return <AuthStack />;
}
