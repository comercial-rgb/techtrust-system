/**
 * Push Notifications Service
 * Registers for Expo push notifications and saves the token to the backend.
 * Must be called once after the user is authenticated.
 */

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import api from "./api";
import { log } from "../utils/logger";

// Configure foreground notification behaviour
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  // Push tokens only work on physical devices
  if (!Device.isDevice) return null;

  // Android: create a default channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("sos", {
      name: "Roadside SOS",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#dc2626",
      sound: "default",
    });
    await Notifications.setNotificationChannelAsync("default", {
      name: "General",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  // Request permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    log.debug("[Push] Permission not granted");
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: "8aadadd9-dd3c-4b9a-8f3e-2a4278e4043a",
    });
    const token = tokenData.data;
    log.debug("[Push] Expo push token:", token);

    // Save token to backend (re-uses existing fcmToken column)
    await api.post("/users/me/fcm-token", { fcmToken: token });
    return token;
  } catch (e) {
    log.warn("[Push] Failed to get/save push token:", e);
    return null;
  }
}
