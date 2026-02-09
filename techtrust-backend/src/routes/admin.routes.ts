/**
 * ============================================
 * ADMIN ROUTES - Rotas Administrativas Completas
 * ============================================
 * Controle total do sistema para administradores
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';
import { hashPassword } from '../utils/password';

const router = Router();

// Middleware para todas as rotas - requer autenticação e role ADMIN
router.use(authenticate, authorize('ADMIN'));

// ============================================
// DASHBOARD - Estatísticas Gerais
// ============================================

router.get('/dashboard/stats', asyncHandler(async (_req: Request, res: Response) => {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));

  const [
    totalClients,
    totalProviders,
    totalAdmins,
    activeClients,
    pendingProviders,
    verifiedProviders,
    totalRequests,
    activeRequests,
    completedRequests,
    cancelledRequests,
    totalWorkOrders,
    activeWorkOrders,
    totalPayments,
    monthlyRevenue,
    weeklyRevenue,
    pendingPayments,
    totalReviews,
    avgRating,
    recentUsers,
    recentRequests,
    recentPayments
  ] = await Promise.all([
    // Usuários
    prisma.user.count({ where: { role: 'CLIENT' } }),
    prisma.user.count({ where: { role: 'PROVIDER' } }),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.user.count({ where: { role: 'CLIENT', status: 'ACTIVE' } }),
    prisma.providerProfile.count({ where: { isVerified: false } }),
    prisma.providerProfile.count({ where: { isVerified: true } }),
    // Solicitações
    prisma.serviceRequest.count(),
    prisma.serviceRequest.count({
      where: { status: { in: ['SEARCHING_PROVIDERS', 'QUOTES_RECEIVED', 'IN_PROGRESS'] } }
    }),
    prisma.serviceRequest.count({ where: { status: 'COMPLETED' } }),
    prisma.serviceRequest.count({ where: { status: 'CANCELLED' } }),
    // Ordens de Serviço
    prisma.workOrder.count(),
    prisma.workOrder.count({
      where: { status: { in: ['CREATED', 'IN_PROGRESS', 'WAITING_PARTS'] } }
    }),
    // Pagamentos
    prisma.payment.aggregate({ _sum: { totalAmount: true }, where: { status: 'CAPTURED' } }),
    prisma.payment.aggregate({
      _sum: { totalAmount: true },
      where: { status: 'CAPTURED', createdAt: { gte: startOfMonth } }
    }),
    prisma.payment.aggregate({
      _sum: { totalAmount: true },
      where: { status: 'CAPTURED', createdAt: { gte: startOfWeek } }
    }),
    prisma.payment.count({ where: { status: 'PENDING' } }),
    // Reviews
    prisma.review.count(),
    prisma.review.aggregate({ _avg: { customerRating: true } }),
    // Recentes
    prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: { id: true, fullName: true, email: true, phone: true, role: true, status: true, createdAt: true }
    }),
    prisma.serviceRequest.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { fullName: true } },
        vehicle: { select: { make: true, model: true, year: true } }
      }
    }),
    prisma.payment.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { fullName: true } },
        provider: { select: { fullName: true } }
      }
    })
  ]);

  res.json({
    users: {
      totalClients,
      totalProviders,
      totalAdmins,
      activeClients,
      pendingProviders,
      verifiedProviders
    },
    requests: {
      total: totalRequests,
      active: activeRequests,
      completed: completedRequests,
      cancelled: cancelledRequests
    },
    workOrders: {
      total: totalWorkOrders,
      active: activeWorkOrders
    },
    payments: {
      totalRevenue: totalPayments._sum?.totalAmount || 0,
      monthlyRevenue: monthlyRevenue._sum?.totalAmount || 0,
      weeklyRevenue: weeklyRevenue._sum?.totalAmount || 0,
      pending: pendingPayments
    },
    reviews: {
      total: totalReviews,
      averageRating: avgRating._avg?.customerRating || 0
    },
    recent: {
      users: recentUsers,
      requests: recentRequests,
      payments: recentPayments
    }
  });
}));

// ============================================
// GESTÃO DE USUÁRIOS (CLIENTES)
// ============================================

// Listar todos os usuários
router.get('/users', asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20, role, status, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
  
  const where: any = {};
  if (role) where.role = role;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { fullName: { contains: search as string, mode: 'insensitive' } },
      { email: { contains: search as string, mode: 'insensitive' } },
      { phone: { contains: search as string } }
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      take: Number(limit),
      skip: (Number(page) - 1) * Number(limit),
      orderBy: { [sortBy as string]: sortOrder },
      include: {
        providerProfile: true,
        _count: {
          select: { serviceRequests: true, vehicles: true, reviewsGiven: true }
        }
      }
    }),
    prisma.user.count({ where })
  ]);

  res.json({
    users,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit))
    }
  });
}));

// Buscar usuário por ID
router.get('/users/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      vehicles: true,
      serviceRequests: {
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          vehicle: true,
          _count: { select: { quotes: true } }
        }
      },
      providerProfile: true,
      reviewsGiven: {
        include: { provider: { select: { fullName: true } } }
      },
      reviewsReceived: {
        include: { customer: { select: { fullName: true } } }
      },
      subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
      _count: {
        select: { 
          serviceRequests: true, 
          vehicles: true, 
          reviewsGiven: true,
          reviewsReceived: true
        }
      }
    }
  });

  if (!user) {
    res.status(404).json({ message: 'Usuário não encontrado' });
    return;
  }

  res.json(user);
}));

// Criar novo usuário
router.post('/users', asyncHandler(async (req: Request, res: Response) => {
  const { fullName, email, phone, password, role = 'CLIENT' } = req.body;

  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ email }, { phone }] }
  });

  if (existingUser) {
    res.status(400).json({ message: 'Email ou telefone já cadastrado' });
    return;
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      fullName,
      email,
      phone,
      passwordHash,
      role,
      status: 'ACTIVE',
      phoneVerified: true,
      emailVerified: true
    }
  });

  res.status(201).json({ message: 'Usuário criado com sucesso', user });
}));

// Atualizar usuário
router.put('/users/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { fullName, email, phone, role, status } = req.body;

  const user = await prisma.user.update({
    where: { id },
    data: { fullName, email, phone, role, status }
  });

  res.json({ message: 'Usuário atualizado', user });
}));

// Alterar status do usuário
router.patch('/users/:id/status', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  const user = await prisma.user.update({
    where: { id },
    data: { status }
  });

  // Log de auditoria (poderia salvar em tabela de logs)
  console.log(`[ADMIN] Status do usuário ${id} alterado para ${status}. Motivo: ${reason || 'Não informado'}`);

  res.json({ message: `Status alterado para ${status}`, user });
}));

// Banir usuário
router.post('/users/:id/ban', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason, permanent = true } = req.body;

  const user = await prisma.user.update({
    where: { id },
    data: { status: 'SUSPENDED' }
  });

  console.log(`[ADMIN] Usuário ${id} banido. Permanente: ${permanent}. Motivo: ${reason}`);

  res.json({ message: 'Usuário banido com sucesso', user });
}));

// Desbanir usuário
router.post('/users/:id/unban', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await prisma.user.update({
    where: { id },
    data: { status: 'ACTIVE' }
  });

  res.json({ message: 'Usuário reativado', user });
}));

// Resetar senha do usuário
router.post('/users/:id/reset-password', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  const passwordHash = await hashPassword(newPassword || 'TechTrust@123');

  await prisma.user.update({
    where: { id },
    data: { passwordHash }
  });

  res.json({ message: 'Senha resetada com sucesso' });
}));

// Verificar conta manualmente
router.post('/users/:id/verify', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { verifyPhone = true, verifyEmail = true } = req.body;

  const user = await prisma.user.update({
    where: { id },
    data: {
      phoneVerified: verifyPhone,
      emailVerified: verifyEmail,
      status: 'ACTIVE'
    }
  });

  res.json({ message: 'Conta verificada', user });
}));

// Deletar usuário (soft delete)
router.delete('/users/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { permanent = false } = req.body;

  if (permanent) {
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'Usuário excluído permanentemente' });
  } else {
    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'INACTIVE' }
    });
    res.json({ message: 'Usuário desativado' });
  }
}));

// ============================================
// GESTÃO DE FORNECEDORES
// ============================================

// Listar fornecedores
router.get('/providers', asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20, verified, search } = req.query;
  
  const where: any = { role: 'PROVIDER' };
  
  if (search) {
    where.OR = [
      { fullName: { contains: search as string, mode: 'insensitive' } },
      { email: { contains: search as string, mode: 'insensitive' } }
    ];
  }

  const providers = await prisma.user.findMany({
    where,
    take: Number(limit),
    skip: (Number(page) - 1) * Number(limit),
    orderBy: { createdAt: 'desc' },
    include: {
      providerProfile: true,
      _count: {
        select: { quotes: true, workOrdersAsProvider: true, reviewsReceived: true }
      }
    }
  });

  // Filtrar por verificação
  let filteredProviders = providers;
  if (verified !== undefined) {
    filteredProviders = providers.filter(p => 
      p.providerProfile?.isVerified === (verified === 'true')
    );
  }

  const total = await prisma.user.count({ where });

  res.json({
    providers: filteredProviders,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit))
    }
  });
}));

// Detalhes do fornecedor
router.get('/providers/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const provider = await prisma.user.findUnique({
    where: { id },
    include: {
      providerProfile: true,
      quotes: {
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          serviceRequest: {
            include: { user: { select: { fullName: true } } }
          }
        }
      },
      workOrdersAsProvider: {
        take: 20,
        orderBy: { createdAt: 'desc' }
      },
      reviewsReceived: {
        include: { customer: { select: { fullName: true } } }
      },
      _count: {
        select: { quotes: true, workOrdersAsProvider: true, reviewsReceived: true }
      }
    }
  });

  if (!provider) {
    res.status(404).json({ message: 'Fornecedor não encontrado' });
    return;
  }

  res.json(provider);
}));

// Aprovar fornecedor
router.post('/providers/:id/approve', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const profile = await prisma.providerProfile.update({
    where: { userId: id },
    data: { 
      isVerified: true, 
      verifiedAt: new Date(),
      backgroundCheckCompleted: true
    }
  });

  await prisma.user.update({
    where: { id },
    data: { status: 'ACTIVE' }
  });

  // TODO: Enviar notificação de aprovação

  res.json({ message: 'Fornecedor aprovado com sucesso', profile });
}));

// Rejeitar fornecedor
router.post('/providers/:id/reject', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;

  await prisma.providerProfile.update({
    where: { userId: id },
    data: { isVerified: false }
  });

  // TODO: Enviar notificação de rejeição com motivo

  res.json({ message: 'Fornecedor rejeitado', reason });
}));

// Suspender fornecedor
router.post('/providers/:id/suspend', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason, days } = req.body;

  await prisma.user.update({
    where: { id },
    data: { status: 'SUSPENDED' }
  });

  res.json({ message: `Fornecedor suspenso por ${days || 'tempo indeterminado'} dias`, reason });
}));

// Editar perfil do fornecedor
router.put('/providers/:id/profile', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { businessName, businessType, address, city, state, zipCode, serviceRadiusKm, specialties } = req.body;

  const profile = await prisma.providerProfile.update({
    where: { userId: id },
    data: { businessName, businessType, address, city, state, zipCode, serviceRadiusKm, specialties }
  });

  res.json({ message: 'Perfil atualizado', profile });
}));

// Verificar credenciais
router.post('/providers/:id/verify-credentials', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { insuranceVerified, backgroundCheckCompleted } = req.body;

  const profile = await prisma.providerProfile.update({
    where: { userId: id },
    data: { insuranceVerified, backgroundCheckCompleted }
  });

  res.json({ message: 'Credenciais atualizadas', profile });
}));

// ============================================
// GESTÃO DE SOLICITAÇÕES DE SERVIÇO
// ============================================

// Listar todas as solicitações
router.get('/service-requests', asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20, status, serviceType, urgent, search } = req.query;
  
  const where: any = {};
  if (status) where.status = status;
  if (serviceType) where.serviceType = serviceType;
  if (urgent === 'true') where.isUrgent = true;
  if (search) {
    where.OR = [
      { title: { contains: search as string, mode: 'insensitive' } },
      { description: { contains: search as string, mode: 'insensitive' } },
      { requestNumber: { contains: search as string, mode: 'insensitive' } }
    ];
  }

  const [requests, total] = await Promise.all([
    prisma.serviceRequest.findMany({
      where,
      take: Number(limit),
      skip: (Number(page) - 1) * Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true } },
        vehicle: { select: { id: true, make: true, model: true, year: true, plateNumber: true } },
        quotes: {
          include: { provider: { select: { fullName: true } } }
        },
        _count: { select: { quotes: true } }
      }
    }),
    prisma.serviceRequest.count({ where })
  ]);

  res.json({
    requests,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit))
    }
  });
}));

// Detalhes da solicitação
router.get('/service-requests/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const request = await prisma.serviceRequest.findUnique({
    where: { id },
    include: {
      user: true,
      vehicle: true,
      quotes: {
        include: {
          provider: {
            include: { providerProfile: true }
          }
        }
      }
    }
  });

  if (!request) {
    res.status(404).json({ message: 'Solicitação não encontrada' });
    return;
  }

  res.json(request);
}));

// Cancelar solicitação
router.post('/service-requests/:id/cancel', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;

  const request = await prisma.serviceRequest.update({
    where: { id },
    data: { 
      status: 'CANCELLED', 
      cancelledAt: new Date(),
      cancellationReason: reason
    }
  });

  res.json({ message: 'Solicitação cancelada', request });
}));

// Reabrir solicitação
router.post('/service-requests/:id/reopen', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const request = await prisma.serviceRequest.update({
    where: { id },
    data: { 
      status: 'SEARCHING_PROVIDERS', 
      cancelledAt: null,
      cancellationReason: null
    }
  });

  res.json({ message: 'Solicitação reaberta', request });
}));

// Alterar status da solicitação
router.patch('/service-requests/:id/status', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const request = await prisma.serviceRequest.update({
    where: { id },
    data: { status }
  });

  res.json({ message: 'Status atualizado', request });
}));

// Atribuir fornecedor manualmente
router.post('/service-requests/:id/assign-provider', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { providerId, laborCost, partsCost, estimatedHours } = req.body;

  // Criar orçamento automaticamente
  const quoteNumber = `QT-${Date.now()}`;
  const quote = await prisma.quote.create({
    data: {
      quoteNumber,
      serviceRequestId: id,
      providerId,
      laborCost,
      partsCost: partsCost || 0,
      additionalFees: 0,
      taxAmount: 0,
      totalAmount: laborCost + (partsCost || 0),
      partsList: JSON.stringify([]),
      estimatedHours: estimatedHours || 1,
      status: 'ACCEPTED',
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });

  // Atualizar solicitação
  await prisma.serviceRequest.update({
    where: { id },
    data: { 
      status: 'QUOTE_ACCEPTED',
      acceptedQuoteId: quote.id
    }
  });

  res.json({ message: 'Fornecedor atribuído', quote });
}));

// ============================================
// GESTÃO DE ORDENS DE SERVIÇO
// ============================================

// Listar ordens de serviço
router.get('/work-orders', asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20, status } = req.query;
  
  const where: any = {};
  if (status) where.status = status;

  const [orders, total] = await Promise.all([
    prisma.workOrder.findMany({
      where,
      take: Number(limit),
      skip: (Number(page) - 1) * Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        quote: {
          include: {
            provider: { select: { id: true, fullName: true, phone: true } },
            serviceRequest: {
              include: {
                user: { select: { id: true, fullName: true, phone: true } },
                vehicle: { select: { make: true, model: true, year: true, plateNumber: true } }
              }
            }
          }
        },
        payments: true,
        reviews: true
      }
    }),
    prisma.workOrder.count({ where })
  ]);

  res.json({
    orders,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit))
    }
  });
}));

// Detalhes da ordem
router.get('/work-orders/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const order = await prisma.workOrder.findUnique({
    where: { id },
    include: {
      quote: {
        include: {
          provider: { include: { providerProfile: true } },
          serviceRequest: {
            include: { user: true, vehicle: true }
          }
        }
      },
      vehicle: true,
      customer: true,
      provider: true,
      payments: true,
      reviews: true
    }
  });

  if (!order) {
    res.status(404).json({ message: 'Ordem não encontrada' });
    return;
  }

  res.json(order);
}));

// Alterar status da ordem
router.patch('/work-orders/:id/status', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  const updateData: any = { status };
  
  if (status === 'COMPLETED') {
    updateData.completedAt = new Date();
  } else if (status === 'IN_PROGRESS') {
    updateData.startedAt = new Date();
  }

  const order = await prisma.workOrder.update({
    where: { id },
    data: updateData
  });

  console.log(`[ADMIN] Status da ordem ${id} alterado para ${status}. Motivo: ${reason || 'N/A'}`);

  res.json({ message: 'Status atualizado', order });
}));

// Cancelar ordem
router.post('/work-orders/:id/cancel', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason = 'Cancelado pelo admin', refund = false } = req.body;

  const order = await prisma.workOrder.update({
    where: { id },
    data: { status: 'CANCELLED' }
  });

  console.log(`[ADMIN] Ordem ${id} cancelada. Motivo: ${reason}`);

  // Processar reembolso se necessário
  if (refund) {
    await prisma.payment.updateMany({
      where: { workOrderId: id, status: 'CAPTURED' },
      data: { status: 'REFUNDED' }
    });
  }

  res.json({ message: 'Ordem cancelada', order, refundProcessed: refund });
}));

// Forçar conclusão
router.post('/work-orders/:id/complete', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const order = await prisma.workOrder.update({
    where: { id },
    data: { 
      status: 'COMPLETED',
      completedAt: new Date()
    }
  });

  // Atualizar solicitação também
  const quote = await prisma.quote.findUnique({ where: { id: order.quoteId } });
  if (quote) {
    await prisma.serviceRequest.update({
      where: { id: quote.serviceRequestId },
      data: { status: 'COMPLETED', completedAt: new Date() }
    });
  }

  res.json({ message: 'Ordem marcada como concluída', order });
}));

// ============================================
// GESTÃO DE PAGAMENTOS
// ============================================

// Listar pagamentos
router.get('/payments', asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20, status, method, startDate, endDate } = req.query;
  
  const where: any = {};
  if (status) where.status = status;
  if (method) where.paymentMethod = method;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate as string);
    if (endDate) where.createdAt.lte = new Date(endDate as string);
  }

  const [payments, total, stats] = await Promise.all([
    prisma.payment.findMany({
      where,
      take: Number(limit),
      skip: (Number(page) - 1) * Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        workOrder: {
          include: {
            quote: {
              include: {
                serviceRequest: { select: { title: true, requestNumber: true } }
              }
            }
          }
        },
        customer: { select: { id: true, fullName: true, email: true } },
        provider: { select: { id: true, fullName: true, email: true } }
      }
    }),
    prisma.payment.count({ where }),
    prisma.payment.aggregate({
      _sum: { totalAmount: true, platformFee: true, providerAmount: true },
      _count: true,
      where
    })
  ]);

  res.json({
    payments,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit))
    },
    stats: {
      totalAmount: stats._sum?.totalAmount || 0,
      platformFee: stats._sum?.platformFee || 0,
      providerAmount: stats._sum?.providerAmount || 0,
      count: stats._count || 0
    }
  });
}));

// Detalhes do pagamento
router.get('/payments/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      workOrder: {
        include: {
          quote: {
            include: {
              provider: true,
              serviceRequest: { include: { user: true, vehicle: true } }
            }
          }
        }
      },
      customer: true,
      provider: true
    }
  });

  if (!payment) {
    res.status(404).json({ message: 'Pagamento não encontrado' });
    return;
  }

  res.json(payment);
}));

// Processar reembolso
router.post('/payments/:id/refund', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason, amount } = req.body;

  const payment = await prisma.payment.findUnique({ where: { id } });
  
  if (!payment) {
    res.status(404).json({ message: 'Pagamento não encontrado' });
    return;
  }

  const refundAmount = amount || payment.totalAmount;

  const updatedPayment = await prisma.payment.update({
    where: { id },
    data: { 
      status: 'REFUNDED',
      refundAmount: refundAmount,
      refundedAt: new Date()
    }
  });

  console.log(`[ADMIN] Reembolso de R$ ${refundAmount} processado. Motivo: ${reason}`);

  res.json({ message: 'Reembolso processado', payment: updatedPayment });
}));

// Liberar pagamento ao fornecedor
router.post('/payments/:id/release', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const payment = await prisma.payment.update({
    where: { id },
    data: { 
      transferredToProviderAt: new Date()
    }
  });

  res.json({ message: 'Pagamento liberado ao fornecedor', payment });
}));

// Bloquear pagamento
router.post('/payments/:id/hold', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;

  const payment = await prisma.payment.update({
    where: { id },
    data: { status: 'PENDING' }
  });

  console.log(`[ADMIN] Pagamento ${id} bloqueado. Motivo: ${reason}`);

  res.json({ message: 'Pagamento bloqueado', payment });
}));

// ============================================
// GESTÃO DE AVALIAÇÕES
// ============================================

// Listar avaliações
router.get('/reviews', asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20, minRating, maxRating } = req.query;
  
  const where: any = {};
  if (minRating) where.customerRating = { gte: Number(minRating) };
  if (maxRating) where.customerRating = { ...where.customerRating, lte: Number(maxRating) };

  const [reviews, total, stats] = await Promise.all([
    prisma.review.findMany({
      where,
      take: Number(limit),
      skip: (Number(page) - 1) * Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, fullName: true } },
        provider: { select: { id: true, fullName: true } },
        workOrder: { 
          include: { 
            quote: { 
              include: { serviceRequest: { select: { title: true } } } 
            } 
          } 
        }
      }
    }),
    prisma.review.count({ where }),
    prisma.review.aggregate({
      _avg: { customerRating: true },
      _count: true
    })
  ]);

  res.json({
    reviews,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit))
    },
    stats: {
      averageRating: stats._avg?.customerRating || 0,
      totalReviews: stats._count || 0
    }
  });
}));

// Remover avaliação
router.delete('/reviews/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;

  await prisma.review.delete({ where: { id } });

  console.log(`[ADMIN] Avaliação ${id} removida. Motivo: ${reason}`);

  res.json({ message: 'Avaliação removida' });
}));

// Editar avaliação (censurar)
router.put('/reviews/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { comment } = req.body;

  const review = await prisma.review.update({
    where: { id },
    data: { customerComment: comment }
  });

  res.json({ message: 'Avaliação editada', review });
}));

// Responder como plataforma
router.post('/reviews/:id/respond', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { response } = req.body;

  const review = await prisma.review.update({
    where: { id },
    data: { providerResponse: `[TechTrust] ${response}` }
  });

  res.json({ message: 'Resposta adicionada', review });
}));

// ============================================
// GESTÃO DE ASSINATURAS
// ============================================

// Listar assinaturas
router.get('/subscriptions', asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20, plan, status } = req.query;
  
  const where: any = {};
  if (plan) where.plan = plan;
  if (status) where.status = status;

  const [subscriptions, total, stats] = await Promise.all([
    prisma.subscription.findMany({
      where,
      take: Number(limit),
      skip: (Number(page) - 1) * Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, fullName: true, email: true, role: true } }
      }
    }),
    prisma.subscription.count({ where }),
    prisma.subscription.groupBy({
      by: ['plan', 'status'],
      _count: { id: true }
    })
  ]);

  res.json({
    subscriptions,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit))
    },
    stats
  });
}));

// Cancelar assinatura
router.post('/subscriptions/:id/cancel', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;

  const subscription = await prisma.subscription.update({
    where: { id },
    data: { 
      status: 'CANCELLED',
      cancelledAt: new Date()
    }
  });

  console.log(`[ADMIN] Assinatura ${id} cancelada. Motivo: ${reason}`);

  res.json({ message: 'Assinatura cancelada', subscription });
}));

// Alterar plano
router.patch('/subscriptions/:id/plan', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { plan } = req.body;

  const subscription = await prisma.subscription.update({
    where: { id },
    data: { plan }
  });

  res.json({ message: 'Plano alterado', subscription });
}));

// ============================================
// SUBSCRIPTION PLAN TEMPLATES - Templates de Planos
// ============================================

// Listar todos os templates de planos
router.get('/subscription-plans', asyncHandler(async (_req: Request, res: Response) => {
  const plans = await prisma.subscriptionPlanTemplate.findMany({
    orderBy: { position: 'asc' },
  });
  
  // Count subscribers for each plan
  const subscriptionCounts = await prisma.subscription.groupBy({
    by: ['plan'],
    where: {
      status: 'ACTIVE',
    },
    _count: {
      id: true,
    },
  });
  
  // Create a map of plan counts
  const countMap = new Map(subscriptionCounts.map(s => [s.plan, s._count.id]));
  
  // Format for response
  const formattedPlans = plans.map(plan => ({
    id: plan.id,
    planKey: plan.planKey,
    name: plan.name,
    description: plan.description,
    price: Number(plan.monthlyPrice),
    monthlyPrice: Number(plan.monthlyPrice),
    yearlyPrice: Number(plan.yearlyPrice),
    vehicleLimit: plan.vehicleLimit,
    duration: 30, // For compatibility with admin
    features: typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features,
    isActive: plan.isActive,
    isFeatured: plan.isFeatured,
    subscribersCount: countMap.get(plan.planKey.toUpperCase() as any) || 0,
  }));
  
  res.json({ plans: formattedPlans });
}));

// Criar template de plano
router.post('/subscription-plans', asyncHandler(async (req: Request, res: Response) => {
  const { name, description, price, vehicleLimit, features, isActive, isFeatured } = req.body;
  
  // Generate planKey from name
  const planKey = name.toLowerCase().replace(/\s+/g, '_');
  
  // Get max position
  const maxPos = await prisma.subscriptionPlanTemplate.aggregate({ _max: { position: true } });
  const position = (maxPos._max.position || 0) + 1;
  
  const plan = await prisma.subscriptionPlanTemplate.create({
    data: {
      planKey,
      name,
      description,
      monthlyPrice: price || 0,
      yearlyPrice: (price || 0) * 10, // 2 months free for yearly
      vehicleLimit: vehicleLimit || 1,
      features: features || [],
      isActive: isActive ?? true,
      isFeatured: isFeatured ?? false,
      position,
    }
  });
  
  res.status(201).json({ 
    message: 'Plano criado', 
    plan: {
      ...plan,
      price: Number(plan.monthlyPrice),
      features: plan.features,
    }
  });
}));

// Atualizar template de plano
router.put('/subscription-plans/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, price, vehicleLimit, features, isActive, isFeatured } = req.body;
  
  const updateData: any = {};
  if (name !== undefined) {
    updateData.name = name;
    updateData.planKey = name.toLowerCase().replace(/\s+/g, '_');
  }
  if (description !== undefined) updateData.description = description;
  if (price !== undefined) {
    updateData.monthlyPrice = price;
    updateData.yearlyPrice = price * 10;
  }
  if (vehicleLimit !== undefined) updateData.vehicleLimit = vehicleLimit;
  if (features !== undefined) updateData.features = features;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
  
  const plan = await prisma.subscriptionPlanTemplate.update({
    where: { id },
    data: updateData,
  });
  
  res.json({ 
    message: 'Plano atualizado', 
    plan: {
      ...plan,
      price: Number(plan.monthlyPrice),
      features: plan.features,
    }
  });
}));

// Deletar template de plano
router.delete('/subscription-plans/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  await prisma.subscriptionPlanTemplate.delete({ where: { id } });
  
  res.json({ message: 'Plano removido' });
}));

// ============================================
// RELATÓRIOS
// ============================================

router.get('/reports', asyncHandler(async (req: Request, res: Response) => {
  const { type = 'overview', startDate, endDate } = req.query;
  
  const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate as string) : new Date();

  const dateFilter = { createdAt: { gte: start, lte: end } };

  if (type === 'financial') {
    const [revenue, byMethod, byDay] = await Promise.all([
      prisma.payment.aggregate({
        _sum: { totalAmount: true, platformFee: true, providerAmount: true },
        _count: true,
        where: { status: 'CAPTURED', ...dateFilter }
      }),
      prisma.payment.groupBy({
        by: ['cardBrand'],
        _sum: { totalAmount: true },
        _count: true,
        where: { status: 'CAPTURED', ...dateFilter }
      }),
      prisma.$queryRaw`
        SELECT DATE(created_at) as date, SUM(total_amount) as total
        FROM payments
        WHERE status = 'CAPTURED' AND created_at >= ${start} AND created_at <= ${end}
        GROUP BY DATE(created_at)
        ORDER BY date
      `
    ]);

    res.json({ type: 'financial', period: { start, end }, revenue, byPaymentType: byMethod, byDay });
    return;
  }

  if (type === 'users') {
    const [newUsers, byRole, growth] = await Promise.all([
      prisma.user.count({ where: dateFilter }),
      prisma.user.groupBy({
        by: ['role'],
        _count: { id: true }
      }),
      prisma.$queryRaw`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM users
        WHERE created_at >= ${start} AND created_at <= ${end}
        GROUP BY DATE(created_at)
        ORDER BY date
      `
    ]);

    res.json({ type: 'users', period: { start, end }, newUsers, byRole, growth });
    return;
  }

  if (type === 'services') {
    const [total, byStatus, byType, conversionRate] = await Promise.all([
      prisma.serviceRequest.count({ where: dateFilter }),
      prisma.serviceRequest.groupBy({
        by: ['status'],
        _count: { id: true },
        where: dateFilter
      }),
      prisma.serviceRequest.groupBy({
        by: ['serviceType'],
        _count: { id: true },
        where: dateFilter
      }),
      prisma.serviceRequest.count({
        where: { ...dateFilter, status: 'COMPLETED' }
      })
    ]);

    res.json({ 
      type: 'services', 
      period: { start, end }, 
      total, 
      byStatus, 
      byType,
      conversionRate: total > 0 ? (conversionRate / total * 100).toFixed(2) : 0
    });
    return;
  }

  if (type === 'providers') {
    const [total, topProviders, averageRating] = await Promise.all([
      prisma.user.count({ where: { role: 'PROVIDER' } }),
      prisma.user.findMany({
        where: { role: 'PROVIDER' },
        take: 10,
        include: {
          providerProfile: true,
          _count: { select: { workOrdersAsProvider: true } }
        },
        orderBy: { workOrdersAsProvider: { _count: 'desc' } }
      }),
      prisma.providerProfile.aggregate({
        _avg: { averageRating: true }
      })
    ]);

    res.json({ type: 'providers', total, topProviders, averageRating: averageRating._avg?.averageRating || 0 });
    return;
  }

  // Overview geral
  const [users, requests, payments, reviews] = await Promise.all([
    prisma.user.count({ where: dateFilter }),
    prisma.serviceRequest.count({ where: dateFilter }),
    prisma.payment.aggregate({ _sum: { totalAmount: true }, where: { status: 'CAPTURED', ...dateFilter } }),
    prisma.review.aggregate({ _avg: { customerRating: true }, _count: true, where: dateFilter })
  ]);

  res.json({
    type: 'overview',
    period: { start, end },
    summary: {
      newUsers: users,
      newRequests: requests,
      revenue: payments._sum?.totalAmount || 0,
      reviewsCount: reviews._count || 0,
      averageRating: reviews._avg?.customerRating || 0
    }
  });
}));

// ============================================
// CONFIGURAÇÕES DO SISTEMA
// ============================================

// Obter configurações
router.get('/config', asyncHandler(async (_req: Request, res: Response) => {
  // Em produção, buscar de tabela de configurações
  res.json({
    platformFee: 10,
    minQuoteValue: 50,
    maxQuoteValue: 50000,
    quoteExpirationHours: 48,
    maxPhotosPerRequest: 10,
    maxProvidersPerQuote: 5,
    enableSMS: true,
    enableEmail: true,
    enablePushNotifications: true,
    maintenanceMode: false,
    allowNewRegistrations: true,
    requirePhoneVerification: true,
    requireEmailVerification: false,
    autoApproveProviders: false,
    maxLoginAttempts: 5,
    sessionTimeout: 24 // horas
  });
}));

// Atualizar configurações
router.put('/config', asyncHandler(async (req: Request, res: Response) => {
  const config = req.body;
  // Em produção, salvar em tabela de configurações
  console.log('[ADMIN] Configurações atualizadas:', config);
  res.json({ message: 'Configurações atualizadas', config });
}));

// Modo manutenção
router.post('/config/maintenance', asyncHandler(async (req: Request, res: Response) => {
  const { enabled, message } = req.body;
  console.log(`[ADMIN] Modo manutenção: ${enabled ? 'ATIVADO' : 'DESATIVADO'}. Mensagem: ${message}`);
  res.json({ message: `Modo manutenção ${enabled ? 'ativado' : 'desativado'}` });
}));

// ============================================
// NOTIFICAÇÕES BROADCAST
// ============================================

// Listar notificações enviadas
router.get('/notifications', asyncHandler(async (_req: Request, res: Response) => {
  // Em produção, buscar de tabela de notificações broadcast
  res.json({
    notifications: []
  });
}));

// Enviar notificação broadcast
router.post('/notifications/broadcast', asyncHandler(async (req: Request, res: Response) => {
  const { title, message, targetRole, targetUsers } = req.body;

  let where: any = {};
  if (targetRole && targetRole !== 'ALL') {
    where.role = targetRole === 'CUSTOMERS' ? 'CLIENT' : 'PROVIDER';
  }
  if (targetUsers && targetUsers.length > 0) {
    where.id = { in: targetUsers };
  }

  const recipients = await prisma.user.findMany({
    where,
    select: { id: true, fcmToken: true, email: true, phone: true }
  });

  // TODO: Enviar notificações reais via FCM/Email/SMS
  console.log(`[ADMIN] Notificação broadcast enviada para ${recipients.length} usuários`);

  res.json({
    message: 'Notificação enviada',
    recipients: recipients.length,
    notification: { title, message, targetRole, sentAt: new Date().toISOString() }
  });
}));

// ============================================
// AUDITORIA E LOGS
// ============================================

router.get('/audit-logs', asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 50 } = req.query;
  
  // Em produção, buscar de tabela de logs
  res.json({
    logs: [],
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: 0,
      totalPages: 0
    }
  });
}));

// ============================================
// BACKUP E SISTEMA
// ============================================

router.post('/system/backup', asyncHandler(async (_req: Request, res: Response) => {
  // Em produção, disparar job de backup
  console.log('[ADMIN] Backup manual solicitado');
  res.json({ message: 'Backup iniciado', timestamp: new Date().toISOString() });
}));

router.post('/system/clear-cache', asyncHandler(async (_req: Request, res: Response) => {
  // Em produção, limpar cache Redis
  console.log('[ADMIN] Cache limpo');
  res.json({ message: 'Cache limpo' });
}));

router.post('/system/force-logout-all', asyncHandler(async (_req: Request, res: Response) => {
  // Em produção, invalidar todos os tokens
  console.log('[ADMIN] Logout forçado de todos os usuários');
  res.json({ message: 'Todos os usuários foram deslogados' });
}));

// ============================================
// CONTENT MANAGEMENT - Banners/Publicidade
// ============================================

// Listar banners
router.get('/content/banners', asyncHandler(async (req: Request, res: Response) => {
  const { isActive, targetAudience } = req.query;
  
  const where: any = {};
  if (isActive !== undefined) where.isActive = isActive === 'true';
  if (targetAudience) where.targetAudience = targetAudience;
  
  const banners = await prisma.banner.findMany({
    where,
    orderBy: { position: 'asc' }
  });
  
  res.json(banners);
}));

// Obter banner por ID
router.get('/content/banners/:id', asyncHandler(async (req: Request, res: Response) => {
  const banner = await prisma.banner.findUnique({
    where: { id: req.params.id }
  });
  
  if (!banner) {
    return res.status(404).json({ error: 'Banner não encontrado' });
  }
  
  return res.json(banner);
}));

// Criar banner
router.post('/content/banners', asyncHandler(async (req: Request, res: Response) => {
  const { title, subtitle, imageUrl, linkUrl, linkType, position, isActive, startDate, endDate, targetAudience } = req.body;
  
  const banner = await prisma.banner.create({
    data: {
      title,
      subtitle,
      imageUrl,
      linkUrl,
      linkType,
      position: position || 0,
      isActive: isActive ?? true,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      targetAudience: targetAudience || 'all',
      createdById: (req as any).user?.id
    }
  });
  
  res.status(201).json(banner);
}));

// Atualizar banner
router.put('/content/banners/:id', asyncHandler(async (req: Request, res: Response) => {
  const { title, subtitle, imageUrl, linkUrl, linkType, position, isActive, startDate, endDate, targetAudience } = req.body;
  
  const banner = await prisma.banner.update({
    where: { id: req.params.id },
    data: {
      title,
      subtitle,
      imageUrl,
      linkUrl,
      linkType,
      position,
      isActive,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      targetAudience
    }
  });
  
  res.json(banner);
}));

// Deletar banner
router.delete('/content/banners/:id', asyncHandler(async (req: Request, res: Response) => {
  await prisma.banner.delete({
    where: { id: req.params.id }
  });
  
  res.json({ message: 'Banner deletado com sucesso' });
}));

// Reordenar banners
router.post('/content/banners/reorder', asyncHandler(async (req: Request, res: Response) => {
  const { items } = req.body; // [{ id, position }]
  
  await Promise.all(
    items.map((item: { id: string; position: number }) =>
      prisma.banner.update({
        where: { id: item.id },
        data: { position: item.position }
      })
    )
  );
  
  res.json({ message: 'Ordem atualizada' });
}));

// ============================================
// CONTENT MANAGEMENT - Ofertas Especiais
// ============================================

// Listar ofertas
router.get('/content/offers', asyncHandler(async (req: Request, res: Response) => {
  const { isActive, isFeatured } = req.query;
  
  const where: any = {};
  if (isActive !== undefined) where.isActive = isActive === 'true';
  if (isFeatured !== undefined) where.isFeatured = isFeatured === 'true';
  
  const offers = await prisma.specialOffer.findMany({
    where,
    orderBy: { position: 'asc' }
  });
  
  res.json(offers);
}));

// Obter oferta por ID
router.get('/content/offers/:id', asyncHandler(async (req: Request, res: Response) => {
  const offer = await prisma.specialOffer.findUnique({
    where: { id: req.params.id }
  });
  
  if (!offer) {
    return res.status(404).json({ error: 'Oferta não encontrada' });
  }
  
  return res.json(offer);
}));

// Criar oferta
router.post('/content/offers', asyncHandler(async (req: Request, res: Response) => {
  const {
    title, description, imageUrl, discountType, discountValue, discountLabel,
    originalPrice, discountedPrice, validFrom, validUntil, promoCode,
    position, isActive, isFeatured, usageLimit, applicableServices
  } = req.body;
  
  const offer = await prisma.specialOffer.create({
    data: {
      title,
      description,
      imageUrl,
      discountType,
      discountValue,
      discountLabel,
      originalPrice,
      discountedPrice,
      validFrom: validFrom ? new Date(validFrom) : null,
      validUntil: validUntil ? new Date(validUntil) : null,
      promoCode,
      position: position || 0,
      isActive: isActive ?? true,
      isFeatured: isFeatured ?? false,
      usageLimit,
      applicableServices: applicableServices || [],
      createdById: (req as any).user?.id
    }
  });
  
  res.status(201).json(offer);
}));

// Atualizar oferta
router.put('/content/offers/:id', asyncHandler(async (req: Request, res: Response) => {
  const {
    title, description, imageUrl, discountType, discountValue, discountLabel,
    originalPrice, discountedPrice, validFrom, validUntil, promoCode,
    position, isActive, isFeatured, usageLimit, applicableServices
  } = req.body;
  
  const offer = await prisma.specialOffer.update({
    where: { id: req.params.id },
    data: {
      title,
      description,
      imageUrl,
      discountType,
      discountValue,
      discountLabel,
      originalPrice,
      discountedPrice,
      validFrom: validFrom ? new Date(validFrom) : null,
      validUntil: validUntil ? new Date(validUntil) : null,
      promoCode,
      position,
      isActive,
      isFeatured,
      usageLimit,
      applicableServices
    }
  });
  
  res.json(offer);
}));

// Deletar oferta
router.delete('/content/offers/:id', asyncHandler(async (req: Request, res: Response) => {
  await prisma.specialOffer.delete({
    where: { id: req.params.id }
  });
  
  res.json({ message: 'Oferta deletada com sucesso' });
}));

// ============================================
// CONTENT MANAGEMENT - Artigos/Dicas
// ============================================

// Listar artigos
router.get('/content/articles', asyncHandler(async (req: Request, res: Response) => {
  const { isPublished, category, isFeatured } = req.query;
  
  const where: any = {};
  if (isPublished !== undefined) where.isPublished = isPublished === 'true';
  if (category) where.category = category;
  if (isFeatured !== undefined) where.isFeatured = isFeatured === 'true';
  
  const articles = await prisma.article.findMany({
    where,
    include: {
      author: {
        select: { id: true, fullName: true }
      }
    },
    orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }]
  });
  
  res.json(articles);
}));

// Obter artigo por ID
router.get('/content/articles/:id', asyncHandler(async (req: Request, res: Response) => {
  const article = await prisma.article.findUnique({
    where: { id: req.params.id },
    include: {
      author: {
        select: { id: true, fullName: true }
      }
    }
  });
  
  if (!article) {
    return res.status(404).json({ error: 'Artigo não encontrado' });
  }
  
  return res.json(article);
}));

// Criar artigo
router.post('/content/articles', asyncHandler(async (req: Request, res: Response) => {
  const {
    title, slug, excerpt, content, imageUrl, category, tags,
    readTime, isPublished, isFeatured, position
  } = req.body;
  
  // Gerar slug se não fornecido
  const finalSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  
  const article = await prisma.article.create({
    data: {
      title,
      slug: finalSlug,
      excerpt,
      content,
      imageUrl,
      category,
      tags: tags || [],
      readTime,
      isPublished: isPublished ?? false,
      isFeatured: isFeatured ?? false,
      position: position || 0,
      publishedAt: isPublished ? new Date() : null,
      authorId: (req as any).user?.id
    }
  });
  
  res.status(201).json(article);
}));

// Atualizar artigo
router.put('/content/articles/:id', asyncHandler(async (req: Request, res: Response) => {
  const {
    title, slug, excerpt, content, imageUrl, category, tags,
    readTime, isPublished, isFeatured, position
  } = req.body;
  
  // Verificar se está publicando agora
  const existing = await prisma.article.findUnique({ where: { id: req.params.id } });
  const publishedAt = isPublished && !existing?.isPublished ? new Date() : existing?.publishedAt;
  
  const article = await prisma.article.update({
    where: { id: req.params.id },
    data: {
      title,
      slug,
      excerpt,
      content,
      imageUrl,
      category,
      tags,
      readTime,
      isPublished,
      isFeatured,
      position,
      publishedAt
    }
  });
  
  res.json(article);
}));

// Deletar artigo
router.delete('/content/articles/:id', asyncHandler(async (req: Request, res: Response) => {
  await prisma.article.delete({
    where: { id: req.params.id }
  });
  
  res.json({ message: 'Artigo deletado com sucesso' });
}));

// Publicar/Despublicar artigo
router.post('/content/articles/:id/publish', asyncHandler(async (req: Request, res: Response) => {
  const { publish } = req.body;
  
  const article = await prisma.article.update({
    where: { id: req.params.id },
    data: {
      isPublished: publish,
      publishedAt: publish ? new Date() : null
    }
  });
  
  res.json(article);
}));

// ============================================
// CONTENT MANAGEMENT - Avisos/Notícias
// ============================================

// Listar avisos
router.get('/content/notices', asyncHandler(async (req: Request, res: Response) => {
  const { isActive, type, targetAudience } = req.query;
  
  const where: any = {};
  if (isActive !== undefined) where.isActive = isActive === 'true';
  if (type) where.type = type;
  if (targetAudience) where.targetAudience = targetAudience;
  
  const notices = await prisma.notice.findMany({
    where,
    orderBy: [{ isPinned: 'desc' }, { position: 'asc' }, { createdAt: 'desc' }]
  });
  
  res.json(notices);
}));

// Obter aviso por ID
router.get('/content/notices/:id', asyncHandler(async (req: Request, res: Response) => {
  const notice = await prisma.notice.findUnique({
    where: { id: req.params.id }
  });
  
  if (!notice) {
    return res.status(404).json({ error: 'Aviso não encontrado' });
  }
  
  return res.json(notice);
}));

// Criar aviso
router.post('/content/notices', asyncHandler(async (req: Request, res: Response) => {
  const {
    title, message, type, icon, isActive, isPinned, position,
    startDate, endDate, targetAudience, actionLabel, actionUrl
  } = req.body;
  
  const notice = await prisma.notice.create({
    data: {
      title,
      message,
      type: type || 'info',
      icon,
      isActive: isActive ?? true,
      isPinned: isPinned ?? false,
      position: position || 0,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      targetAudience: targetAudience || 'all',
      actionLabel,
      actionUrl,
      createdById: (req as any).user?.id
    }
  });
  
  res.status(201).json(notice);
}));

// Atualizar aviso
router.put('/content/notices/:id', asyncHandler(async (req: Request, res: Response) => {
  const {
    title, message, type, icon, isActive, isPinned, position,
    startDate, endDate, targetAudience, actionLabel, actionUrl
  } = req.body;
  
  const notice = await prisma.notice.update({
    where: { id: req.params.id },
    data: {
      title,
      message,
      type,
      icon,
      isActive,
      isPinned,
      position,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      targetAudience,
      actionLabel,
      actionUrl
    }
  });
  
  res.json(notice);
}));

// Deletar aviso
router.delete('/content/notices/:id', asyncHandler(async (req: Request, res: Response) => {
  await prisma.notice.delete({
    where: { id: req.params.id }
  });
  
  res.json({ message: 'Aviso deletado com sucesso' });
}));

// Fixar/Desafixar aviso
router.post('/content/notices/:id/pin', asyncHandler(async (req: Request, res: Response) => {
  const { pin } = req.body;
  
  const notice = await prisma.notice.update({
    where: { id: req.params.id },
    data: { isPinned: pin }
  });
  
  res.json(notice);
}));

// ============================================
// CONTENT - Dashboard de Estatísticas
// ============================================

router.get('/content/stats', asyncHandler(async (_req: Request, res: Response) => {
  const [
    totalBanners, activeBanners,
    totalOffers, activeOffers,
    totalArticles, publishedArticles,
    totalNotices, activeNotices
  ] = await Promise.all([
    prisma.banner.count(),
    prisma.banner.count({ where: { isActive: true } }),
    prisma.specialOffer.count(),
    prisma.specialOffer.count({ where: { isActive: true } }),
    prisma.article.count(),
    prisma.article.count({ where: { isPublished: true } }),
    prisma.notice.count(),
    prisma.notice.count({ where: { isActive: true } })
  ]);
  
  res.json({
    banners: { total: totalBanners, active: activeBanners },
    offers: { total: totalOffers, active: activeOffers },
    articles: { total: totalArticles, published: publishedArticles },
    notices: { total: totalNotices, active: activeNotices }
  });
}));

export default router;
