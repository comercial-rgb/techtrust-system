/**
 * ============================================
 * ESTIMATE SHARE CONTROLLER
 * ============================================
 * Allows customers to share their Written Estimates
 * with other providers for competing quotes.
 *
 * Endpoints:
 * - POST   /                  → Share estimate (customer)
 * - GET    /my                → List my shared estimates (customer)
 * - GET    /available         → List available shared estimates (provider)
 * - GET    /:id               → Get shared estimate detail
 * - POST   /:id/submit-quote  → Submit competing quote (provider)
 * - PATCH  /:id/close         → Close sharing (customer)
 */

import { Request, Response } from "express";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error-handler";
import { logger } from "../config/logger";
import {
  generateShareNumber,
  generateEstimateNumber,
} from "../utils/number-generators";

// ============================================
// 1. SHARE ESTIMATE
// ============================================
export const shareEstimate = async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const {
    estimateId,
    shareType = "PUBLIC",
    targetProviderIds = [],
    cityFilter,
    stateFilter,
    radiusKm,
    shareOriginalProviderName = false,
    expiresInDays = 7,
  } = req.body;

  // Validate the estimate belongs to the customer
  const estimate = await prisma.quote.findFirst({
    where: {
      id: estimateId,
      serviceRequest: { userId: customerId },
      status: { in: ["PENDING", "ACCEPTED"] },
    },
    include: {
      serviceRequest: {
        include: { vehicle: true },
      },
      provider: {
        select: {
          id: true,
          fullName: true,
          providerProfile: { select: { businessName: true } },
        },
      },
    },
  });

  if (!estimate) {
    throw new AppError(
      "Estimate not found or not available for sharing",
      404,
      "ESTIMATE_NOT_FOUND",
    );
  }

  const shareNumber = await generateShareNumber();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const share = await prisma.estimateShare.create({
    data: {
      shareNumber,
      originalEstimateId: estimateId,
      customerId,
      shareType,
      targetProviderIds: shareType === "SPECIFIC" ? targetProviderIds : [],
      cityFilter,
      stateFilter,
      radiusKm,
      shareOriginalProviderName,
      isActive: true,
      expiresAt,
    },
  });

  // If SPECIFIC, notify target providers
  if (
    shareType === "SPECIFIC" &&
    Array.isArray(targetProviderIds) &&
    targetProviderIds.length > 0
  ) {
    const vehicle = estimate.serviceRequest.vehicle;
    const vehicleInfo = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

    const notifications = targetProviderIds.map((targetId: string) => ({
      userId: targetId,
      type: "COMPETING_ESTIMATE_RECEIVED" as any,
      title: "Competing Estimate Opportunity",
      message: `A customer is looking for competing quotes for ${estimate.serviceRequest.title} on a ${vehicleInfo}. Check it out!`,
      data: JSON.stringify({
        shareId: share.id,
        shareNumber,
        serviceType: estimate.serviceRequest.serviceType,
        vehicleInfo,
      }),
    }));

    await prisma.notification.createMany({ data: notifications });
  }

  logger.info(
    `Estimate shared: ${shareNumber} (${shareType}) by customer ${customerId}`,
  );

  return res.status(201).json({
    success: true,
    message:
      shareType === "SPECIFIC"
        ? `Estimate shared with ${targetProviderIds.length} provider(s).`
        : "Estimate published for competing quotes.",
    data: { share },
  });
};

