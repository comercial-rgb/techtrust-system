import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';

// Landing Screen (Initial entry point)
import LandingScreen from '../screens/LandingScreen';

// Auth Screens (shared)
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import OTPScreen from '../screens/OTPScreen';

// Navigators
import CustomerNavigator from './CustomerNavigator';
import ProviderNavigator from './ProviderNavigator';

const Stack = createNativeStackNavigator();

// Auth Stack Component
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="OTP" component={OTPScreen} />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const { user, isAuthenticated, loading } = useAuth();

  // Determine which navigator to show based on user role
  const isProvider = user?.role === 'PROVIDER';

  if (loading) {
    return null; // Or a loading screen
  }

  // When authenticated, show the appropriate navigator directly
  // The tab navigator will handle all navigation including Landing
  if (isAuthenticated) {
    if (isProvider) {
      return <ProviderNavigator />;
    }
    return <CustomerNavigator />;
  }

  // When not authenticated, show auth stack
  return <AuthStack />;
}
