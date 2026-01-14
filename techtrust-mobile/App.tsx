/**
 * App Principal - TechTrust Mobile
 * Navegação simplificada usando RootNavigator
 * Com Splash Screen animada
 */
import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { NotificationsProvider } from './src/contexts/NotificationsContext';
import { I18nProvider } from './src/i18n';
import RootNavigator from './src/navigation/RootNavigator';
import SplashScreen from './src/components/SplashScreen';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return (
      <>
        <StatusBar style="light" />
        <SplashScreen onFinish={() => setShowSplash(false)} />
      </>
    );
  }

  return (
    <SafeAreaProvider>
      <I18nProvider>
        <PaperProvider>
          <AuthProvider>
            <NotificationsProvider>
              <NavigationContainer>
                <StatusBar style="auto" />
                <RootNavigator />
              </NavigationContainer>
            </NotificationsProvider>
          </AuthProvider>
        </PaperProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