// ============================================
// 2. LIST MY SHARED ESTIMATES (customer)
// ============================================
export const getMySharedEstimates = async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const { active } = req.query;

  const where: any = { customerId };
  if (active === "true") where.isActive = true;
  if (active === "false") where.isActive = false;

  const shares = await prisma.estimateShare.findMany({
    where,
    include: {
      originalEstimate: {
        select: {
          id: true,
          quoteNumber: true,
          estimateNumber: true,
          totalAmount: true,
          status: true,
          providerId: true,
          serviceRequestId: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json({
    success: true,
    data: { shares },
  });
};

// ============================================
// 3. LIST AVAILABLE SHARED ESTIMATES (provider)
// ============================================
export const getAvailableSharedEstimates = async (
  req: Request,
  res: Response,
) => {
  const providerId = req.user!.id;
  const { city, state, page = "1", limit = "20" } = req.query;

  const pageNum = parseInt(page as string) || 1;
  const limitNum = parseInt(limit as string) || 20;
  const skip = (pageNum - 1) * limitNum;

  const now = new Date();

  const where: any = {
    isActive: true,
    expiresAt: { gt: now },
    originalEstimate: {
      providerId: { not: providerId },
    },
  };

  if (city) where.cityFilter = city as string;
  if (state) where.stateFilter = state as string;

  const [shares, total] = await Promise.all([
    prisma.estimateShare.findMany({
      where,
      include: {
        originalEstimate: {
          select: {
            id: true,
            estimateNumber: true,
            totalAmount: true,
            partsCost: true,
            laborCost: true,
            travelFee: true,
            partsList: true,
            laborDescription: true,
            serviceRequestId: true,
            providerId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limitNum,
    }),
    prisma.estimateShare.count({ where }),
  ]);

  return res.json({
    success: true,
    data: {
      shares,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
  });
};

// ============================================
// 4. GET SHARED ESTIMATE DETAIL
// ============================================
export const getSharedEstimateDetail = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  const share = await prisma.estimateShare.findUnique({
    where: { id },
    include: {
      originalEstimate: {
        include: {
          serviceRequest: {
            include: { vehicle: true },
          },
          provider: {
            select: {
              id: true,
              fullName: true,
              providerProfile: { select: { businessName: true } },
            },
          },
          competingEstimates: {
            select: {
              id: true,
              quoteNumber: true,
              estimateNumber: true,
              totalAmount: true,
              status: true,
              providerId: true,
              partsCost: true,
              laborCost: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  if (!share) throw new AppError("Shared estimate not found", 404, "NOT_FOUND");

  const isCustomer = share.customerId === userId;
  const isTargetedProvider =
    share.shareType === "PUBLIC" ||
    (Array.isArray(share.targetProviderIds) &&
      (share.targetProviderIds as string[]).includes(userId));

  if (!isCustomer && !isTargetedProvider) {
    throw new AppError("Not authorized", 403, "FORBIDDEN");
  }

  // Redact identity if needed
  if (!share.shareOriginalProviderName && !isCustomer) {
    (share.originalEstimate as any).provider = {
      id: null,
      fullName: "Another Provider",
      providerProfile: { businessName: null },
    };
  }

  return res.json({
    success: true,
    data: { share },
  });
};

// ============================================
// 5. SUBMIT COMPETING QUOTE (provider)
// ============================================
export const submitCompetingQuote = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const { id } = req.params;
  const {
    totalAmount,
    laborCost,
    partsCost,
    travelFee = 0,
    taxAmount = 0,
    warrantyMonths = 0,
    warrantyMileage = 0,
    partsList = [],
    laborDescription,
    notes,
    validDays = 30,
  } = req.body;

  const share = await prisma.estimateShare.findFirst({
    where: {
      id,
      isActive: true,
      expiresAt: { gt: new Date() },
    },
    include: {
      originalEstimate: {
        select: {
          id: true,
          providerId: true,
          serviceRequestId: true,
        },
      },
    },
  });

  if (!share)
    throw new AppError(
      "Shared estimate not found or expired",
      404,
      "NOT_FOUND",
    );

  if (share.originalEstimate.providerId === providerId) {
    throw new AppError(
      "Cannot submit a competing quote on your own estimate",
      400,
      "OWN_ESTIMATE",
    );
  }

  const existingQuote = await prisma.quote.findFirst({
    where: { originalEstimateId: share.originalEstimateId, providerId },
    select: { id: true },
  });
  if (existingQuote) {
    throw new AppError(
      "You already submitted a competing quote for this estimate",
      400,
      "ALREADY_SUBMITTED",
    );
  }

  const serviceRequest = await prisma.serviceRequest.findUnique({
    where: { id: share.originalEstimate.serviceRequestId },
    select: { userId: true },
  });
  if (!serviceRequest)
    throw new AppError("Service request not found", 404, "NOT_FOUND");

  const quoteNumber = `Q-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const estimateNumber = await generateEstimateNumber();

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + validDays);

  const result = await prisma.$transaction(async (tx) => {
    const competingQuote = await tx.quote.create({
      data: {
        quoteNumber,
        estimateNumber,
        estimateType: "COMPETING",
        serviceRequestId: share.originalEstimate.serviceRequestId,
        providerId,
        totalAmount,
        laborCost,
        partsCost,
        travelFee,
        taxAmount,
        partsList,
        laborDescription,
        warrantyMonths,
        warrantyMileage,
        notes,
        validUntil,
        status: "PENDING",
        originalEstimateId: share.originalEstimateId,
      },
    });

    await tx.estimateShare.update({
      where: { id: share.id },
      data: { competingEstimatesCount: { increment: 1 } },
    });

    return competingQuote;
  });

  await prisma.notification.create({
    data: {
      userId: serviceRequest.userId,
      type: "COMPETING_ESTIMATE_RECEIVED",
      title: "New Competing Estimate",
      message: `A provider submitted a competing quote of $${Number(totalAmount).toFixed(2)} for your shared estimate. Compare and choose the best option!`,
      data: JSON.stringify({
        shareId: share.id,
        competingQuoteId: result.id,
        amount: Number(totalAmount),
      }),
    },
  });

  logger.info(
    `Competing quote submitted: ${quoteNumber} for share ${share.shareNumber}`,
  );

  return res.status(201).json({
    success: true,
    message: "Competing quote submitted successfully.",
    data: { quote: result },
  });
};

// ============================================
// 6. CLOSE SHARING (customer)
// ============================================
export const closeSharing = async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const { id } = req.params;

  const share = await prisma.estimateShare.findFirst({
    where: { id, customerId, isActive: true },
  });

  if (!share)
    throw new AppError(
      "Shared estimate not found or already closed",
      404,
      "NOT_FOUND",
    );

  await prisma.estimateShare.update({
    where: { id },
    data: { isActive: false, closedAt: new Date() },
  });

  logger.info(`Estimate sharing closed: ${share.shareNumber}`);

  return res.json({
    success: true,
    message: "Estimate sharing closed.",
  });
};
