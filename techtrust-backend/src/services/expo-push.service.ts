/**
 * Expo Push Notification Service
 * Sends push notifications to Expo-registered devices via the Expo Push API.
 * No SDK needed — pure HTTP POST.
 */

import { logger } from "../config/logger";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const BATCH_SIZE = 100; // Expo allows up to 100 per request

export interface PushMessage {
  to: string;        // ExponentPushToken[xxx]
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: "default" | null;
  priority?: "default" | "normal" | "high";
  channelId?: string;
  badge?: number;
}

export async function sendExpoPush(messages: PushMessage[]): Promise<void> {
  if (!messages.length) return;

  // Filter valid Expo tokens only
  const valid = messages.filter(
    (m) => m.to && (m.to.startsWith("ExponentPushToken[") || m.to.startsWith("ExpoPushToken["))
  );
  if (!valid.length) return;

  // Send in batches of 100
  for (let i = 0; i < valid.length; i += BATCH_SIZE) {
    const batch = valid.slice(i, i + BATCH_SIZE);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(batch),
      });

      if (!res.ok) {
        const text = await res.text();
        logger.warn(`[ExpoPush] Batch ${i / BATCH_SIZE + 1} failed: ${res.status} ${text}`);
      } else {
        const json = await res.json() as { data: { status: string; id?: string; details?: any }[] };
        const failures = json.data?.filter((r) => r.status !== "ok") ?? [];
        if (failures.length) {
          logger.warn(`[ExpoPush] ${failures.length} ticket(s) failed:`, failures);
        } else {
          logger.info(`[ExpoPush] Sent ${batch.length} notification(s) successfully`);
        }
      }
    } catch (err) {
      logger.error("[ExpoPush] Network error sending push batch:", err);
    }
  }
}

// Convenience: send same notification to many tokens
export async function broadcastPush(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, any>,
  channelId = "default",
): Promise<void> {
  const messages: PushMessage[] = tokens.map((token) => ({
    to: token,
    title,
    body,
    data,
    sound: "default",
    priority: "high",
    channelId,
  }));
  await sendExpoPush(messages);
}
