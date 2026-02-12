/**
 * ============================================
 * SERVICE REQUEST CONTROLLER
 * ============================================
 * Solicitações de serviço do cliente
 */

import { Request, Response } from "express";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error-handler";
import { logger } from "../config/logger";
import { geocodeAddress } from "../services/geocoding.service";

/**
 * POST /api/v1/service-requests
 * Criar nova solicitação de serviço
 */
export const createServiceRequest = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const {
    vehicleId,
    serviceType,
    title,
    description,
    serviceLocationType,
    customerAddress,
    preferredDate,
    preferredTime,
    isUrgent,
    location,
    serviceLatitude,
    serviceLongitude,
  } = req.body;

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
  if (subscription.maxServiceRequestsPerMonth) {
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

    if (requestsThisMonth >= subscription.maxServiceRequestsPerMonth) {
      throw new AppError(
        `Você atingiu o limite de ${subscription.maxServiceRequestsPerMonth} solicitações por mês do plano ${subscription.plan}`,
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

  // Limites de solicitações ativas por plano
  const activeLimits: Record<string, number> = {
    FREE: 2,
    BASIC: 5,
    PREMIUM: 10,
    ENTERPRISE: 999,
  };

  const maxActive = activeLimits[subscription.plan] || 2;

  if (activeRequests >= maxActive) {
    throw new AppError(
      `Você tem ${activeRequests} solicitações ativas. Limite do plano ${subscription.plan}: ${maxActive}`,
      403,
      "ACTIVE_REQUESTS_LIMIT",
    );
  }

  // Gerar número da solicitação
  const requestNumber = `SR-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

  // Calcular deadline para quotes (2 horas)
  const quoteDeadline = new Date();
  quoteDeadline.setHours(quoteDeadline.getHours() + 2);

  // Calcular expiração (24 horas se não receber quotes)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

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

  // Criar solicitação
  const serviceRequest = await prisma.serviceRequest.create({
    data: {
      requestNumber,
      userId,
      vehicleId,
      serviceType,
      title,
      description,
      serviceLocationType,
      customerAddress,
      serviceLatitude: finalLatitude,
      serviceLongitude: finalLongitude,
      locationType: serviceLocationType || null,
      preferredDate: preferredDate ? new Date(preferredDate) : null,
      preferredTime: preferredTime ? new Date(preferredTime) : null,
      isUrgent: isUrgent || false,
      status: "SEARCHING_PROVIDERS",
      maxQuotes: 5,
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

  res.json({
    success: true,
    data: request,
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

  // Calcular taxa de cancelamento se já tem orçamento aceito
  let cancellationFee = 0;

  if (request.acceptedQuoteId) {
    const hoursUntilScheduled = request.scheduledFor
      ? (new Date(request.scheduledFor).getTime() - Date.now()) /
        (1000 * 60 * 60)
      : 999;

    if (hoursUntilScheduled > 24) {
      cancellationFee = 10; // 10% se >24h
    } else {
      cancellationFee = 25; // 25% se <24h
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
      cancellationFee: `${cancellationFee}%`,
      note:
        cancellationFee > 0
          ? "Taxa de cancelamento será aplicada no pagamento"
          : "Sem taxa de cancelamento",
    },
  });
};
