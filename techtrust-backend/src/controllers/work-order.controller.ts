/**
 * ============================================
 * WORK ORDER CONTROLLER
 * ============================================
 * Ordens de serviço (após aceitar orçamento)
 */

import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error-handler';
import { logger } from '../config/logger';

/**
 * GET /api/v1/work-orders
 * Listar ordens de serviço (cliente ou fornecedor)
 */
export const getWorkOrders = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const userRole = req.user!.role;
  const { status, page = 1, limit = 10 } = req.query;

  const where: any = {};

  // Cliente vê suas ordens
  if (userRole === 'CLIENT') {
    where.customerId = userId;
  }
  // Fornecedor vê ordens dele
  else if (userRole === 'PROVIDER') {
    where.providerId = userId;
  }

  if (status) {
    where.status = status;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [orders, total] = await Promise.all([
    prisma.workOrder.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: {
        createdAt: 'desc',
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
        provider: {
          select: {
            fullName: true,
            phone: true,
            providerProfile: {
              select: {
                businessName: true,
                businessPhone: true,
              },
            },
          },
        },
        customer: {
          select: {
            fullName: true,
            phone: true,
          },
        },
      },
    }),
    prisma.workOrder.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      orders,
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
 * GET /api/v1/work-orders/:orderId
 * Ver detalhes de uma ordem
 */
export const getWorkOrder = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const userRole = req.user!.role;
  const { orderId } = req.params;

  const where: any = { id: orderId };

  if (userRole === 'CLIENT') {
    where.customerId = userId;
  } else if (userRole === 'PROVIDER') {
    where.providerId = userId;
  }

  const order = await prisma.workOrder.findFirst({
    where,
    include: {
      serviceRequest: {
        include: {
          vehicle: true,
        },
      },
      quote: true,
      vehicle: true,
      provider: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          providerProfile: true,
        },
      },
      customer: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
        },
      },
      payments: true,
    },
  });

  if (!order) {
    throw new AppError('Ordem de serviço não encontrada', 404, 'ORDER_NOT_FOUND');
  }

  res.json({
    success: true,
    data: order,
  });
};

/**
 * POST /api/v1/work-orders/:orderId/start
 * Fornecedor inicia serviço
 */
export const startWorkOrder = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const { orderId } = req.params;

  const order = await prisma.workOrder.findFirst({
    where: {
      id: orderId,
      providerId: providerId,
    },
  });

  if (!order) {
    throw new AppError('Ordem não encontrada', 404, 'ORDER_NOT_FOUND');
  }

  if (order.status !== 'PENDING_START') {
    throw new AppError('Esta ordem não pode ser iniciada', 400, 'INVALID_STATUS');
  }

  await prisma.workOrder.update({
    where: { id: orderId },
    data: {
      status: 'IN_PROGRESS',
      startedAt: new Date(),
    },
  });

  // Atualizar service request
  await prisma.serviceRequest.update({
    where: { id: order.serviceRequestId },
    data: {
      status: 'IN_PROGRESS',
    },
  });

  logger.info(`Ordem iniciada: ${order.orderNumber}`);

  res.json({
    success: true,
    message: 'Serviço iniciado!',
  });
};

/**
 * POST /api/v1/work-orders/:orderId/complete
 * Fornecedor marca como concluído
 */
export const completeWorkOrder = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const { orderId } = req.params;

  const order = await prisma.workOrder.findFirst({
    where: {
      id: orderId,
      providerId: providerId,
    },
  });

  if (!order) {
    throw new AppError('Ordem não encontrada', 404, 'ORDER_NOT_FOUND');
  }

  if (order.status !== 'IN_PROGRESS') {
    throw new AppError('Ordem não está em progresso', 400, 'INVALID_STATUS');
  }

  await prisma.workOrder.update({
    where: { id: orderId },
    data: {
      status: 'AWAITING_APPROVAL',
      completedAt: new Date(),
    },
  });

  logger.info(`Ordem concluída (aguardando aprovação): ${order.orderNumber}`);

  res.json({
    success: true,
    message: 'Serviço concluído! Aguardando aprovação do cliente.',
  });
};

/**
 * POST /api/v1/work-orders/:orderId/approve
 * Cliente aprova conclusão
 */
export const approveCompletion = async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const { orderId } = req.params;

  const order = await prisma.workOrder.findFirst({
    where: {
      id: orderId,
      customerId: customerId,
    },
  });

  if (!order) {
    throw new AppError('Ordem não encontrada', 404, 'ORDER_NOT_FOUND');
  }

  if (order.status !== 'AWAITING_APPROVAL') {
    throw new AppError('Ordem não está aguardando aprovação', 400, 'INVALID_STATUS');
  }

  await prisma.$transaction([
    // Aprovar ordem
    prisma.workOrder.update({
      where: { id: orderId },
      data: {
        status: 'COMPLETED',
      },
    }),
    // Atualizar service request
    prisma.serviceRequest.update({
      where: { id: order.serviceRequestId },
      data: {
        status: 'COMPLETED',
      },
    }),
  ]);

  logger.info(`Ordem aprovada: ${order.orderNumber}`);

  res.json({
    success: true,
    message: 'Serviço aprovado! Você pode avaliar o fornecedor agora.',
  });
};

/**
 * POST /api/v1/work-orders/:orderId/report-issue
 * Cliente reporta problema
 */
export const reportIssue = async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const { orderId } = req.params;

  const order = await prisma.workOrder.findFirst({
    where: {
      id: orderId,
      customerId: customerId,
    },
  });

  if (!order) {
    throw new AppError('Ordem não encontrada', 404, 'ORDER_NOT_FOUND');
  }

  await prisma.workOrder.update({
    where: { id: orderId },
    data: {
      status: 'DISPUTED',
    },
  });

  logger.warn(`Disputa aberta: ${order.orderNumber}`);

  res.json({
    success: true,
    message: 'Problema reportado. Nossa equipe entrará em contato em breve.',
  });
};
