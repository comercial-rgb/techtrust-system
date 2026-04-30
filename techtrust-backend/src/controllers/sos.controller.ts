/**
 * SOS Controller — Roadside Assistance real-time dispatch
 *
 * Flow:
 *   Customer: POST /sos/request → GET /sos/request/:id/status (poll)
 *             → POST /sos/request/:id/confirm | /decline
 *   Provider: GET /providers/sos/nearby → POST /providers/sos/:id/accept
 *
 * Pricing model: provider pre-configures sosRateCard per service type.
 * If rate card empty for type → provider enters price on accept.
 * Customer sees price BEFORE confirming (30-second window).
 */

import { Request, Response } from "express";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error-handler";
import { logger } from "../config/logger";
import { calculateHaversineDistance } from "../utils/distance";
import { broadcastPush } from "../services/expo-push.service";

// ─── Constants ───────────────────────────────────────────────────────────────

export const SOS_TYPES = {
  JUMP_START:      { label: "Jump Start",            towing: false },
  FLAT_TIRE:       { label: "Flat Tire Change",       towing: false },
  FUEL_DELIVERY:   { label: "Fuel Delivery",          towing: false },
  LOCKOUT:         { label: "Vehicle Lockout",        towing: false },
  TOWING:          { label: "Towing",                 towing: true  },
  BATTERY_REPLACE: { label: "Battery Replacement",   towing: false },
} as const;

export type SOSType = keyof typeof SOS_TYPES;

// Max radius (km) to search for nearby SOS providers
const SOS_BROADCAST_RADIUS_KM = 50;

// Seconds customer has to confirm after provider accepts
const SOS_CONFIRM_WINDOW_SECONDS = 120;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getRateCardPrice(
  rateCard: Record<string, any>,
  sosType: string,
): number | null {
  const entry = rateCard?.[sosType];
  if (!entry || !entry.active) return null;
  if (sosType === "TOWING") return entry.baseFee ?? null;
  return entry.price ?? null;
}

function isBroadcastExpired(createdAt: Date): boolean {
  const maxBroadcastMs = 30 * 60 * 1000; // 30 minutes
  return Date.now() - createdAt.getTime() > maxBroadcastMs;
}

function isConfirmExpired(deadline: Date): boolean {
  return Date.now() > new Date(deadline).getTime();
}

// ─── Customer: Create SOS Request ────────────────────────────────────────────

