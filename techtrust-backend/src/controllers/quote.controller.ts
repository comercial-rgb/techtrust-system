/**
 * ============================================
 * QUOTE CONTROLLER
 * ============================================
 * Orçamentos de fornecedores
 */

import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error-handler';
import { logger } from '../config/logger';
import { calculateRoadDistance } from '../utils/distance';

/**
 * POST /api/v1/quotes
 * Fornecedor cria orçamento para uma solicitação
 */
export const createQuote = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const {
    serviceRequestId,
    partsCost,
    laborCost,
    additionalFees = 0,
    taxAmount = 0,
    partsList,
    laborDescription,
    estimatedHours,
    estimatedCompletionTime,
    availableDate,
    availableTime,
    warrantyMonths,
    warrantyMileage,
    warrantyDescription,
    notes,
  } = req.body;

  // Verificar se é fornecedor
  if (req.user!.role !== 'PROVIDER') {
    throw new AppError('Apenas fornecedores podem criar orçamentos', 403, 'NOT_A_PROVIDER');
  }

  // Verificar se solicitação existe e está aberta
  const serviceRequest = await prisma.serviceRequest.findUnique({
    where: { id: serviceRequestId },
  });

  if (!serviceRequest) {
    throw new AppError('Solicitação não encontrada', 404, 'REQUEST_NOT_FOUND');
  }

  if (serviceRequest.status !== 'SEARCHING_PROVIDERS' && serviceRequest.status !== 'QUOTES_RECEIVED') {
    throw new AppError('Esta solicitação não está mais aceitando orçamentos', 400, 'REQUEST_CLOSED');
  }

  // Verificar se deadline passou
  if (serviceRequest.quoteDeadline && new Date() > serviceRequest.quoteDeadline) {
    throw new AppError('Prazo para enviar orçamentos expirou', 400, 'QUOTE_DEADLINE_PASSED');
  }

  // Verificar se já atingiu máximo de quotes
  const existingQuotes = await prisma.quote.count({
    where: { serviceRequestId },
  });

  if (existingQuotes >= serviceRequest.maxQuotes) {
    throw new AppError('Esta solicitação já tem o máximo de orçamentos', 400, 'MAX_QUOTES_REACHED');
  }

  // Verificar se fornecedor já enviou orçamento
  const existingQuote = await prisma.quote.findFirst({
    where: {
      serviceRequestId,
      providerId,
    },
  });

  if (existingQuote) {
    throw new AppError('Você já enviou um orçamento para esta solicitação', 409, 'QUOTE_ALREADY_EXISTS');
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
      serviceRequest.serviceLongitude.toNumber()
    );

    distanceKm = roadResult.distanceKm;

    // Calcular taxa de deslocamento
    const freeKm = Number(providerProfile.freeKm);
    const extraFeePerKm = Number(providerProfile.extraFeePerKm);
    
    if (distanceKm > freeKm) {
      travelFee = (distanceKm - freeKm) * extraFeePerKm;
    }

    logger.info(`Distância calculada: ${distanceKm.toFixed(2)} km (${roadResult.isRoadDistance ? 'OSRM road' : 'Haversine estimate'}), Taxa: $ ${travelFee.toFixed(2)}`);
  }

  // Calcular total (incluindo taxa de deslocamento)
  const totalAmount = Number(partsCost) + Number(laborCost) + Number(additionalFees) + Number(taxAmount) + travelFee;

  // Gerar número do orçamento
  const quoteNumber = `QT-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

  // Validade do orçamento (48 horas)
  const validUntil = new Date();
  validUntil.setHours(validUntil.getHours() + 48);

  // Criar orçamento
  const quote = await prisma.quote.create({
    data: {
      quoteNumber,
      serviceRequestId,
      providerId,
      partsCost,
      laborCost,
      additionalFees,
      taxAmount,
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
      notes,
      status: 'PENDING',
      validUntil,
    },
  });

  // Atualizar status da solicitação
  await prisma.serviceRequest.update({
    where: { id: serviceRequestId },
    data: {
      status: 'QUOTES_RECEIVED',
      quotesCount: existingQuotes + 1,
    },
  });

  logger.info(`Orçamento criado: ${quote.quoteNumber} por ${providerId}`);

  res.status(201).json({
    success: true,
    message: 'Orçamento enviado com sucesso!',
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
    throw new AppError('Solicitação não encontrada', 404, 'REQUEST_NOT_FOUND');
  }

  const quotes = await prisma.quote.findMany({
    where: { serviceRequestId: requestId },
    include: {
      provider: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          providerProfile: {
            select: {
              businessName: true,
              businessPhone: true,
              averageRating: true,
              totalReviews: true,
              totalServicesCompleted: true,
              address: true,
              city: true,
              state: true,
            },
          },
        },
      },
    },
    orderBy: {
      totalAmount: 'asc',
    },
  });

  res.json({
    success: true,
    data: quotes,
  });
};

/**
 * GET /api/v1/quotes/:quoteId
 * Ver detalhes de um orçamento
 */
export const getQuote = async (req: Request, res: Response) => {
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
          phone: true,
          providerProfile: true,
        },
      },
    },
  });

  if (!quote) {
    throw new AppError('Orçamento não encontrado', 404, 'QUOTE_NOT_FOUND');
  }

  // Enrich response with computed fields for mobile consumption
  const enrichedQuote = {
    ...quote,
    // Map partsList JSON → items array for mobile
    items: Array.isArray(quote.partsList) ? (quote.partsList as any[]).map((item: any, idx: number) => ({
      id: item.id || String(idx + 1),
      type: item.type === 'LABOR' || item.type === 'service' ? 'LABOR' : 'PART',
      description: item.description || '',
      partCode: item.partCode || item.brand || undefined,
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
    })) : [],
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
 * Cliente aceita orçamento
 */
export const acceptQuote = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { quoteId } = req.params;

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      serviceRequest: true,
    },
  });

  if (!quote) {
    throw new AppError('Orçamento não encontrado', 404, 'QUOTE_NOT_FOUND');
  }

  // Verificar se solicitação pertence ao usuário
  if (quote.serviceRequest.userId !== userId) {
    throw new AppError('Você não tem permissão para aceitar este orçamento', 403, 'FORBIDDEN');
  }

  // Verificar se ainda está válido
  if (new Date() > quote.validUntil) {
    throw new AppError('Este orçamento expirou', 400, 'QUOTE_EXPIRED');
  }

  // Verificar se status permite aceitação
  if (quote.status !== 'PENDING') {
    throw new AppError('Este orçamento não pode mais ser aceito', 400, 'QUOTE_NOT_AVAILABLE');
  }

  // Usar transaction
  await prisma.$transaction([
    // Aceitar orçamento
    prisma.quote.update({
      where: { id: quoteId },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      },
    }),
    // Rejeitar outros orçamentos
    prisma.quote.updateMany({
      where: {
        serviceRequestId: quote.serviceRequestId,
        id: { not: quoteId },
        status: 'PENDING',
      },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
      },
    }),
    // Atualizar solicitação
    prisma.serviceRequest.update({
      where: { id: quote.serviceRequestId },
      data: {
        status: 'QUOTE_ACCEPTED',
        acceptedQuoteId: quoteId,
      },
    }),
  ]);

  // Criar Work Order
  const orderNumber = `WO-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

  const workOrder = await prisma.workOrder.create({
    data: {
      orderNumber,
      serviceRequestId: quote.serviceRequestId,
      quoteId: quote.id,
      customerId: userId,
      providerId: quote.providerId,
      vehicleId: quote.serviceRequest.vehicleId,
      status: 'PENDING_START',
      originalAmount: quote.totalAmount,
      finalAmount: quote.totalAmount,
      warrantyMonths: quote.warrantyMonths,
      warrantyMileage: quote.warrantyMileage,
    },
  });

  logger.info(`Orçamento aceito: ${quote.quoteNumber}, Work Order criada: ${workOrder.orderNumber}`);

  res.json({
    success: true,
    message: 'Orçamento aceito! Ordem de serviço criada.',
    data: {
      quote,
      workOrder,
    },
  });
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
    throw new AppError('Orçamento não encontrado', 404, 'QUOTE_NOT_FOUND');
  }

  if (quote.serviceRequest.userId !== userId) {
    throw new AppError('Você não tem permissão para rejeitar este orçamento', 403, 'FORBIDDEN');
  }

  if (quote.status !== 'PENDING') {
    throw new AppError('Este orçamento não pode ser rejeitado', 400, 'QUOTE_NOT_PENDING');
  }

  await prisma.quote.update({
    where: { id: quoteId },
    data: {
      status: 'REJECTED',
      rejectedAt: new Date(),
    },
  });

  logger.info(`Orçamento rejeitado: ${quote.quoteNumber}`);

  res.json({
    success: true,
    message: 'Orçamento rejeitado',
  });
};
