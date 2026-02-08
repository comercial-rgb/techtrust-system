/**
 * App Principal - TechTrust Mobile
 * Navegação simplificada usando RootNavigator
 * Com Splash Screen animada
 */
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Updates from 'expo-updates';
import { AuthProvider } from './src/contexts/AuthContext';
import { NotificationsProvider } from './src/contexts/NotificationsContext';
import { I18nProvider } from './src/i18n';
import RootNavigator from './src/navigation/RootNavigator';
import SplashScreen from './src/components/SplashScreen';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  // 🔄 Check for updates on app start
  useEffect(() => {
    async function checkForUpdates() {
      try {
        if (!__DEV__) {
          console.log('🔄 Checking for updates...');
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            console.log('📦 Update available! Downloading...');
            await Updates.fetchUpdateAsync();
            console.log('✅ Update downloaded! Will apply on next restart.');
          } else {
            console.log('✅ App is up to date');
          }
        }
      } catch (e) {
        console.error('❌ Error checking for updates:', e);
      }
    }
    checkForUpdates();
  }, []);

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
