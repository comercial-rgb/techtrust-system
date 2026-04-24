/**
 * ============================================
 * SERVICE REQUEST CONTROLLER
 * ============================================
 * Solicitações de serviço do cliente
 */

import { Request, Response } from "express";
import { ServiceType } from "@prisma/client";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error-handler";
import { logger } from "../config/logger";
import { geocodeAddress } from "../services/geocoding.service";
import * as stripeService from "../services/stripe.service";
import { SERVICE_TYPE_MAP } from "../config/service-type-mapping";
import {
  SUBSCRIPTION_PLANS,
  QUOTE_VALIDITY,
  RENEWAL_RULES,
  SERVICE_FLOW,
  calculateCancellationFee,
  getEffectiveActiveRequestLimit,
  getEffectiveServiceRequestLimit,
  getServiceRequestExpirationHours,
  type PlanKey,
} from "../config/businessRules";
import { buildProviderDisclosure } from "../utils/provider-disclosures";
import { buildInsuranceRequirementChecklist } from "../utils/insurance-requirements";

function resolveServiceType(raw: string): ServiceType {
  // If it already matches a Prisma enum value, use it directly
  const enumValues = [
    "SCHEDULED_MAINTENANCE",
    "REPAIR",
    "ROADSIDE_SOS",
    "INSPECTION",
    "DETAILING",
    "DIAGNOSTIC",
  ];
  const upper = raw.toUpperCase();
  if (enumValues.includes(upper)) return upper as ServiceType;

  // Otherwise map from mobile short ID
  const mapped = SERVICE_TYPE_MAP[raw.toLowerCase()];
  if (mapped) return mapped as ServiceType;

  // Fallback
  logger.warn(`Unknown serviceType "${raw}", defaulting to REPAIR`);
  return "REPAIR" as ServiceType;
}

function getBillingReturnUrls(req: Request, fallbackPath: string) {
  const frontendUrl =
    process.env.FRONTEND_URL ||
    process.env.CUSTOMER_APP_URL ||
    process.env.PUBLIC_APP_URL ||
    "https://techtrustautosolutions.com";

  return {
    successUrl: req.body.successUrl || `${frontendUrl}${fallbackPath}?stripe=success`,
    cancelUrl: req.body.cancelUrl || `${frontendUrl}${fallbackPath}?stripe=cancelled`,
  };
}

/**
 * POST /api/v1/service-requests
 * Criar nova solicitação de serviço
 */
