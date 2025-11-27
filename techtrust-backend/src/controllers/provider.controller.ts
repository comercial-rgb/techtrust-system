/**
 * ============================================
 * PROVIDER CONTROLLER
 * ============================================
 * Features específicas para fornecedores
 */

import { Request, Response } from 'express';
import { prisma } from '../config/database';

/**
 * GET /api/v1/providers/dashboard
 * Dashboard do fornecedor
 */
export const getDashboard = async (req: Request, res: Response) => {
  const providerId = req.user!.id;

  // Estatísticas gerais
  const [profile, activeQuotes, activeWorkOrders, completedServices, pendingPayments] = await Promise.all([
    prisma.providerProfile.findUnique({
      where: { userId: providerId },
    }),
    prisma.quote.count({
      where: {
        providerId,
        status: 'PENDING',
      },
    }),
    prisma.workOrder.count({
      where: {
        providerId,
        status: {
          in: ['PENDING_START', 'IN_PROGRESS', 'AWAITING_APPROVAL'],
        },
      },
    }),
    prisma.workOrder.count({
      where: {
        providerId,
        status: 'COMPLETED',
      },
    }),
    prisma.payment.aggregate({
      where: {
        providerId,
        status: 'PENDING',
      },
      _sum: {
        providerAmount: true,
      },
    }),
  ]);

  // Receita total
  const totalRevenue = await prisma.payment.aggregate({
    where: {
      providerId,
      status: 'CAPTURED',
    },
    _sum: {
      providerAmount: true,
    },
  });

  // Últimos work orders
  const recentWorkOrders = await prisma.workOrder.findMany({
    where: { providerId },
    take: 5,
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      serviceRequest: {
        select: {
          title: true,
          serviceType: true,
        },
      },
      customer: {
        select: {
          fullName: true,
        },
      },
    },
  });

  res.json({
    success: true,
    data: {
      profile,
      stats: {
        activeQuotes,
        activeWorkOrders,
        completedServices,
        averageRating: profile?.averageRating || 0,
        totalReviews: profile?.totalReviews || 0,
        pendingPayments: pendingPayments._sum.providerAmount || 0,
        totalRevenue: totalRevenue._sum?.providerAmount || 0,
      },
      recentWorkOrders,
    },
  });
};

/**
 * GET /api/v1/providers/available-requests
 * Buscar solicitações disponíveis para orçamento
 */
export const getAvailableRequests = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const { serviceType, page = 1, limit = 10 } = req.query;

  // Verificar se fornecedor já enviou quote
  const myQuotes = await prisma.quote.findMany({
    where: { providerId },
    select: { serviceRequestId: true },
  });

  const quotedRequestIds = myQuotes.map(q => q.serviceRequestId);

  const where: any = {
    status: {
      in: ['SEARCHING_PROVIDERS', 'QUOTES_RECEIVED'],
    },
    quotesCount: {
      lt: 5, // Ainda aceita orçamentos
    },
    NOT: {
      id: {
        in: quotedRequestIds, // Não mostrar onde já enviei quote
      },
    },
  };

  if (serviceType) {
    where.serviceType = serviceType;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [requests, total] = await Promise.all([
    prisma.serviceRequest.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        vehicle: {
          select: {
            make: true,
            model: true,
            year: true,
          },
        },
        user: {
          select: {
            fullName: true,
            city: true,
            state: true,
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
 * GET /api/v1/providers/my-quotes
 * Meus orçamentos enviados
 */
export const getMyQuotes = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const { status, page = 1, limit = 10 } = req.query;

  const where: any = { providerId };

  if (status) {
    where.status = status;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [quotes, total] = await Promise.all([
    prisma.quote.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        serviceRequest: {
          select: {
            requestNumber: true,
            title: true,
            serviceType: true,
            status: true,
            vehicle: {
              select: {
                make: true,
                model: true,
                year: true,
              },
            },
          },
        },
      },
    }),
    prisma.quote.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      quotes,
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
 * PATCH /api/v1/providers/profile
 * Atualizar perfil do fornecedor
 */
export const updateProfile = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const {
    businessName,
    businessPhone,
    businessEmail,
    address,
    city,
    state,
    zipCode,
    serviceRadiusKm,
    specialties,
    businessHours,
  } = req.body;

  const profile = await prisma.providerProfile.upsert({
    where: { userId: providerId },
    create: {
      userId: providerId,
      businessName: businessName || 'My Business',
      businessPhone,
      businessEmail,
      address,
      city,
      state,
      zipCode,
      serviceRadiusKm: serviceRadiusKm || 50,
      specialties: specialties || [],
      businessHours: businessHours || {},
      isVerified: false,
      averageRating: 0,
      totalReviews: 0,
      totalServicesCompleted: 0,
    },
    update: {
      ...(businessName && { businessName }),
      ...(businessPhone && { businessPhone }),
      ...(businessEmail && { businessEmail }),
      ...(address !== undefined && { address }),
      ...(city !== undefined && { city }),
      ...(state !== undefined && { state }),
      ...(zipCode !== undefined && { zipCode }),
      ...(serviceRadiusKm && { serviceRadiusKm: Number(serviceRadiusKm) }),
      ...(specialties && { specialties }),
      ...(businessHours && { businessHours }),
    },
  });

  res.json({
    success: true,
    message: 'Perfil atualizado com sucesso',
    data: profile,
  });
};