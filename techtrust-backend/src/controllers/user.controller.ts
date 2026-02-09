/**
 * ============================================
 * USER CONTROLLER
 * ============================================
 * Gerenciamento de perfil do usuário
 */

import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error-handler';
import { hashPassword, comparePassword } from '../utils/password';
import { logger } from '../config/logger';

/**
 * GET /api/v1/users/me
 * Obter perfil do usuário autenticado
 */
export const getMe = async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      language: true,
      emailVerified: true,
      phoneVerified: true,
      address: true,
      city: true,
      state: true,
      zipCode: true,
      fcmToken: true,
      pushEnabled: true,
      emailNotifications: true,
      smsNotifications: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  if (!user) {
    throw new AppError('Usuário não encontrado', 404, 'USER_NOT_FOUND');
  }

  // Buscar assinatura atual
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId: userId,
      status: 'ACTIVE',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  res.json({
    success: true,
    data: {
      user,
      subscription,
    },
  });
};

/**
 * PATCH /api/v1/users/me
 * Atualizar perfil do usuário
 */
export const updateMe = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const {
    fullName,
    language,
    address,
    city,
    state,
    zipCode,
    pushEnabled,
    emailNotifications,
    smsNotifications,
    cpf,
    dateOfBirth,
    gender,
  } = req.body;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(fullName && { fullName }),
      ...(language && { language }),
      ...(address !== undefined && { address }),
      ...(city !== undefined && { city }),
      ...(state !== undefined && { state }),
      ...(zipCode !== undefined && { zipCode }),
      ...(pushEnabled !== undefined && { pushEnabled }),
      ...(emailNotifications !== undefined && { emailNotifications }),
      ...(smsNotifications !== undefined && { smsNotifications }),
      ...(cpf !== undefined && { cpf }),
      ...(dateOfBirth !== undefined && { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }),
      ...(gender !== undefined && { gender }),
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      language: true,
      address: true,
      city: true,
      state: true,
      zipCode: true,
      pushEnabled: true,
      emailNotifications: true,
      smsNotifications: true,
      cpf: true,
      dateOfBirth: true,
      gender: true,
    },
  });

  logger.info(`Perfil atualizado: ${user.email}`);

  res.json({
    success: true,
    message: 'Perfil atualizado com sucesso',
    data: user,
  });
};

/**
 * POST /api/v1/users/me/change-password
 * Alterar senha do usuário
 */
export const changePassword = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { currentPassword, newPassword } = req.body;

  // Buscar usuário
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError('Usuário não encontrado', 404, 'USER_NOT_FOUND');
  }

  // Verificar senha atual
  const isPasswordValid = await comparePassword(currentPassword, user.passwordHash);

  if (!isPasswordValid) {
    throw new AppError('Senha atual incorreta', 400, 'INVALID_CURRENT_PASSWORD');
  }

  // Hash da nova senha
  const newPasswordHash = await hashPassword(newPassword);

  // Atualizar senha
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  });

  logger.info(`Senha alterada: ${user.email}`);

  res.json({
    success: true,
    message: 'Senha alterada com sucesso',
  });
};

/**
 * POST /api/v1/users/me/fcm-token
 * Atualizar token FCM para push notifications
 */
export const updateFCMToken = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { fcmToken } = req.body;

  await prisma.user.update({
    where: { id: userId },
    data: { fcmToken },
  });

  logger.info(`FCM token atualizado: ${userId}`);

  res.json({
    success: true,
    message: 'Token de notificação atualizado',
  });
};

/**
 * DELETE /api/v1/users/me
 * Deletar conta do usuário (soft delete)
 */
export const deleteMe = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { password } = req.body;

  // Buscar usuário
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError('Usuário não encontrado', 404, 'USER_NOT_FOUND');
  }

  // Verificar senha para confirmar exclusão
  const isPasswordValid = await comparePassword(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new AppError('Senha incorreta', 400, 'INVALID_PASSWORD');
  }

  // Soft delete
  await prisma.user.update({
    where: { id: userId },
    data: {
      status: 'INACTIVE',
      deletedAt: new Date(),
    },
  });

  logger.info(`Conta deletada: ${user.email}`);

  res.json({
    success: true,
    message: 'Conta deletada com sucesso',
  });
};

/**
 * GET /api/v1/users/dashboard-stats
 * Estatísticas do dashboard do cliente
 */
export const getDashboardStats = async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const [activeServices, pendingQuotes, completedServices, totalSpent] = await Promise.all([
    // Serviços ativos
    prisma.workOrder.count({
      where: {
        customerId: userId,
        status: {
          in: ['PENDING_START', 'IN_PROGRESS', 'AWAITING_APPROVAL'],
        },
      },
    }),
    // Orçamentos pendentes
    prisma.serviceRequest.count({
      where: {
        userId: userId,
        status: {
          in: ['SEARCHING_PROVIDERS', 'QUOTES_RECEIVED'],
        },
      },
    }),
    // Serviços completos
    prisma.workOrder.count({
      where: {
        customerId: userId,
        status: 'COMPLETED',
      },
    }),
    // Total gasto
    prisma.payment.aggregate({
      where: {
        customerId: userId,
        status: 'CAPTURED',
      },
      _sum: {
        totalAmount: true,
      },
    }),
  ]);

  res.json({
    success: true,
    data: {
      activeServices,
      pendingQuotes,
      completedServices,
      totalSpent: totalSpent._sum?.totalAmount || 0,
    },
  });
};

/**
 * GET /api/v1/users/reports
 * Relatórios de gastos do cliente
 */
export const getReports = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { period = '6M' } = req.query;

  // Calcular data inicial baseada no período
  let startDate = new Date();
  switch (period) {
    case '1M':
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case '3M':
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    case '6M':
      startDate.setMonth(startDate.getMonth() - 6);
      break;
    case '1Y':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      startDate = new Date(0); // Todos
  }

  // Buscar estatísticas
  const [completedServices, totalSpent, vehicles] = await Promise.all([
    prisma.workOrder.count({
      where: {
        customerId: userId,
        status: 'COMPLETED',
        completedAt: {
          gte: startDate,
        },
      },
    }),
    prisma.payment.aggregate({
      where: {
        customerId: userId,
        status: 'CAPTURED',
        capturedAt: {
          gte: startDate,
        },
      },
      _sum: {
        totalAmount: true,
      },
    }),
    prisma.vehicle.findMany({
      where: { userId },
      select: { id: true, make: true, model: true, year: true },
    }),
  ]);

  const total = totalSpent._sum?.totalAmount || 0;
  const avgCost = completedServices > 0 ? Number(total) / completedServices : 0;

  res.json({
    success: true,
    data: {
      stats: {
        totalSpent: total,
        servicesCompleted: completedServices,
        vehiclesServiced: vehicles.length,
        avgServiceCost: avgCost,
        savings: 0, // TODO: calcular baseado em ofertas
      },
      monthlySpending: [], // TODO: agrupar por mês
      serviceCategories: [], // TODO: agrupar por categoria
      vehicleSpending: vehicles.map(v => ({
        id: v.id,
        name: `${v.year} ${v.make} ${v.model}`,
        totalSpent: 0, // TODO: calcular por veículo
        servicesCount: 0,
      })),
    },
  });
};