export const createServiceRequest = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const {
    vehicleId,
    serviceType: rawServiceType,
    title,
    description,
    serviceLocationType,
    customerAddress,
    preferredDate,
    preferredTime,
    isUrgent,
    urgency,
    location,
    serviceLatitude,
    serviceLongitude,
    vehicleCategory,
    serviceScope,
    mileage,
  } = req.body;

  // Resolve mobile service-type ID → Prisma enum value
  const serviceType = resolveServiceType(rawServiceType);

  // Accept either isUrgent (boolean) or urgency (string from mobile)
  const resolvedIsUrgent =
    isUrgent === true || urgency === "urgent" || urgency === "emergency";

  // Verificar se veículo pertence ao usuário
  const vehicle = await prisma.vehicle.findFirst({
    where: {
      id: vehicleId,
      userId: userId,
      isActive: true,
    },
  });

  if (!vehicle) {
    throw new AppError("Veículo não encontrado", 404, "VEHICLE_NOT_FOUND");
  }

  // Verificar limites da assinatura
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId: userId,
      status: "ACTIVE",
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!subscription) {
    throw new AppError(
      "Assinatura não encontrada",
      404,
      "SUBSCRIPTION_NOT_FOUND",
    );
  }

  // Se tem limite mensal, verificar
  const effectiveRequestLimit = getEffectiveServiceRequestLimit(
    subscription.plan,
    subscription.maxServiceRequestsPerMonth,
    subscription.trialEnd,
  );

  if (effectiveRequestLimit !== null) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const requestsThisMonth = await prisma.serviceRequest.count({
      where: {
        userId: userId,
        createdAt: {
          gte: startOfMonth,
        },
      },
    });

    if (requestsThisMonth >= effectiveRequestLimit) {
      const trialSuffix = subscription.trialEnd && subscription.trialEnd.getTime() > Date.now()
        ? " durante o trial. Ative seu plano para liberar o limite completo."
        : "";

      throw new AppError(
        `Você atingiu o limite de ${effectiveRequestLimit} solicitações por mês do plano ${subscription.plan}${trialSuffix}`,
        403,
        "REQUEST_LIMIT_REACHED",
      );
    }
  }

  // Contar solicitações ativas
  const activeRequests = await prisma.serviceRequest.count({
    where: {
      userId: userId,
      status: {
        in: [
          "SEARCHING_PROVIDERS",
          "QUOTES_RECEIVED",
          "QUOTE_ACCEPTED",
          "SCHEDULED",
          "IN_PROGRESS",
        ],
      },
    },
  });

  // Limites de solicitações ativas por plano (from businessRules SUBSCRIPTION_PLANS)
  const planConfig = SUBSCRIPTION_PLANS[subscription.plan as PlanKey];
  const maxActive = getEffectiveActiveRequestLimit(subscription.plan, subscription.trialEnd)
    ?? planConfig?.maxActiveSimultaneous
    ?? 2;

  if (activeRequests >= maxActive) {
    const trialSuffix = subscription.trialEnd && subscription.trialEnd.getTime() > Date.now()
      ? " durante o trial. Ative seu plano para liberar o limite completo."
      : "";

    throw new AppError(
      `Você tem ${activeRequests} solicitações ativas. Limite do plano ${subscription.plan}: ${maxActive}${trialSuffix}`,
      403,
      "ACTIVE_REQUESTS_LIMIT",
    );
  }

  // Gerar número da solicitação
  const requestNumber = `SR-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

  // Calcular deadline para quotes (48 horas — businessRules.QUOTE_VALIDITY)
  const quoteDeadline = new Date();
  quoteDeadline.setHours(quoteDeadline.getHours() + QUOTE_VALIDITY.PROVIDER_SUBMIT_HOURS);

  // Calcular expiração conforme plano (FREE/STARTER=72h renewable, PRO/ENTERPRISE=never)
  const expirationHours = getServiceRequestExpirationHours(subscription.plan);
  const expiresAt = expirationHours !== null ? new Date(Date.now() + expirationHours * 60 * 60 * 1000) : null;

  // Resolve GPS coordinates for the service location
  let finalLatitude: number | null = null;
  let finalLongitude: number | null = null;

  // Priority 1: Direct lat/lng from body
  if (serviceLatitude && serviceLongitude) {
    finalLatitude = Number(serviceLatitude);
    finalLongitude = Number(serviceLongitude);
  }
  // Priority 2: location object { lat, lng } from mobile app
  else if (location?.lat && location?.lng) {
    finalLatitude = Number(location.lat);
    finalLongitude = Number(location.lng);
  }
  // Priority 3: Geocode the customer address
  else if (customerAddress) {
    try {
      const coords = await geocodeAddress(customerAddress);
      if (coords) {
        finalLatitude = coords.latitude;
        finalLongitude = coords.longitude;
        logger.info(
          `Geocoded address "${customerAddress}" -> ${finalLatitude}, ${finalLongitude}`,
        );
      }
    } catch (err) {
      logger.warn(`Failed to geocode address: ${customerAddress}`, err);
    }
  }

  // ===== Safely parse DateTime fields (prevent Invalid Date → PrismaClientValidationError) =====
  let parsedPreferredDate: Date | null = null;
  let parsedPreferredTime: Date | null = null;
  const isAsap = preferredDate === 'ASAP';

  if (preferredDate && !isAsap) {
    const d = new Date(preferredDate);
    parsedPreferredDate = isNaN(d.getTime()) ? null : d;
    if (!parsedPreferredDate) {
      logger.warn(`Invalid preferredDate value: "${preferredDate}" — setting to null`);
    }
  }

  if (preferredTime && typeof preferredTime === 'string' && preferredTime.trim() !== '') {
    if (preferredTime.includes(':') && preferredTime.length <= 5) {
      const d = new Date(`1970-01-01T${preferredTime}:00Z`);
      parsedPreferredTime = isNaN(d.getTime()) ? null : d;
    } else {
      const d = new Date(preferredTime);
      parsedPreferredTime = isNaN(d.getTime()) ? null : d;
    }
    if (!parsedPreferredTime) {
      logger.warn(`Invalid preferredTime value: "${preferredTime}" — setting to null`);
    }
  }

  // ===== Safely validate Decimal fields (prevent NaN → PrismaClientValidationError) =====
  const safeLatitude = (finalLatitude !== null && !isNaN(finalLatitude)) ? finalLatitude : null;
  const safeLongitude = (finalLongitude !== null && !isNaN(finalLongitude)) ? finalLongitude : null;

  logger.info(`Creating service request: serviceType=${serviceType}, preferredDate=${preferredDate}, preferredTime=${preferredTime}, lat=${safeLatitude}, lng=${safeLongitude}`);

  // Criar solicitação
  const serviceRequest = await prisma.serviceRequest.create({
    data: {
      requestNumber,
      userId,
      vehicleId,
      serviceType,
      rawServiceType: rawServiceType?.toLowerCase() || null,
      vehicleCategory: vehicleCategory || null,
      serviceScope: serviceScope || null,
      title,
      description,
      serviceLocationType: serviceLocationType || 'IN_SHOP',
      customerAddress: customerAddress || null,
      serviceLatitude: safeLatitude,
      serviceLongitude: safeLongitude,
      locationType: serviceLocationType || null,
      preferredDate: parsedPreferredDate,
      preferredTime: parsedPreferredTime,
      flexibleSchedule: isAsap,
      isUrgent: resolvedIsUrgent,
      status: "SEARCHING_PROVIDERS",
      maxQuotes: QUOTE_VALIDITY.MAX_QUOTES_PER_REQUEST,
      quoteDeadline,
      expiresAt,
    },
    include: {
      vehicle: {
        select: {
          plateNumber: true,
          make: true,
          model: true,
          year: true,
        },
      },
    },
  });

  // Update vehicle mileage if provided
  if (mileage && Number(mileage) > 0) {
    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        currentMileage: Number(mileage),
        lastMileageUpdate: new Date(),
      },
    }).catch(() => {}); // Non-critical, don't block request creation
  }

  logger.info(
    `Solicitação criada: ${serviceRequest.requestNumber} por ${userId}`,
  );

  res.status(201).json({
    success: true,
    message: "Solicitação criada! Buscando fornecedores...",
    data: serviceRequest,
  });
};

/**
 * GET /api/v1/service-requests
 * Listar solicitações do usuário
 */
export const getServiceRequests = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { status, vehicleId, page = 1, limit = 10 } = req.query;

  const where: any = { userId };

  if (status) {
    where.status = status;
  }

  if (vehicleId) {
    where.vehicleId = vehicleId;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [requests, total] = await Promise.all([
    prisma.serviceRequest.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: {
        createdAt: "desc",
      },
      include: {
        vehicle: {
          select: {
            plateNumber: true,
            make: true,
            model: true,
            year: true,
          },
        },
        quotes: {
          select: {
            id: true,
            quoteNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.serviceRequest.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      requests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    },
  });
};

/**
 * GET /api/v1/service-requests/:requestId
 * Ver detalhes de uma solicitação
 */
export const getServiceRequest = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { requestId } = req.params;

  // Allow both the customer who created it and providers to view
  const request = await prisma.serviceRequest.findFirst({
    where: {
      id: requestId,
      OR: [
        { userId: userId },
        { quotes: { some: { providerId: userId } } },
        // Allow any provider to view open requests
        { status: { in: ["SEARCHING_PROVIDERS", "QUOTES_RECEIVED"] } },
      ],
    },
    include: {
      vehicle: true,
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          city: true,
          state: true,
          _count: { select: { serviceRequests: true } },
        },
      },
      quotes: {
        include: {
          provider: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              providerProfile: {
                select: {
                  businessName: true,
                  averageRating: true,
                  totalReviews: true,
                  totalServicesCompleted: true,
                  baseLatitude: true,
                  baseLongitude: true,
                  address: true,
                  city: true,
                  state: true,
                  businessType: true,
                  businessTypeCat: true,
                  servicesOffered: true,
                  insuranceVerified: true,
                  insuranceDisclosureAcceptedAt: true,
                  fdacsRegistrationNumber: true,
                  cityBusinessTaxReceiptNumber: true,
                  countyBusinessTaxReceiptNumber: true,
                  businessTaxReceiptStatus: true,
                  marketplaceFacilitatorTaxAcknowledged: true,
                  stripeOnboardingCompleted: true,
                  payoutMethod: true,
                  insurancePolicies: true,
                  complianceItems: true,
                },
              },
            },
          },
        },
        orderBy: {
          totalAmount: "asc",
        },
      },
      workOrders: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  if (!request) {
    throw new AppError("Solicitação não encontrada", 404, "REQUEST_NOT_FOUND");
  }

  const enrichedRequest = {
    ...request,
    quotes: request.quotes.map((quote) => ({
      ...quote,
      provider: quote.provider
        ? {
            ...quote.provider,
            providerProfile: quote.provider.providerProfile
              ? {
                  ...quote.provider.providerProfile,
                  disclosures: buildProviderDisclosure(quote.provider.providerProfile),
                  insuranceRequirements: buildInsuranceRequirementChecklist(quote.provider.providerProfile),
                }
              : null,
          }
        : quote.provider,
    })),
  };

  res.json({
    success: true,
    data: enrichedRequest,
  });
};

/**
 * POST /api/v1/service-requests/:requestId/cancel
 * Cancelar solicitação
 */
export const cancelServiceRequest = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { requestId } = req.params;
  const { reason } = req.body;

  const request = await prisma.serviceRequest.findFirst({
    where: {
      id: requestId,
      userId: userId,
    },
  });

  if (!request) {
    throw new AppError("Solicitação não encontrada", 404, "REQUEST_NOT_FOUND");
  }

  // Verificar se pode cancelar
  if (["COMPLETED", "CANCELLED"].includes(request.status)) {
    throw new AppError(
      "Esta solicitação não pode ser cancelada",
      400,
      "CANNOT_CANCEL",
    );
  }

  if (request.status === "IN_PROGRESS") {
    throw new AppError(
      "Serviço em andamento não pode ser cancelado. Abra uma disputa se necessário.",
      400,
      "SERVICE_IN_PROGRESS",
    );
  }

  let cancellationFeePercent = 0;
  let cancellationFeeAmount = 0;
  let cancellationFeeCaptured = false;

  if (request.acceptedQuoteId) {
    const acceptedQuote = await prisma.quote.findUnique({
      where: { id: request.acceptedQuoteId },
      select: { id: true, acceptedAt: true, totalAmount: true, providerId: true },
    });

    const fee = calculateCancellationFee(
      acceptedQuote ? Number(acceptedQuote.totalAmount) : 0,
      false,
      acceptedQuote?.acceptedAt || null,
      request.scheduledFor || null,
    );

    cancellationFeePercent = fee.feePercent;
    cancellationFeeAmount = fee.feeAmount;

    if (cancellationFeeAmount > 0) {
      const workOrder = await prisma.workOrder.findFirst({
        where: { serviceRequestId: requestId },
        include: {
          provider: {
            select: {
              providerProfile: {
                select: {
                  stripeOnboardingCompleted: true,
                  stripeAccountId: true,
                },
              },
            },
          },
          payments: { where: { status: { in: ["AUTHORIZED", "PENDING"] } } },
        },
      });

      const authorizedPayment = workOrder?.payments.find(
        (payment) => payment.status === "AUTHORIZED" && payment.paymentType === "SERVICE",
      );

      if (authorizedPayment && workOrder) {
        const feeCents = Math.round(cancellationFeeAmount * 100);
        const captureResult = await stripeService.capturePaymentIntent(
          authorizedPayment.stripePaymentIntentId,
          feeCents,
          workOrder.provider.providerProfile?.stripeOnboardingCompleted
            ? feeCents
            : undefined,
        );

        if (captureResult.status !== "succeeded") {
          throw new AppError(
            `Cancellation fee capture failed with status: ${captureResult.status}`,
            500,
            "CANCELLATION_FEE_CAPTURE_FAILED",
          );
        }

        await prisma.payment.update({
          where: { id: authorizedPayment.id },
          data: {
            status: "CAPTURED",
            capturedAt: new Date(),
            stripeChargeId: captureResult.chargeId || authorizedPayment.stripeChargeId,
            paymentType: "CANCELLATION_FEE",
            subtotal: cancellationFeeAmount,
            platformFee: cancellationFeeAmount,
            processingFee: 0,
            totalAmount: cancellationFeeAmount,
            providerAmount: 0,
            refundReason: reason || "Service request cancelled by customer",
          },
        });

        for (const payment of workOrder.payments) {
          if (payment.id === authorizedPayment.id) continue;
          try {
            await stripeService.cancelPaymentIntent(payment.stripePaymentIntentId);
            await prisma.payment.update({
              where: { id: payment.id },
              data: {
                status: "CANCELLED",
                refundReason: reason || "Service request cancelled by customer",
              },
            });
          } catch (err: any) {
            logger.error(`Error voiding payment ${payment.id}: ${err.message}`);
          }
        }

        await prisma.workOrder.update({
          where: { id: workOrder.id },
          data: { status: "CANCELLED", cancelledAt: new Date() },
        });

        cancellationFeeCaptured = true;
      } else {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, fullName: true },
        });

        if (!user) {
          throw new AppError("User not found", 404, "USER_NOT_FOUND");
        }

        const subscription = await prisma.subscription.findFirst({
          where: { userId, status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          select: { stripeCustomerId: true },
        });

        const stripeCustomerId = await stripeService.getOrCreateCustomer({
          userId,
          email: user.email,
          name: user.fullName,
          existingStripeCustomerId: subscription?.stripeCustomerId,
        });

        const { successUrl, cancelUrl } = getBillingReturnUrls(req, `/service-requests/${requestId}`);
        const checkout = await stripeService.createOneTimeCheckoutSession({
          customerId: stripeCustomerId,
          amount: Math.round(cancellationFeeAmount * 100),
          name: `TechTrust cancellation fee - ${request.requestNumber}`,
          userId,
          successUrl,
          cancelUrl,
          metadata: {
            billingType: "request_cancellation",
            requestId,
            reason: reason || "",
          },
        });

        res.json({
          success: true,
          message: `Complete checkout to cancel this request and pay the $${cancellationFeeAmount.toFixed(2)} cancellation fee.`,
          data: {
            cancellationFeePercent,
            cancellationFeeAmount,
            checkoutSessionId: checkout.sessionId,
            checkoutUrl: checkout.url,
            pendingCheckout: true,
          },
        });
        return;
      }
    }
  }

  // Cancelar
  await prisma.serviceRequest.update({
    where: { id: requestId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancellationReason: reason,
    },
  });

  logger.info(`Solicitação cancelada: ${request.requestNumber}`);

  res.json({
    success: true,
    message: "Solicitação cancelada",
    data: {
      cancellationFee: `${cancellationFeePercent}%`,
      cancellationFeePercent,
      cancellationFeeAmount,
      cancellationFeeCaptured,
      note:
        cancellationFeeAmount > 0
          ? "Taxa de cancelamento capturada pelo Stripe"
          : "Sem taxa de cancelamento",
    },
  });
};

/**
 * POST /api/v1/service-requests/:requestId/renew
 * Renew (reopen) an expired/cancelled request to receive more quotes.
 * Charges $0.99 renewal fee (FREE/STARTER plans) immediately via Stripe.
 * PRO/ENTERPRISE: free renewal.
 */
export const renewServiceRequest = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { requestId } = req.params;

  const request = await prisma.serviceRequest.findFirst({
    where: {
      id: requestId,
      userId: userId,
    },
  });

  if (!request) {
    throw new AppError("Request not found", 404, "REQUEST_NOT_FOUND");
  }

  // Only allow renewal for expired or cancelled requests
  if (["IN_PROGRESS", "COMPLETED"].includes(request.status)) {
    throw new AppError("This request cannot be renewed", 400, "CANNOT_RENEW");
  }

  // Get client subscription to determine fee and new expiration
  const subscription = await prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });

  if (!subscription) {
    throw new AppError("Active subscription required", 404, "SUBSCRIPTION_NOT_FOUND");
  }

  const plan = subscription.plan as PlanKey;
  const renewalFee = SUBSCRIPTION_PLANS[plan]?.renewalFee ?? RENEWAL_RULES.FEE;

  // Calculate new expiration based on plan
  const expirationHours = getServiceRequestExpirationHours(plan);
  const newExpiresAt = expirationHours !== null
    ? new Date(Date.now() + expirationHours * 60 * 60 * 1000)
    : null;

  // New quote deadline
  const newQuoteDeadline = new Date();
  newQuoteDeadline.setHours(newQuoteDeadline.getHours() + QUOTE_VALIDITY.PROVIDER_SUBMIT_HOURS);

  let billingResult:
    | { method: "subscription_invoice"; invoiceId: string }
    | { method: "checkout"; checkoutSessionId: string; checkoutUrl: string }
    | null = null;

  if (renewalFee > 0) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, fullName: true },
    });

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    const stripeCustomerId = await stripeService.getOrCreateCustomer({
      userId,
      email: user.email,
      name: user.fullName,
      existingStripeCustomerId: subscription.stripeCustomerId,
    });

    if (!subscription.stripeCustomerId) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { stripeCustomerId },
      });
    }

    if (subscription.stripeSubscriptionId) {
      const invoice = await stripeService.chargeOneTimeSubscriptionFee({
        customerId: stripeCustomerId,
        subscriptionId: subscription.stripeSubscriptionId,
        amount: Math.round(renewalFee * 100),
        description: `TechTrust request renewal - ${request.requestNumber}`,
        metadata: {
          billingType: "request_renewal",
          userId,
          requestId,
          requestNumber: request.requestNumber,
        },
      });

      if (invoice.status !== "paid") {
        throw new AppError(
          "Renewal fee could not be collected. Please update your payment method.",
          402,
          "RENEWAL_PAYMENT_FAILED",
        );
      }

      billingResult = {
        method: "subscription_invoice",
        invoiceId: invoice.invoiceId,
      };
    } else {
      const { successUrl, cancelUrl } = getBillingReturnUrls(req, `/service-requests/${requestId}`);
      const checkout = await stripeService.createOneTimeCheckoutSession({
        customerId: stripeCustomerId,
        amount: Math.round(renewalFee * 100),
        name: `TechTrust request renewal - ${request.requestNumber}`,
        userId,
        successUrl,
        cancelUrl,
        metadata: {
          billingType: "request_renewal",
          requestId,
          requestNumber: request.requestNumber,
          expiresAt: newExpiresAt?.toISOString() || "",
          quoteDeadline: newQuoteDeadline.toISOString(),
        },
      });

      res.json({
        success: true,
        message: `Complete checkout to renew this request for $${renewalFee.toFixed(2)}.`,
        data: {
          renewalFee,
          checkoutSessionId: checkout.sessionId,
          checkoutUrl: checkout.url,
          pendingCheckout: true,
        },
      });
      return;
    }
  }

  // Reopen the request only after required Stripe billing is paid or not needed.
  const renewed = await prisma.serviceRequest.update({
    where: { id: requestId },
    data: {
      status: "SEARCHING_PROVIDERS",
      cancelledAt: null,
      cancellationReason: null,
      acceptedQuoteId: null,
      expiresAt: newExpiresAt,
      quoteDeadline: newQuoteDeadline,
      renewalCount: { increment: 1 },
      lastRenewedAt: new Date(),
    },
  });

  logger.info(
    `Request renewed: ${request.requestNumber}, count=${renewed.renewalCount}, plan=${plan}`,
  );

  res.json({
    success: true,
    message: renewalFee > 0
      ? `Request renewed! A $${renewalFee.toFixed(2)} fee was captured by Stripe.`
      : "Request renewed successfully. You will receive new quotes.",
    data: {
      renewalFee,
      renewalCount: renewed.renewalCount,
      newExpiresAt: newExpiresAt?.toISOString() ?? null,
      billingMethod: renewalFee > 0 ? RENEWAL_RULES.BILLING_METHOD : null,
      billing: billingResult,
    },
  });
  return;
};

/**
 * POST /api/v1/service-requests/:requestId/towing-consent
 * RoadAssist: Customer gives consent for towing.
 * Required when serviceType is ROADSIDE_SOS and towing is needed.
 */
export const giveTowingConsent = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { requestId } = req.params;
  const { towingDestination, customerLocation } = req.body;

  if (!SERVICE_FLOW.ROADASSIST_REQUIRES_TOWING_CONSENT) {
    throw new AppError(
      "Towing consent is not required in current configuration",
      400,
      "TOWING_CONSENT_NOT_REQUIRED",
    );
  }

  const request = await prisma.serviceRequest.findFirst({
    where: {
      id: requestId,
      userId: userId,
      serviceType: "ROADSIDE_SOS",
    },
  });

  if (!request) {
    throw new AppError(
      "Roadside service request not found",
      404,
      "REQUEST_NOT_FOUND",
    );
  }

  if (request.towingConsentAt) {
    throw new AppError(
      "Towing consent already provided",
      409,
      "CONSENT_ALREADY_GIVEN",
    );
  }

  // Validate client location is present (required by businessRules)
  if (SERVICE_FLOW.ROADASSIST_REQUIRES_CLIENT_LOCATION && !customerLocation) {
    throw new AppError(
      "Your current GPS location is required for roadside assistance",
      400,
      "LOCATION_REQUIRED",
    );
  }

  // Update service request with towing consent + location
  const updated = await prisma.serviceRequest.update({
    where: { id: requestId },
    data: {
      towingConsentAt: new Date(),
      ...(customerLocation?.lat && customerLocation?.lng
        ? {
            serviceLatitude: Number(customerLocation.lat),
            serviceLongitude: Number(customerLocation.lng),
          }
        : {}),
      ...(towingDestination
        ? { customerAddress: towingDestination }
        : {}),
    },
  });

  logger.info(
    `Towing consent given for request ${request.requestNumber} by user ${userId}`,
  );

  res.json({
    success: true,
    message: "Towing consent recorded. A towing provider will be dispatched.",
    data: {
      requestId: updated.id,
      towingConsentAt: updated.towingConsentAt,
      suggestTowingProviders: SERVICE_FLOW.ROADASSIST_SUGGEST_TOWING_PROVIDERS,
    },
  });
};
