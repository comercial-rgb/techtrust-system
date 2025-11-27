/**
 * ============================================
 * REVIEW CONTROLLER
 * ============================================
 * Sistema de avaliações
 */

import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error-handler';
import { logger } from '../config/logger';

/**
 * POST /api/v1/reviews
 * Cliente avalia fornecedor após serviço
 */
export const createReview = async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const {
    workOrderId,
    ratingQuality,
    ratingTimeliness,
    ratingCommunication,
    ratingValue,
    customerComment,
  } = req.body;

  // Verificar work order
  const workOrder = await prisma.workOrder.findFirst({
    where: {
      id: workOrderId,
      customerId: customerId,
      status: 'COMPLETED',
    },
  });

  if (!workOrder) {
    throw new AppError('Ordem não encontrada ou não está completa', 404, 'ORDER_NOT_FOUND');
  }

  // Verificar se já avaliou
  const existingReview = await prisma.review.findFirst({
    where: {
      workOrderId: workOrderId,
    },
  });

  if (existingReview) {
    throw new AppError('Você já avaliou este serviço', 409, 'ALREADY_REVIEWED');
  }

  // Calcular rating geral
  const overallRating = (
    Number(ratingQuality) +
    Number(ratingTimeliness) +
    Number(ratingCommunication) +
    Number(ratingValue)
  ) / 4;

  // Criar avaliação
  const review = await prisma.review.create({
    data: {
      workOrderId,
      customerId,
      providerId: workOrder.providerId,
      customerRating: Math.round(overallRating),
      qualityRating: Number(ratingQuality),
      timelinessRating: Number(ratingTimeliness),
      communicationRating: Number(ratingCommunication),
      valueRating: Number(ratingValue),
      customerComment,
    },
  });

  // Atualizar estatísticas do fornecedor
  const provider = await prisma.providerProfile.findUnique({
    where: { userId: workOrder.providerId },
  });

  if (provider) {
    const totalReviews = provider.totalReviews + 1;
    const currentTotal = Number(provider.averageRating) * provider.totalReviews;
    const newAverage = (currentTotal + overallRating) / totalReviews;

    await prisma.providerProfile.update({
      where: { userId: workOrder.providerId },
      data: {
        averageRating: newAverage,
        totalReviews: totalReviews,
        totalServicesCompleted: provider.totalServicesCompleted + 1,
      },
    });
  }

  logger.info(`Avaliação criada para work order: ${workOrder.orderNumber}`);

  res.status(201).json({
    success: true,
    message: 'Avaliação enviada com sucesso!',
    data: review,
  });
};

/**
 * GET /api/v1/reviews/provider/:providerId
 * Listar avaliações de um fornecedor
 */
export const getProviderReviews = async (req: Request, res: Response) => {
  const { providerId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const skip = (Number(page) - 1) * Number(limit);

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: { providerId },
      skip,
      take: Number(limit),
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        customer: {
          select: {
            fullName: true,
          },
        },
        workOrder: {
          select: {
            orderNumber: true,
            serviceRequest: {
              select: {
                title: true,
                serviceType: true,
              },
            },
          },
        },
      },
    }),
    prisma.review.count({ where: { providerId } }),
  ]);

  // Calcular média de cada categoria
  const averages = await prisma.review.aggregate({
    where: { providerId },
    _avg: {
      customerRating: true,
      qualityRating: true,
      timelinessRating: true,
      communicationRating: true,
      valueRating: true,
    },
  });

  res.json({
    success: true,
    data: {
      reviews,
      averages: averages._avg,
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
 * POST /api/v1/reviews/:reviewId/response
 * Fornecedor responde à avaliação
 */
export const respondToReview = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const { reviewId } = req.params;
  const { providerResponse } = req.body;

  const review = await prisma.review.findFirst({
    where: {
      id: reviewId,
      providerId: providerId,
    },
  });

  if (!review) {
    throw new AppError('Avaliação não encontrada', 404, 'REVIEW_NOT_FOUND');
  }

  if (review.providerComment) {
    throw new AppError('Você já respondeu esta avaliação', 400, 'ALREADY_RESPONDED');
  }

  const updatedReview = await prisma.review.update({
    where: { id: reviewId },
    data: {
      providerComment: providerResponse,
      providerReviewDate: new Date(),
    },
  });

  logger.info(`Fornecedor respondeu avaliação: ${reviewId}`);

  res.json({
    success: true,
    message: 'Resposta enviada com sucesso!',
    data: updatedReview,
  });
};

/**
 * GET /api/v1/reviews/my-reviews
 * Minhas avaliações (cliente ou fornecedor)
 */
export const getMyReviews = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const userRole = req.user!.role;

  const where = userRole === 'CLIENT'
    ? { customerId: userId }
    : { providerId: userId };

  const reviews = await prisma.review.findMany({
    where,
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      customer: {
        select: {
          fullName: true,
        },
      },
      provider: {
        select: {
          fullName: true,
          providerProfile: {
            select: {
              businessName: true,
            },
          },
        },
      },
      workOrder: {
        select: {
          orderNumber: true,
          serviceRequest: {
            select: {
              title: true,
              serviceType: true,
            },
          },
        },
      },
    },
  });

  res.json({
    success: true,
    data: reviews,
  });
};