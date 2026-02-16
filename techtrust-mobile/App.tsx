/**
 * App Principal - TechTrust Mobile
 * Navegação simplificada usando RootNavigator
 * Com Splash Screen animada
 */
import React, { useState, useEffect, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { Provider as PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StripeProvider } from "@stripe/stripe-react-native";
import { Alert, AppState, Platform } from "react-native";
import * as Updates from "expo-updates";
import { AuthProvider } from "./src/contexts/AuthContext";
import { ThemeProvider } from "./src/contexts/ThemeContext";
import { NotificationsProvider } from "./src/contexts/NotificationsContext";
import { I18nProvider } from "./src/i18n";
import RootNavigator from "./src/navigation/RootNavigator";
import SplashScreen from "./src/components/SplashScreen";
import { API_URL } from "./src/config/api";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [stripePublishableKey, setStripePublishableKey] = useState<
    string | null
  >(null);
  const appIsReady = useRef(false);

  // Fetch Stripe publishable key from backend
  useEffect(() => {
    async function fetchStripeConfig() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(
          "https://techtrust-api.onrender.com/api/v1/config/stripe",
          { signal: controller.signal },
        );
        clearTimeout(timeout);
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

  // 🔄 OTA Updates — safe check that won't crash iOS on first launch
  useEffect(() => {
    let isMounted = true;

    async function checkForUpdates() {
      // Skip in dev mode
      if (__DEV__) return;

      try {
        // Wait for app to be fully ready before checking updates
        // This prevents crashes on iOS first launch
        if (!appIsReady.current) {
          console.log("🔄 [OTA] Waiting for app to be ready...");
          return;
        }

        console.log("🔄 [OTA] Checking for updates...");
        console.log("🔄 [OTA] Current update ID:", Updates.updateId);
        console.log("🔄 [OTA] Channel:", Updates.channel);

        const update = await Updates.checkForUpdateAsync();

        if (!isMounted) return;

        if (update.isAvailable) {
          console.log("📦 [OTA] Update available! Downloading...");
          const fetchResult = await Updates.fetchUpdateAsync();
          console.log("📥 [OTA] Download complete, isNew:", fetchResult.isNew);

          if (fetchResult.isNew && isMounted) {
            // Give the app a moment to stabilize before reloading
            // This prevents the crash-on-first-launch issue
            setTimeout(async () => {
              try {
                await Updates.reloadAsync();
              } catch (reloadErr) {
                console.warn("⚠️ [OTA] Reload failed, will apply on next launch:", reloadErr);
              }
            }, 1500);
          }
        } else {
          console.log("✅ [OTA] App is up to date");
        }
      } catch (e) {
        // Silently fail — common on first launch or poor connectivity
        console.warn("⚠️ [OTA] Update check failed (non-fatal):", e instanceof Error ? e.message : e);
      }
    }

    // Delay initial check to let the app fully initialize
    // This is the key fix for iOS first-launch crash
    const initialDelay = setTimeout(() => {
      appIsReady.current = true;
      checkForUpdates();
    }, 5000);

    // Check periodically (every 2 minutes instead of 30s to reduce overhead)
    const interval = setInterval(checkForUpdates, 120000);

    // Also check when app comes back to foreground
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && appIsReady.current) {
        checkForUpdates();
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(initialDelay);
      clearInterval(interval);
      subscription.remove();
    };
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
        <ThemeProvider>
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
        </ThemeProvider>
      </StripeProvider>
    </SafeAreaProvider>
  );
}
