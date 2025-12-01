/**
 * App Principal - TechTrust Mobile
 * Navegação simplificada usando RootNavigator
 */
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { I18nProvider } from './src/i18n';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <PaperProvider>
          <AuthProvider>
            <NavigationContainer>
              <StatusBar style="auto" />
              <RootNavigator />
            </NavigationContainer>
          </AuthProvider>
        </PaperProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