export const createSOSRequest = async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const { sosType, customerLat, customerLng, vehicleId, description } = req.body;

  if (!SOS_TYPES[sosType as SOSType]) {
    throw new AppError(
      `Invalid SOS type. Valid: ${Object.keys(SOS_TYPES).join(", ")}`,
      400,
      "INVALID_SOS_TYPE",
    );
  }
  if (!customerLat || !customerLng) {
    throw new AppError("GPS location is required for roadside assistance", 400, "LOCATION_REQUIRED");
  }
  if (!vehicleId) {
    throw new AppError("Vehicle is required", 400, "VEHICLE_REQUIRED");
  }

  const lat = Number(customerLat);
  const lng = Number(customerLng);
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new AppError("Invalid GPS coordinates", 400, "INVALID_COORDINATES");
  }

  // Verify vehicle belongs to customer
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, userId: customerId },
    select: { id: true, make: true, model: true, year: true },
  });
  if (!vehicle) {
    throw new AppError("Vehicle not found", 404, "VEHICLE_NOT_FOUND");
  }

  // Cancel any existing active SOS for this customer
  await prisma.$executeRawUnsafe(`
    UPDATE "service_requests"
    SET "sosStatus" = 'CANCELLED'
    WHERE "userId" = $1
      AND "serviceType" = 'ROADSIDE_SOS'
      AND "sosStatus" IN ('BROADCAST', 'PENDING_CONFIRM')
  `, customerId);

  const requestNumber = `SOS-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const sosLabel = SOS_TYPES[sosType as SOSType].label;

  // Create the service request (raw SQL — bypasses stale Prisma client)
  const rows = await prisma.$queryRaw<any[]>`
    INSERT INTO "service_requests" (
      "id", "requestNumber", "userId", "vehicleId",
      "serviceType", "rawServiceType", "title", "description",
      "serviceLocationType", "locationType",
      "serviceLatitude", "serviceLongitude",
      "isUrgent", "status", "quotesCount", "maxQuotes",
      "sosStatus",
      "attachments",
      "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid(),
      ${requestNumber},
      ${customerId},
      ${vehicleId},
      'ROADSIDE_SOS',
      ${sosType},
      ${`Roadside SOS — ${sosLabel}`},
      ${description || null},
      'ROADSIDE',
      'ROADSIDE',
      ${lat},
      ${lng},
      true,
      'SEARCHING_PROVIDERS',
      0,
      1,
      'BROADCAST',
      '[]',
      NOW(), NOW()
    )
    RETURNING *
  `;

  const request = rows[0];

  // Build price estimate from nearby online providers
  const estimatedRange = await buildPriceEstimate(lat, lng, sosType);

  // Fire-and-forget: push to nearby ONLINE providers immediately
  notifyNearbyProviders(lat, lng, sosType, request.id, requestNumber).catch(
    (e) => logger.warn("[SOS] Push notification fire failed:", e),
  );

  logger.info(`SOS created: ${requestNumber} type=${sosType} by customer ${customerId}`);

  res.status(201).json({
    success: true,
    data: {
      requestId: request.id,
      requestNumber: request.requestNumber,
      sosType,
      sosLabel,
      customerLat: lat,
      customerLng: lng,
      sosStatus: "BROADCAST",
      estimatedPriceRange: estimatedRange,
    },
  });
};

// ─── Customer: Poll SOS Status ────────────────────────────────────────────────

export const getSOSStatus = async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const { requestId } = req.params;

  const rows = await prisma.$queryRaw<any[]>`
    SELECT sr.*,
           pp."businessName", pp."baseLatitude", pp."baseLongitude",
           u."fullName" as "providerFullName"
    FROM "service_requests" sr
    LEFT JOIN "provider_profiles" pp ON pp."userId" = sr."sosAcceptedByProviderId"
    LEFT JOIN "users" u ON u."id" = sr."sosAcceptedByProviderId"
    WHERE sr."id" = ${requestId}
      AND sr."userId" = ${customerId}
      AND sr."serviceType" = 'ROADSIDE_SOS'
    LIMIT 1
  `;

  if (!rows.length) throw new AppError("SOS request not found", 404, "NOT_FOUND");

  const r = rows[0];

  // Auto-release if confirm window expired
  if (r.sosStatus === "PENDING_CONFIRM" && r.sosConfirmDeadline && isConfirmExpired(r.sosConfirmDeadline)) {
    await prisma.$executeRawUnsafe(`
      UPDATE "service_requests"
      SET "sosStatus" = 'BROADCAST',
          "sosAcceptedByProviderId" = NULL,
          "sosOfferedPrice" = NULL,
          "sosAcceptedAt" = NULL,
          "sosConfirmDeadline" = NULL,
          "updatedAt" = NOW()
      WHERE "id" = $1
    `, requestId);
    r.sosStatus = "BROADCAST";
    r.sosAcceptedByProviderId = null;
    r.sosOfferedPrice = null;
    r.sosConfirmDeadline = null;
  }

  const provider = r.sosAcceptedByProviderId
    ? {
        id: r.sosAcceptedByProviderId,
        name: r.businessName || r.providerFullName || "Provider",
        lat: r.baseLatitude ? Number(r.baseLatitude) : null,
        lng: r.baseLongitude ? Number(r.baseLongitude) : null,
      }
    : null;

  // ETA estimate (rough) if provider location known
  let etaMinutes: number | null = null;
  if (provider?.lat && provider?.lng && r.serviceLatitude && r.serviceLongitude) {
    const distKm = calculateHaversineDistance(
      provider.lat, provider.lng,
      Number(r.serviceLatitude), Number(r.serviceLongitude),
    );
    etaMinutes = Math.round((distKm / 40) * 60); // assume 40km/h
  }

  res.json({
    success: true,
    data: {
      requestId: r.id,
      sosStatus: r.sosStatus,
      sosType: r.rawServiceType,
      offeredPrice: r.sosOfferedPrice ? Number(r.sosOfferedPrice) : null,
      confirmDeadline: r.sosConfirmDeadline,
      provider,
      etaMinutes,
      broadcastExpired: r.sosStatus === "BROADCAST" && isBroadcastExpired(new Date(r.createdAt)),
    },
  });
};

// ─── Customer: Confirm Provider ───────────────────────────────────────────────

export const confirmSOSAccept = async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const { requestId } = req.params;

  const rows = await prisma.$queryRaw<any[]>`
    SELECT * FROM "service_requests"
    WHERE "id" = ${requestId} AND "userId" = ${customerId}
    LIMIT 1
  `;
  if (!rows.length) throw new AppError("SOS request not found", 404, "NOT_FOUND");

  const r = rows[0];
  if (r.sosStatus !== "PENDING_CONFIRM") {
    throw new AppError("No pending provider acceptance to confirm", 400, "WRONG_STATUS");
  }
  if (isConfirmExpired(r.sosConfirmDeadline)) {
    throw new AppError("Confirmation window expired. Searching for next available provider.", 400, "WINDOW_EXPIRED");
  }

  await prisma.$executeRawUnsafe(`
    UPDATE "service_requests"
    SET "sosStatus" = 'CONFIRMED',
        "sosConfirmedAt" = NOW(),
        "status" = 'ACCEPTED',
        "acceptedQuoteId" = NULL,
        "updatedAt" = NOW()
    WHERE "id" = $1
  `, requestId);

  logger.info(`SOS confirmed: ${r.requestNumber} → provider ${r.sosAcceptedByProviderId}`);

  res.json({
    success: true,
    data: {
      sosStatus: "CONFIRMED",
      providerId: r.sosAcceptedByProviderId,
      offeredPrice: Number(r.sosOfferedPrice),
    },
  });
};

// ─── Customer: Decline Provider ───────────────────────────────────────────────

export const declineSOSAccept = async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const { requestId } = req.params;

  const rows = await prisma.$queryRaw<any[]>`
    SELECT * FROM "service_requests"
    WHERE "id" = ${requestId} AND "userId" = ${customerId}
    LIMIT 1
  `;
  if (!rows.length) throw new AppError("SOS request not found", 404, "NOT_FOUND");

  const r = rows[0];
  if (r.sosStatus !== "PENDING_CONFIRM") {
    throw new AppError("Nothing to decline", 400, "WRONG_STATUS");
  }

  await prisma.$executeRawUnsafe(`
    UPDATE "service_requests"
    SET "sosStatus" = 'BROADCAST',
        "sosAcceptedByProviderId" = NULL,
        "sosOfferedPrice" = NULL,
        "sosAcceptedAt" = NULL,
        "sosConfirmDeadline" = NULL,
        "updatedAt" = NOW()
    WHERE "id" = $1
  `, requestId);

  res.json({ success: true, data: { sosStatus: "BROADCAST" } });
};

// ─── Customer: Cancel SOS ────────────────────────────────────────────────────

export const cancelSOSRequest = async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const { requestId } = req.params;

  const rows = await prisma.$queryRaw<any[]>`
    SELECT * FROM "service_requests"
    WHERE "id" = ${requestId} AND "userId" = ${customerId}
    LIMIT 1
  `;
  if (!rows.length) throw new AppError("SOS request not found", 404, "NOT_FOUND");

  const r = rows[0];
  if (r.sosStatus === "CONFIRMED") {
    throw new AppError("Cannot cancel — provider is already dispatched. Contact support.", 409, "ALREADY_DISPATCHED");
  }

  await prisma.$executeRawUnsafe(`
    UPDATE "service_requests"
    SET "sosStatus" = 'CANCELLED',
        "status" = 'CANCELLED',
        "cancelledAt" = NOW(),
        "updatedAt" = NOW()
    WHERE "id" = $1
  `, requestId);

  res.json({ success: true });
};

// ─── Provider: Get Nearby SOS Requests ───────────────────────────────────────

export const getNearbySOSRequests = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    throw new AppError("lat and lng query params are required", 400, "LOCATION_REQUIRED");
  }

  const providerLat = Number(lat);
  const providerLng = Number(lng);

  // Get provider profile to check they're ONLINE and have roadside enabled
  const providerRows = await prisma.$queryRaw<any[]>`
    SELECT "availabilityStatus", "roadsideAssistance", "sosRateCard",
           "baseLatitude", "baseLongitude"
    FROM "provider_profiles"
    WHERE "userId" = ${providerId}
    LIMIT 1
  `;

  if (!providerRows.length) throw new AppError("Provider profile not found", 404, "NOT_FOUND");
  const pProfile = providerRows[0];

  if (pProfile.availabilityStatus !== "ONLINE") {
    return res.json({ success: true, data: { requests: [] }, message: "You are currently offline." });
  }

  // Fetch active BROADCAST SOS requests
  const requests = await prisma.$queryRaw<any[]>`
    SELECT sr."id", sr."requestNumber", sr."rawServiceType",
           sr."serviceLatitude", sr."serviceLongitude",
           sr."createdAt", sr."description",
           v."make", v."model", v."year",
           u."fullName" as "customerName"
    FROM "service_requests" sr
    JOIN "vehicles" v ON v."id" = sr."vehicleId"
    JOIN "users" u ON u."id" = sr."userId"
    WHERE sr."serviceType" = 'ROADSIDE_SOS'
      AND sr."sosStatus" = 'BROADCAST'
      AND sr."serviceLatitude" IS NOT NULL
      AND sr."serviceLongitude" IS NOT NULL
      AND sr."createdAt" > NOW() - INTERVAL '30 minutes'
    ORDER BY sr."createdAt" DESC
    LIMIT 50
  `;

  const rateCard: Record<string, any> = (pProfile.sosRateCard as any) || {};

  // Filter by radius and enrich with distance + suggested price
  const nearby = requests
    .map((r) => {
      const reqLat = Number(r.serviceLatitude);
      const reqLng = Number(r.serviceLongitude);
      const distKm = calculateHaversineDistance(providerLat, providerLng, reqLat, reqLng);
      const distMiles = distKm * 0.621371;
      const etaMinutes = Math.round((distKm / 40) * 60);

      const sosType = r.rawServiceType as string;
      const suggestedPrice = getRateCardPrice(rateCard, sosType);

      // For towing: estimate based on base fee + distance from provider to customer
      let towingEstimate: number | null = null;
      if (sosType === "TOWING" && rateCard.TOWING?.active) {
        const base = rateCard.TOWING.baseFee || 0;
        const perMile = rateCard.TOWING.perMileRate || 0;
        towingEstimate = base + distMiles * perMile;
      }

      const isTowing = sosType === "TOWING";
      return {
        id: r.id,
        requestNumber: r.requestNumber,
        sosType,
        sosLabel: SOS_TYPES[sosType as SOSType]?.label || sosType,
        vehicleDescription: `${r.year} ${r.make} ${r.model}`,
        customerName: r.customerName,
        description: r.description,
        distanceKm: Math.round(distKm * 10) / 10,
        distanceMiles: Math.round(distMiles * 10) / 10,
        estimatedEtaMinutes: etaMinutes,
        pricingType: isTowing ? "towing" : "flat",
        suggestedPrice: isTowing ? null : suggestedPrice,
        suggestedBaseFee: isTowing ? (rateCard.TOWING?.baseFee ?? null) : null,
        suggestedPerMileRate: isTowing ? (rateCard.TOWING?.perMileRate ?? null) : null,
        createdAt: r.createdAt,
        customerLat: reqLat,
        customerLng: reqLng,
      };
    })
    .filter((r) => r.distanceKm <= SOS_BROADCAST_RADIUS_KM)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  res.json({ success: true, data: { requests: nearby } });
};

// ─── Provider: Accept SOS Request ────────────────────────────────────────────

export const acceptSOSRequest = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const { requestId } = req.params;
  const { offeredPrice } = req.body;

  if (offeredPrice === undefined || offeredPrice === null || Number(offeredPrice) <= 0) {
    throw new AppError("offeredPrice is required and must be greater than 0", 400, "PRICE_REQUIRED");
  }

  // Check provider is ONLINE
  const provRows = await prisma.$queryRaw<any[]>`
    SELECT "availabilityStatus" FROM "provider_profiles" WHERE "userId" = ${providerId} LIMIT 1
  `;
  if (!provRows.length || provRows[0].availabilityStatus !== "ONLINE") {
    throw new AppError("You must be online to accept SOS requests", 400, "PROVIDER_OFFLINE");
  }

  // Get and lock the request
  const reqRows = await prisma.$queryRaw<any[]>`
    SELECT * FROM "service_requests"
    WHERE "id" = ${requestId}
      AND "serviceType" = 'ROADSIDE_SOS'
    LIMIT 1
  `;
  if (!reqRows.length) throw new AppError("SOS request not found", 404, "NOT_FOUND");

  const r = reqRows[0];

  if (r.sosStatus === "CONFIRMED") {
    throw new AppError("This SOS has already been confirmed by the customer", 409, "ALREADY_CONFIRMED");
  }

  if (r.sosStatus === "CANCELLED") {
    throw new AppError("This SOS request has been cancelled", 409, "CANCELLED");
  }

  // If PENDING_CONFIRM by another provider, check if window expired
  if (r.sosStatus === "PENDING_CONFIRM") {
    if (!isConfirmExpired(r.sosConfirmDeadline)) {
      throw new AppError("Another provider is waiting for customer confirmation. Try again shortly.", 409, "PENDING_OTHER_PROVIDER");
    }
    // Window expired — take over
  }

  const confirmDeadline = new Date(Date.now() + SOS_CONFIRM_WINDOW_SECONDS * 1000);

  await prisma.$executeRawUnsafe(`
    UPDATE "service_requests"
    SET "sosStatus" = 'PENDING_CONFIRM',
        "sosAcceptedByProviderId" = $2,
        "sosOfferedPrice" = $3,
        "sosAcceptedAt" = NOW(),
        "sosConfirmDeadline" = $4,
        "updatedAt" = NOW()
    WHERE "id" = $1
  `, requestId, providerId, Number(offeredPrice), confirmDeadline.toISOString());

  logger.info(`SOS accepted: ${r.requestNumber} by provider ${providerId} at $${offeredPrice}`);

  res.json({
    success: true,
    data: {
      sosStatus: "PENDING_CONFIRM",
      requestId,
      offeredPrice: Number(offeredPrice),
      confirmDeadline,
      confirmWindowSeconds: SOS_CONFIRM_WINDOW_SECONDS,
      message: `Customer has ${SOS_CONFIRM_WINDOW_SECONDS / 60} minutes to confirm. Stay ready.`,
    },
  });
};

// ─── Provider: Availability Toggle ───────────────────────────────────────────

export const updateAvailability = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const { status } = req.body;

  const validStatuses = ["ONLINE", "OFFLINE", "BUSY"];
  if (!validStatuses.includes(status)) {
    throw new AppError(`status must be one of: ${validStatuses.join(", ")}`, 400, "INVALID_STATUS");
  }

  // Ensure profile row exists
  await prisma.$executeRawUnsafe(`
    INSERT INTO "provider_profiles" ("id", "userId", "updatedAt")
    VALUES (gen_random_uuid(), $1, NOW())
    ON CONFLICT ("userId") DO NOTHING
  `, providerId);

  await prisma.$executeRawUnsafe(`
    UPDATE "provider_profiles"
    SET "availabilityStatus" = $2,
        ${status === "ONLINE" ? '"lastOnlineAt" = NOW(),' : ""}
        "updatedAt" = NOW()
    WHERE "userId" = $1
  `, providerId, status);

  res.json({ success: true, data: { availabilityStatus: status } });
};

// ─── Provider: SOS Rate Card ──────────────────────────────────────────────────

export const getSOSRateCard = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const rows = await prisma.$queryRaw<any[]>`
    SELECT "sosRateCard", "availabilityStatus"
    FROM "provider_profiles"
    WHERE "userId" = ${providerId}
    LIMIT 1
  `;

  const rateCard = rows[0]?.sosRateCard || {};
  const availabilityStatus = rows[0]?.availabilityStatus || "OFFLINE";

  // Merge with defaults so client always sees all types
  const merged: Record<string, any> = {};
  for (const type of Object.keys(SOS_TYPES)) {
    merged[type] = rateCard[type] ?? (type === "TOWING"
      ? { baseFee: null, perMileRate: null, active: false }
      : { price: null, active: false });
  }

  res.json({ success: true, data: { rateCard: merged, availabilityStatus } });
};

export const updateSOSRateCard = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const { rateCard } = req.body;

  if (!rateCard || typeof rateCard !== "object") {
    throw new AppError("rateCard object is required", 400, "INVALID_BODY");
  }

  // Validate entries
  const sanitized: Record<string, any> = {};
  for (const [type, entry] of Object.entries(rateCard)) {
    if (!SOS_TYPES[type as SOSType]) continue;
    const e = entry as any;
    if (type === "TOWING") {
      sanitized[type] = {
        baseFee: e.baseFee != null ? Number(e.baseFee) : null,
        perMileRate: e.perMileRate != null ? Number(e.perMileRate) : null,
        active: !!e.active,
      };
    } else {
      sanitized[type] = {
        price: e.price != null ? Number(e.price) : null,
        active: !!e.active,
      };
    }
  }

  const json = JSON.stringify(sanitized);
  await prisma.$executeRawUnsafe(`
    UPDATE "provider_profiles"
    SET "sosRateCard" = $2::jsonb, "updatedAt" = NOW()
    WHERE "userId" = $1
  `, providerId, json);

  res.json({ success: true, data: { rateCard: sanitized } });
};

// ─── Internal: Push nearby ONLINE providers ───────────────────────────────────

async function notifyNearbyProviders(
  lat: number,
  lng: number,
  sosType: string,
  requestId: string,
  requestNumber: string,
): Promise<void> {
  const providers = await prisma.$queryRaw<any[]>`
    SELECT pp."baseLatitude", pp."baseLongitude", u."fcmToken"
    FROM "provider_profiles" pp
    JOIN "users" u ON u."id" = pp."userId"
    WHERE pp."availabilityStatus" = 'ONLINE'
      AND u."fcmToken" IS NOT NULL
      AND pp."baseLatitude" IS NOT NULL
    LIMIT 200
  `;

  const tokens = providers
    .filter((p) => {
      const distKm = calculateHaversineDistance(
        Number(p.baseLatitude), Number(p.baseLongitude), lat, lng,
      );
      return distKm <= SOS_BROADCAST_RADIUS_KM;
    })
    .map((p) => p.fcmToken as string);

  if (!tokens.length) return;

  const label = SOS_TYPES[sosType as SOSType]?.label || sosType;
  await broadcastPush(
    tokens,
    "🚨 New SOS Request Nearby",
    `${label} — a customer needs help near you. Tap to respond.`,
    { screen: "SOSInbox", requestId },
    "sos",
  );

  logger.info(`[SOS] Push sent to ${tokens.length} provider(s) for ${requestNumber}`);
}

// ─── Internal: Price Estimate ─────────────────────────────────────────────────

async function buildPriceEstimate(
  lat: number,
  lng: number,
  sosType: string,
): Promise<{ min: number | null; max: number | null; count: number }> {
  try {
    const onlineProviders = await prisma.$queryRaw<any[]>`
      SELECT "sosRateCard", "baseLatitude", "baseLongitude"
      FROM "provider_profiles"
      WHERE "availabilityStatus" = 'ONLINE'
        AND "baseLatitude" IS NOT NULL
        AND "sosRateCard" != '{}'::jsonb
      LIMIT 200
    `;

    const prices: number[] = [];

    for (const p of onlineProviders) {
      const pLat = Number(p.baseLatitude);
      const pLng = Number(p.baseLongitude);
      const distKm = calculateHaversineDistance(pLat, pLng, lat, lng);
      if (distKm > SOS_BROADCAST_RADIUS_KM) continue;

      const rc = (p.sosRateCard as Record<string, any>) || {};
      const price = getRateCardPrice(rc, sosType);
      if (price !== null) prices.push(price);
    }

    if (!prices.length) return { min: null, max: null, count: 0 };

    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      count: prices.length,
    };
  } catch {
    return { min: null, max: null, count: 0 };
  }
}
