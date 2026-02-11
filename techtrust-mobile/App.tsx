/**
 * App Principal - TechTrust Mobile
 * Navegação simplificada usando RootNavigator
 * Com Splash Screen animada
 */
import React, { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { Provider as PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StripeProvider } from "@stripe/stripe-react-native";
import * as Updates from "expo-updates";
import { AuthProvider } from "./src/contexts/AuthContext";
import { NotificationsProvider } from "./src/contexts/NotificationsContext";
import { I18nProvider } from "./src/i18n";
import RootNavigator from "./src/navigation/RootNavigator";
import SplashScreen from "./src/components/SplashScreen";
import { API_URL } from "./src/config/api";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [stripePublishableKey, setStripePublishableKey] = useState<string | null>(null);

  // Fetch Stripe publishable key from backend
  useEffect(() => {
    async function fetchStripeConfig() {
      try {
        const response = await fetch(
          "https://techtrust-api.onrender.com/api/v1/config/stripe"
        );
        const data = await response.json();
        if (data.success && data.data?.publishableKey) {
          setStripePublishableKey(data.data.publishableKey);
          console.log("💳 [Stripe] Publishable key loaded");
        }
      } catch (e) {
        console.warn("💳 [Stripe] Failed to fetch config:", e);
      }
    }
    fetchStripeConfig();
  }, []);

  // 🔄 Check for updates on app start AND periodically
  useEffect(() => {
    async function checkForUpdates() {
      try {
        if (!__DEV__) {
          console.log("🔄 [OTA] Checking for updates...");
          console.log("🔄 [OTA] Current update ID:", Updates.updateId);
          console.log("🔄 [OTA] Runtime version:", Updates.runtimeVersion);

          const update = await Updates.checkForUpdateAsync();
          console.log(
            "🔄 [OTA] Check result:",
            JSON.stringify(update, null, 2),
          );

          if (update.isAvailable) {
            console.log("📦 [OTA] Update available! Downloading...");
            const fetchResult = await Updates.fetchUpdateAsync();
            console.log(
              "📥 [OTA] Fetch result:",
              JSON.stringify(fetchResult, null, 2),
            );
            console.log("✅ [OTA] Update downloaded! Reloading app now...");
            // 🚀 IMPORTANT: Reload immediately to apply the update
            await Updates.reloadAsync();
          } else {
            console.log("✅ [OTA] App is up to date");
          }
        } else {
          console.log("⚠️ [OTA] Running in DEV mode - updates disabled");
        }
      } catch (e) {
        console.error("❌ [OTA] Error checking for updates:", e);
        if (e instanceof Error) {
          console.error("❌ [OTA] Error message:", e.message);
          console.error("❌ [OTA] Error stack:", e.stack);
        }
      }
    }

    // Check immediately on mount
    checkForUpdates();

    // Check every 30 seconds for updates
    const interval = setInterval(checkForUpdates, 30000);

    return () => clearInterval(interval);
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
      <StripeProvider
        publishableKey={stripePublishableKey || "pk_test_placeholder"}
        merchantIdentifier="merchant.com.techtrustautosolutions"
      >
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
      </StripeProvider>
    </SafeAreaProvider>
  );
}
