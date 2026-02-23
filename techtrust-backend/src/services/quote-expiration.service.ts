/**
 * ============================================
 * QUOTE & ESTIMATE SHARE EXPIRATION SERVICE
 * ============================================
 * Proactively expires quotes and estimate shares
 * that have passed their validity date.
 *
 * Runs every hour via setInterval (registered in server.ts).
 *
 * What it does:
 * 1. Finds PENDING quotes where validUntil < NOW() → marks as EXPIRED
 * 2. Finds active EstimateShares where expiresAt < NOW() → marks as inactive
 * 3. Finds SEARCHING_PROVIDERS service requests where expiresAt < NOW() → marks as EXPIRED
 * 4. Sends notifications to affected customers
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface QuoteExpirationResult {
  expiredQuotes: number;
  expiredShares: number;
  expiredRequests: number;
  notificationsSent: number;
}

/**
 * Check and expire all overdue quotes, estimate shares, and service requests
 */
export async function checkQuoteExpirations(): Promise<QuoteExpirationResult> {
  const now = new Date();
  const result: QuoteExpirationResult = {
    expiredQuotes: 0,
    expiredShares: 0,
    expiredRequests: 0,
    notificationsSent: 0,
  };

  // ─── 1. Expire overdue PENDING quotes ───
  const overdueQuotes = await prisma.quote.findMany({
    where: {
      status: "PENDING",
      validUntil: { lt: now },
    },
    select: {
      id: true,
      quoteNumber: true,
      serviceRequestId: true,
      providerId: true,
      serviceRequest: {
        select: {
          userId: true,
          title: true,
        },
      },
    },
  });

  if (overdueQuotes.length > 0) {
    // Batch update all to EXPIRED
    await prisma.quote.updateMany({
      where: {
        id: { in: overdueQuotes.map((q) => q.id) },
        status: "PENDING", // double-check to avoid race condition
      },
      data: {
        status: "EXPIRED",
        expiredAt: now,
      },
    });

    result.expiredQuotes = overdueQuotes.length;

    // Notify customers about expired quotes (deduplicated by serviceRequestId)
    const customerNotifications = new Map<
      string,
      { userId: string; requestTitle: string; count: number }
    >();
    for (const q of overdueQuotes) {
      const key = q.serviceRequestId;
      const existing = customerNotifications.get(key);
      if (existing) {
        existing.count++;
      } else {
        customerNotifications.set(key, {
          userId: q.serviceRequest.userId,
          requestTitle: q.serviceRequest.title,
          count: 1,
        });
      }
    }

    for (const [srId, info] of customerNotifications) {
      await prisma.notification.create({
        data: {
          userId: info.userId,
          type: "SYSTEM_ALERT",
          title: "Quote Expired",
          message: `${info.count} quote(s) for "${info.requestTitle}" have expired. You may request new quotes.`,
          data: JSON.stringify({ serviceRequestId: srId }),
        },
      });
      result.notificationsSent++;
    }

    // Also notify providers whose quotes expired
    for (const q of overdueQuotes) {
      await prisma.notification.create({
        data: {
          userId: q.providerId,
          type: "SYSTEM_ALERT",
          title: "Quote Expired",
          message: `Your quote ${q.quoteNumber} has expired.`,
          data: JSON.stringify({
            quoteId: q.id,
            serviceRequestId: q.serviceRequestId,
          }),
        },
      });
      result.notificationsSent++;
    }
  }

  // ─── 2. Expire overdue EstimateShares ───
  const overdueShares = await prisma.estimateShare.updateMany({
    where: {
      isActive: true,
      expiresAt: { lt: now },
    },
    data: {
      isActive: false,
      closedAt: now,
    },
  });
  result.expiredShares = overdueShares.count;

  // ─── 3. Expire overdue ServiceRequests with no accepted quote ───
  const overdueRequests = await prisma.serviceRequest.findMany({
    where: {
      status: { in: ["SEARCHING_PROVIDERS", "QUOTES_RECEIVED"] },
      expiresAt: { not: null, lt: now },
    },
    select: {
      id: true,
      requestNumber: true,
      userId: true,
      title: true,
    },
  });

  if (overdueRequests.length > 0) {
    await prisma.serviceRequest.updateMany({
      where: {
        id: { in: overdueRequests.map((r) => r.id) },
        status: { in: ["SEARCHING_PROVIDERS", "QUOTES_RECEIVED"] },
      },
      data: {
        status: "EXPIRED",
      },
    });

    result.expiredRequests = overdueRequests.length;

    // Notify customers — mention renewal option
    for (const req of overdueRequests) {
      await prisma.notification.create({
        data: {
          userId: req.userId,
          type: "SYSTEM_ALERT",
          title: "Service Request Expired",
          message: `Your service request "${req.title}" has expired. You can renew it for $0.99 or create a new request anytime.`,
          data: JSON.stringify({ serviceRequestId: req.id, canRenew: true }),
        },
      });
      result.notificationsSent++;
    }
  }

  return result;
}

/**
 * Schedule quote expiration check - call from server startup
 * Runs every hour
 */
export function scheduleQuoteExpirationCheck(): void {
  const ONE_HOUR = 60 * 60 * 1000;

  // Run immediately on startup
  checkQuoteExpirations()
    .then((result) => {
      const total =
        result.expiredQuotes +
        result.expiredShares +
        result.expiredRequests;
      if (total > 0) {
        console.log(
          `[QuoteExpirationCheck] Expired: ${result.expiredQuotes} quotes, ${result.expiredShares} shares, ${result.expiredRequests} requests. Sent ${result.notificationsSent} notifications.`,
        );
      } else {
        console.log("[QuoteExpirationCheck] No expirations found");
      }
    })
    .catch((err) =>
      console.error("[QuoteExpirationCheck] Error:", err),
    );

  // Schedule recurring checks every hour
  setInterval(async () => {
    try {
      const result = await checkQuoteExpirations();
      const total =
        result.expiredQuotes +
        result.expiredShares +
        result.expiredRequests;
      if (total > 0) {
        console.log(
          `[QuoteExpirationCheck] Expired: ${result.expiredQuotes} quotes, ${result.expiredShares} shares, ${result.expiredRequests} requests. Sent ${result.notificationsSent} notifications.`,
        );
      }
    } catch (err) {
      console.error("[QuoteExpirationCheck] Error:", err);
    }
  }, ONE_HOUR);

  console.log("[QuoteExpirationCheck] Scheduled every 1 hour");
}
