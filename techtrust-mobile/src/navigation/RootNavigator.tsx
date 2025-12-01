import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';

// Auth Screens (shared)
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import OTPScreen from '../screens/OTPScreen';

// Navigators
import CustomerNavigator from './CustomerNavigator';
import ProviderNavigator from './ProviderNavigator';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, isAuthenticated, loading } = useAuth();

  // Determine which navigator to show based on user role
  const isProvider = user?.role === 'PROVIDER';

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        // Auth Stack - shown when not logged in
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="OTP" component={OTPScreen} />
        </>
      ) : isProvider ? (
        // Provider Stack - shown when logged in as provider
        <Stack.Screen name="ProviderMain" component={ProviderNavigator} />
      ) : (
        // Customer Stack - shown when logged in as customer
        <Stack.Screen name="CustomerMain" component={CustomerNavigator} />
      )}
    </Stack.Navigator>
  );
}
