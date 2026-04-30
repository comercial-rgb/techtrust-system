/**
 * SOS Re-broadcast Service
 * Every 5 minutes: finds active BROADCAST SOS requests and re-sends push
 * notifications to nearby ONLINE providers who haven't seen it yet.
 * Also detects expired requests (>30min) and marks them as NO_PROVIDER_FOUND.
 */

import { prisma } from "../config/database";
import { broadcastPush } from "./expo-push.service";
import { calculateHaversineDistance } from "../utils/distance";
import { logger } from "../config/logger";

const REBROADCAST_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const BROADCAST_EXPIRE_MINUTES = 30;
const BROADCAST_RADIUS_KM = 50;

export function scheduleSOSRebroadcast(): void {
  setInterval(runRebroadcast, REBROADCAST_INTERVAL_MS);
  logger.info("🚨 SOS re-broadcast scheduler: Ativo (every 5min)");
}

async function runRebroadcast(): Promise<void> {
  try {
    // 1. Expire stale BROADCAST requests (> 30 min with no acceptance)
    await prisma.$executeRawUnsafe(`
      UPDATE "service_requests"
      SET "sosStatus" = 'NO_PROVIDER_FOUND',
          "status"    = 'CANCELLED',
          "updatedAt" = NOW()
      WHERE "serviceType" = 'ROADSIDE_SOS'
        AND "sosStatus" = 'BROADCAST'
        AND "createdAt" < NOW() - INTERVAL '${BROADCAST_EXPIRE_MINUTES} minutes'
    `);

    // 2. Find still-active BROADCAST SOS requests
    const activeSOS = await prisma.$queryRaw<any[]>`
      SELECT "id", "rawServiceType", "serviceLatitude", "serviceLongitude",
             "requestNumber", "createdAt"
      FROM "service_requests"
      WHERE "serviceType" = 'ROADSIDE_SOS'
        AND "sosStatus" = 'BROADCAST'
        AND "serviceLatitude" IS NOT NULL
      LIMIT 50
    `;

    if (!activeSOS.length) return;

    // 3. Fetch all ONLINE providers with push tokens
    const onlineProviders = await prisma.$queryRaw<any[]>`
      SELECT pp."userId", pp."baseLatitude", pp."baseLongitude",
             u."fcmToken"
      FROM "provider_profiles" pp
      JOIN "users" u ON u."id" = pp."userId"
      WHERE pp."availabilityStatus" = 'ONLINE'
        AND u."fcmToken" IS NOT NULL
        AND pp."baseLatitude" IS NOT NULL
    `;

    if (!onlineProviders.length) return;

    // 4. For each active SOS, push to nearby providers
    for (const sos of activeSOS) {
      const sosLat = Number(sos.serviceLatitude);
      const sosLng = Number(sos.serviceLongitude);
      const sosType = sos.rawServiceType as string;

      const nearbyTokens = onlineProviders
        .filter((p) => {
          const distKm = calculateHaversineDistance(
            Number(p.baseLatitude), Number(p.baseLongitude),
            sosLat, sosLng,
          );
          return distKm <= BROADCAST_RADIUS_KM;
        })
        .map((p) => p.fcmToken as string);

      if (!nearbyTokens.length) continue;

      const elapsedMin = Math.floor(
        (Date.now() - new Date(sos.createdAt).getTime()) / 60000
      );

      await broadcastPush(
        nearbyTokens,
        "🚨 SOS Still Active — Help Needed",
        `${sosType.replace(/_/g, " ")} request · ${elapsedMin} min waiting · Tap to respond`,
        { screen: "SOSInbox", requestId: sos.id },
        "sos",
      );

      logger.info(
        `[SOSRebroadcast] ${sos.requestNumber} → ${nearbyTokens.length} provider(s) re-notified`
      );
    }
  } catch (err) {
    logger.error("[SOSRebroadcast] Error:", err);
  }
}
