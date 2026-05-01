/**
 * ============================================
 * QUOTE CONTROLLER
 * ============================================
 * Orçamentos de fornecedores
 */

import { Request, Response } from "express";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error-handler";
import { logger } from "../config/logger";
import { calculateRoadDistance, kmToMiles, calculateTravelFeeMiles } from "../utils/distance";
import { generateEstimateNumber } from "../utils/number-generators";
import { buildProviderDisclosure } from "../utils/provider-disclosures";
import { buildInsuranceRequirementChecklist } from "../utils/insurance-requirements";
import {
  FDACS_RULES,
  QUOTE_VALIDITY,
} from "../config/businessRules";

/**
 * POST /api/v1/quotes
 * Fornecedor cria orçamento para uma solicitação
 */
export const createQuote = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const {
    serviceRequestId,
    appointmentId, // BUG 1+3 FIX: Link to diagnostic appointment
    partsCost,
    laborCost,
    additionalFees = 0,
    partsList,
    laborDescription,
    estimatedHours,
    estimatedCompletionTime,
    availableDate,
    availableTime,
    warrantyMonths,
    warrantyMileage,
    warrantyDescription,
    odometerReading,
    notes,
    // FDACS Compliance Fields
    proposedCompletionDate,
    laborChargeType,
    hourlyRate,
    shopSuppliesFee = 0,
    newTireCount = 0,
    newBatteryCount = 0,
    intendedPaymentMethod,
    authorizedPersonName,
    authorizedPersonPhone,
    saveReplacedParts = false,
    dailyStorageCharge = 0,
    estimateConsentType,
    maxAmountWithoutEstimate,
    consentSignature,
  } = req.body;

  // Verificar se é fornecedor
  if (req.user!.role !== "PROVIDER") {
    throw new AppError(
      "Apenas fornecedores podem criar orçamentos",
      403,
      "NOT_A_PROVIDER",
    );
  }

  // Verificar se solicitação existe e está aberta
  const serviceRequest = await prisma.serviceRequest.findUnique({
    where: { id: serviceRequestId },
  });

  if (!serviceRequest) {
    throw new AppError("Solicitação não encontrada", 404, "REQUEST_NOT_FOUND");
  }

  if (
    serviceRequest.status !== "SEARCHING_PROVIDERS" &&
    serviceRequest.status !== "QUOTES_RECEIVED"
  ) {
    throw new AppError(
      "Esta solicitação não está mais aceitando orçamentos",
      400,
      "REQUEST_CLOSED",
    );
  }

  // Verificar se deadline passou
  if (
    serviceRequest.quoteDeadline &&
    new Date() > serviceRequest.quoteDeadline
  ) {
    throw new AppError(
      "Prazo para enviar orçamentos expirou",
      400,
      "QUOTE_DEADLINE_PASSED",
    );
  }

  // Verificar se já atingiu máximo de quotes
  const existingQuotes = await prisma.quote.count({
    where: { serviceRequestId },
  });

  if (existingQuotes >= serviceRequest.maxQuotes) {
    throw new AppError(
      "Esta solicitação já tem o máximo de orçamentos",
      400,
      "MAX_QUOTES_REACHED",
    );
  }

  // Verificar se fornecedor já enviou orçamento
  const existingQuote = await prisma.quote.findFirst({
    where: {
      serviceRequestId,
      providerId,
    },
  });

  if (existingQuote) {
    throw new AppError(
      "Você já enviou um orçamento para esta solicitação",
      409,
      "QUOTE_ALREADY_EXISTS",
    );
  }

  // Buscar perfil do provider para obter coordenadas
  const providerProfile = await prisma.providerProfile.findUnique({
    where: { userId: providerId },
  });

  // Calcular distância e taxa de deslocamento se houver coordenadas
  let distanceKm: number | null = null;
  let travelFee = 0;

  if (
    providerProfile?.baseLatitude &&
    providerProfile?.baseLongitude &&
    serviceRequest.serviceLatitude &&
    serviceRequest.serviceLongitude
  ) {
    // Use OSRM road distance for accurate pricing (falls back to Haversine * 1.4)
    const roadResult = await calculateRoadDistance(
      providerProfile.baseLatitude.toNumber(),
      providerProfile.baseLongitude.toNumber(),
      serviceRequest.serviceLatitude.toNumber(),
      serviceRequest.serviceLongitude.toNumber(),
    );

    distanceKm = roadResult.distanceKm;
    const oneWayMiles = kmToMiles(distanceKm);
    // Apply round-trip multiplier if provider charges both ways
    const travelChargeType = (providerProfile as any).travelChargeType ?? "ONE_WAY";
    const distanceMiles = travelChargeType === "ROUND_TRIP" ? oneWayMiles * 2 : oneWayMiles;

    // freeKm is stored as real km (UI converts miles→km on save)
    // extraFeePerKm is stored as $/mile (UI saves the raw dollar value, no conversion)
    const freeKm = Number(providerProfile.freeKm);
    const extraFeePerMile = Number(providerProfile.extraFeePerKm);
    const providerFreeMiles = freeKm > 0 ? kmToMiles(freeKm) : undefined;
    const providerFeePerMile = extraFeePerMile > 0 ? extraFeePerMile : undefined;
    travelFee = calculateTravelFeeMiles(distanceMiles, providerFreeMiles, providerFeePerMile);

    logger.info(
      `Distance: ${distanceKm.toFixed(2)} km / ${oneWayMiles.toFixed(2)} mi one-way${travelChargeType === "ROUND_TRIP" ? ` / ${distanceMiles.toFixed(2)} mi round-trip` : ""} (${roadResult.isRoadDistance ? "OSRM road" : "Haversine estimate"}), travel fee: $${travelFee.toFixed(2)}`,
    );
  }

  // Calculate mandated fees (FDACS — from businessRules)
  const tireFee = Number(newTireCount) * FDACS_RULES.TIRE_FEE_PER_UNIT; // FS 403.718
  const batteryFee = Number(newBatteryCount) * FDACS_RULES.BATTERY_FEE_PER_UNIT; // FS 403.7185
  const platformCalculatedTaxAmount = 0;

  // Providers must not add sales tax to quotes. TechTrust calculates and
  // collects marketplace facilitator tax at checkout based on the customer location.
  const totalAmount =
    Number(partsCost) +
    Number(laborCost) +
    Number(additionalFees) +
    Number(shopSuppliesFee) +
    tireFee +
    batteryFee +
    travelFee;

  // Gerar número do orçamento
  const quoteNumber = `QT-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

  // Gerar Written Estimate number (FDACS)
  const estimateNumber = await generateEstimateNumber();

  // Validade do orçamento conforme FDACS (businessRules)
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + QUOTE_VALIDITY.DIRECT_DAYS);

  // ===== BUG 1+3 FIX: Determine estimateType and diagnosticFee from appointment =====
  let estimateType: "DIRECT" | "DIAGNOSTIC" | "COMPETING" = "DIRECT";
  let linkedAppointmentId: string | null = null;
  let appointmentDiagnosticFee = 0;

  if (appointmentId) {
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        providerId,
        status: "COMPLETED",
      },
      select: {
        id: true,
        diagnosticFee: true,
        feeWaivedOnService: true,
        customerId: true,
        vehicleId: true,
      },
    });

    if (appointment) {
      estimateType = "DIAGNOSTIC";
      linkedAppointmentId = appointment.id;
      appointmentDiagnosticFee = Number(appointment.diagnosticFee) || 0;
      logger.info(
        `Quote linked to diagnostic appointment ${appointmentId}, diagnosticFee: $${appointmentDiagnosticFee}`,
      );
    } else {
      logger.warn(
        `Appointment ${appointmentId} not found or not completed for provider ${providerId}`,
      );
    }
  }

  // Criar orçamento
  const quote = await prisma.quote.create({
    data: {
      quoteNumber,
      estimateNumber,
      estimateType,
      serviceRequestId,
      providerId,
      appointmentId: linkedAppointmentId,
      diagnosticFee: appointmentDiagnosticFee,
      diagnosticFeeWaived: false,
      partsCost,
      laborCost,
      additionalFees,
      taxAmount: platformCalculatedTaxAmount,
      totalAmount,
      distanceKm,
      travelFee,
      partsList: partsList || [],
      laborDescription,
      estimatedHours: estimatedHours ? Number(estimatedHours) : null,
      estimatedCompletionTime,
      availableDate: availableDate ? new Date(availableDate) : null,
      availableTime: availableTime ? new Date(availableTime) : null,
      warrantyMonths: warrantyMonths ? Number(warrantyMonths) : null,
      warrantyMileage: warrantyMileage ? Number(warrantyMileage) : null,
      warrantyDescription,
      odometerReading: odometerReading ? Number(odometerReading) : null,
      // FDACS Compliance
      proposedCompletionDate: proposedCompletionDate
        ? new Date(proposedCompletionDate)
        : null,
      laborChargeType: laborChargeType || null,
      hourlyRate: hourlyRate ? Number(hourlyRate) : null,
      shopSuppliesFee: Number(shopSuppliesFee) || 0,
      newTireCount: Number(newTireCount) || 0,
      tireFee,
      newBatteryCount: Number(newBatteryCount) || 0,
      batteryFee,
      intendedPaymentMethod: intendedPaymentMethod || null,
      authorizedPersonName: authorizedPersonName || null,
      authorizedPersonPhone: authorizedPersonPhone || null,
      saveReplacedParts:
        saveReplacedParts === true || saveReplacedParts === "true",
      dailyStorageCharge: Number(dailyStorageCharge) || 0,
      estimateConsentType: estimateConsentType || null,
      maxAmountWithoutEstimate: maxAmountWithoutEstimate
        ? Number(maxAmountWithoutEstimate)
        : null,
      consentSignature: consentSignature || null,
      consentSignedAt: consentSignature ? new Date() : null,
      notes,
      status: "PENDING",
      validUntil,
    },
  });

  // Atualizar status da solicitação
  await prisma.serviceRequest.update({
    where: { id: serviceRequestId },
    data: {
      status: "QUOTES_RECEIVED",
      quotesCount: existingQuotes + 1,
    },
  });

  logger.info(`Orçamento criado: ${quote.quoteNumber} por ${providerId}`);

  res.status(201).json({
    success: true,
    message: "Orçamento enviado com sucesso!",
    data: quote,
  });
};

/**
 * GET /api/v1/service-requests/:requestId/quotes
 * Cliente lista orçamentos recebidos
 */
export const getQuotesForRequest = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { requestId } = req.params;

  // Verificar se solicitação pertence ao usuário
  const request = await prisma.serviceRequest.findFirst({
    where: {
      id: requestId,
      userId: userId,
    },
  });

  if (!request) {
    throw new AppError("Solicitação não encontrada", 404, "REQUEST_NOT_FOUND");
  }

  const quotes = await prisma.quote.findMany({
    where: { serviceRequestId: requestId },
    include: {
      provider: {
        select: {
          id: true,
          fullName: true,
          providerProfile: {
            select: {
              businessName: true,
              averageRating: true,
              totalReviews: true,
              totalServicesCompleted: true,
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
  });

  const enrichedQuotes = quotes.map((quote) => ({
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
  }));

  res.json({
    success: true,
    data: enrichedQuotes,
  });
};

/**
 * GET /api/v1/quotes/:quoteId
 * Ver detalhes de um orçamento
 */
export const getQuote = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const userRole = req.user!.role;
  const { quoteId } = req.params;

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      serviceRequest: {
        include: {
          vehicle: true,
        },
      },
      provider: {
        select: {
          id: true,
          fullName: true,
          providerProfile: {
            select: {
              businessName: true,
              averageRating: true,
              totalReviews: true,
              totalServicesCompleted: true,
              city: true,
              state: true,
              fdacsRegistrationNumber: true,
              specialties: true,
              businessType: true,
              businessTypeCat: true,
              servicesOffered: true,
              insuranceVerified: true,
              insuranceDisclosureAcceptedAt: true,
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
  });

  if (!quote) {
    throw new AppError("Orçamento não encontrado", 404, "QUOTE_NOT_FOUND");
  }

  if (userRole === "ADMIN") {
    // suporte / backoffice
  } else if (userRole === "CLIENT") {
    if (quote.serviceRequest.userId !== userId) {
      throw new AppError("Orçamento não encontrado", 404, "QUOTE_NOT_FOUND");
    }
  } else if (userRole === "PROVIDER") {
    if (quote.providerId !== userId) {
      throw new AppError("Orçamento não encontrado", 404, "QUOTE_NOT_FOUND");
    }
  } else {
    throw new AppError("Sem permissão", 403, "FORBIDDEN");
  }

  // Enrich response with computed fields for mobile consumption
  const enrichedQuote = {
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
    // Map partsList JSON → items array for mobile
    items: Array.isArray(quote.partsList)
      ? (quote.partsList as any[]).map((item: any, idx: number) => ({
          id: item.id || String(idx + 1),
          type:
            item.type === "LABOR" || item.type === "service" ? "LABOR" : "PART",
          description: item.description || "",
          partCode: item.partCode || item.brand || undefined,
          partCondition:
            item.partCondition || (item.type === "PART" ? "NEW" : undefined),
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.unitPrice) || 0,
          isNoCharge: item.isNoCharge || false,
        }))
      : [],
    partsTotal: Number(quote.partsCost),
    laborTotal: Number(quote.laborCost),
  };

  res.json({
    success: true,
    data: enrichedQuote,
  });
};

/**
 * POST /api/v1/quotes/:quoteId/accept
 * @deprecated Removido — aceite sem pré-autorização não é mais permitido.
 * Use POST /api/v1/service-flow/approve-quote com quoteId e paymentMethodId.
 */
export const acceptQuote = async (req: Request, _res: Response) => {
  const userId = req.user!.id;
  const { quoteId } = req.params;

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      serviceRequest: true,
    },
  });

  if (!quote) {
    throw new AppError("Orçamento não encontrado", 404, "QUOTE_NOT_FOUND");
  }

  if (quote.serviceRequest.userId !== userId) {
    throw new AppError(
      "Você não tem permissão para aceitar este orçamento",
      403,
      "FORBIDDEN",
    );
  }

  if (new Date() > quote.validUntil) {
    throw new AppError("Este orçamento expirou", 400, "QUOTE_EXPIRED");
  }

  if (quote.status === "PENDING") {
    throw new AppError(
      "Este fluxo foi descontinuado. Para aceitar o orçamento é obrigatória a pré-autorização no cartão: " +
        "POST /api/v1/service-flow/approve-quote com JSON { quoteId, paymentMethodId } (paymentMethodId = id do método em GET /api/v1/payment-methods).",
      400,
      "QUOTE_ACCEPT_DEPRECATED",
    );
  }

  if (quote.status === "ACCEPTED") {
    throw new AppError(
      "Orçamento já consta como aceito. Se ainda precisa registrar o hold de pagamento (ex.: dados antigos), use POST /api/v1/service-flow/approve-quote com quoteId e paymentMethodId.",
      400,
      "QUOTE_ACCEPT_USE_HOLD_FLOW",
    );
  }

  throw new AppError(
    "Este orçamento não pode mais ser aceito",
    400,
    "QUOTE_NOT_AVAILABLE",
  );
};

/**
 * POST /api/v1/quotes/:quoteId/reject
 * Cliente rejeita orçamento
 */
export const rejectQuote = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { quoteId } = req.params;

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      serviceRequest: true,
    },
  });

  if (!quote) {
    throw new AppError("Orçamento não encontrado", 404, "QUOTE_NOT_FOUND");
  }

  if (quote.serviceRequest.userId !== userId) {
    throw new AppError(
      "Você não tem permissão para rejeitar este orçamento",
      403,
      "FORBIDDEN",
    );
  }

  if (quote.status !== "PENDING") {
    throw new AppError(
      "Este orçamento não pode ser rejeitado",
      400,
      "QUOTE_NOT_PENDING",
    );
  }

  await prisma.quote.update({
    where: { id: quoteId },
    data: {
      status: "REJECTED",
      rejectedAt: new Date(),
    },
  });

  logger.info(`Orçamento rejeitado: ${quote.quoteNumber}`);

  res.json({
    success: true,
    message: "Orçamento rejeitado",
  });
};
