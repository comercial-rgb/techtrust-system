/**
 * ============================================
 * USER CONTROLLER
 * ============================================
 * Gerenciamento de perfil do usuário
 */

import { Request, Response } from "express";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error-handler";
import { hashPassword, comparePassword } from "../utils/password";
import { logger } from "../config/logger";

// ============================================
// Helper: parse user-agent into device info
// ============================================
function parseDeviceInfo(userAgent: string | undefined): { deviceName: string; deviceType: string } {
  if (!userAgent) return { deviceName: 'Unknown Device', deviceType: 'unknown' };
  const ua = userAgent.toLowerCase();

  if (ua.includes('iphone')) return { deviceName: 'iPhone', deviceType: 'mobile' };
  if (ua.includes('ipad')) return { deviceName: 'iPad', deviceType: 'tablet' };
  if (ua.includes('android') && ua.includes('mobile')) return { deviceName: 'Android Phone', deviceType: 'mobile' };
  if (ua.includes('android')) return { deviceName: 'Android Tablet', deviceType: 'tablet' };
  if (ua.includes('expo') || ua.includes('okhttp')) return { deviceName: 'TechTrust App', deviceType: 'mobile' };

  // Desktop browsers
  let browser = 'Browser';
  if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('edg')) browser = 'Edge';

  let os = '';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';

  return { deviceName: `${browser}${os ? ' · ' + os : ''}`, deviceType: 'desktop' };
}

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
      cpf: true,
      dateOfBirth: true,
      gender: true,
      addressesJson: true,
      preferencesJson: true,
      createdAt: true,
      lastLoginAt: true,
      providerProfile: {
        select: {
          businessName: true,
          businessType: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          businessPhone: true,
          businessEmail: true,
          website: true,
          averageRating: true,
          totalReviews: true,
          isVerified: true,
          fdacsRegistrationNumber: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError("Usuário não encontrado", 404, "USER_NOT_FOUND");
  }

  // Buscar assinatura atual
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId: userId,
      status: "ACTIVE",
    },
    orderBy: {
      createdAt: "desc",
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
    addressesJson,
    preferencesJson,
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
      ...(dateOfBirth !== undefined && {
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      }),
      ...(gender !== undefined && { gender }),
      ...(addressesJson !== undefined && { addressesJson }),
      ...(preferencesJson !== undefined && { preferencesJson }),
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
      addressesJson: true,
      preferencesJson: true,
    },
  });

  logger.info(`Perfil atualizado: ${user.email}`);

  res.json({
    success: true,
    message: "Perfil atualizado com sucesso",
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
    throw new AppError("Usuário não encontrado", 404, "USER_NOT_FOUND");
  }

  // Verificar senha atual
  const isPasswordValid = await comparePassword(
    currentPassword,
    user.passwordHash,
  );

  if (!isPasswordValid) {
    throw new AppError(
      "Senha atual incorreta",
      400,
      "INVALID_CURRENT_PASSWORD",
    );
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
    message: "Senha alterada com sucesso",
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
    message: "Token de notificação atualizado",
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
    throw new AppError("Usuário não encontrado", 404, "USER_NOT_FOUND");
  }

  // Verificar senha para confirmar exclusão
  const isPasswordValid = await comparePassword(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new AppError("Senha incorreta", 400, "INVALID_PASSWORD");
  }

  // Soft delete
  await prisma.user.update({
    where: { id: userId },
    data: {
      status: "INACTIVE",
      deletedAt: new Date(),
    },
  });

  logger.info(`Conta deletada: ${user.email}`);

  res.json({
    success: true,
    message: "Conta deletada com sucesso",
  });
};

/**
 * GET /api/v1/users/dashboard-stats
 * Estatísticas do dashboard do cliente
 */
export const getDashboardStats = async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const [activeServices, pendingQuotes, completedServices, totalSpent] =
    await Promise.all([
      // Serviços ativos
      prisma.workOrder.count({
        where: {
          customerId: userId,
          status: {
            in: ["PENDING_START", "IN_PROGRESS", "AWAITING_APPROVAL"],
          },
        },
      }),
      // Orçamentos pendentes
      prisma.serviceRequest.count({
        where: {
          userId: userId,
          status: {
            in: ["SEARCHING_PROVIDERS", "QUOTES_RECEIVED"],
          },
        },
      }),
      // Serviços completos
      prisma.workOrder.count({
        where: {
          customerId: userId,
          status: "COMPLETED",
        },
      }),
      // Total gasto
      prisma.payment.aggregate({
        where: {
          customerId: userId,
          status: "CAPTURED",
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
  const { period = "6M" } = req.query;

  // Calcular data inicial baseada no período
  let startDate = new Date();
  switch (period) {
    case "1M":
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case "3M":
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    case "6M":
      startDate.setMonth(startDate.getMonth() - 6);
      break;
    case "1Y":
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
        status: "COMPLETED",
        completedAt: {
          gte: startDate,
        },
      },
    }),
    prisma.payment.aggregate({
      where: {
        customerId: userId,
        status: "CAPTURED",
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
      vehicleSpending: vehicles.map((v) => ({
        id: v.id,
        name: `${v.year} ${v.make} ${v.model}`,
        totalSpent: 0, // TODO: calcular por veículo
        servicesCount: 0,
      })),
    },
  });
};

// ============================================
// D30 — LOGIN SESSIONS
// ============================================

/**
 * GET /api/v1/users/me/sessions
 * List active login sessions for current user
 */
export const getSessions = async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const sessions = await prisma.loginSession.findMany({
    where: {
      userId,
      revokedAt: null,
    },
    orderBy: { lastActiveAt: 'desc' },
    take: 10,
  });

  // If no sessions exist yet, create one for the current request
  if (sessions.length === 0) {
    const device = parseDeviceInfo(req.headers['user-agent']);
    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || '';
    const session = await prisma.loginSession.create({
      data: {
        userId,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        ipAddress: ip,
        userAgent: req.headers['user-agent'] || '',
        isCurrentSession: true,
        lastActiveAt: new Date(),
      },
    });
    res.json({ success: true, data: [session] });
    return;
  }

  res.json({ success: true, data: sessions });
};

/**
 * POST /api/v1/users/me/sessions/revoke
 * Revoke a specific session or all other sessions
 */
export const revokeSessions = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { sessionId, revokeAll } = req.body;

  if (revokeAll) {
    // Revoke all sessions except current
    await prisma.loginSession.updateMany({
      where: {
        userId,
        isCurrentSession: false,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    logger.info(`All other sessions revoked for user ${userId}`);
    res.json({ success: true, message: 'All other sessions revoked' });
    return;
  }

  if (sessionId) {
    await prisma.loginSession.updateMany({
      where: {
        id: sessionId,
        userId,
        isCurrentSession: false,
      },
      data: { revokedAt: new Date() },
    });
    logger.info(`Session ${sessionId} revoked for user ${userId}`);
    res.json({ success: true, message: 'Session revoked' });
    return;
  }

  res.status(400).json({ success: false, message: 'Provide sessionId or revokeAll: true' });
};

// ============================================
// D28 — CLIENT INSURANCE POLICIES
// ============================================

/**
 * GET /api/v1/users/me/insurance-policies
 * List client vehicle insurance policies
 */
export const getInsurancePolicies = async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const policies = await prisma.clientInsurancePolicy.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: policies });
};

/**
 * POST /api/v1/users/me/insurance-policies
 * Create a client vehicle insurance policy
 */
export const createInsurancePolicy = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const {
    provider, policyNumber, coverageType, premium, premiumFrequency,
    startDate, expiryDate, deductible, coverageAmount,
    agentName, agentPhone, notes, vehicleId, vehicleName, cardImageUrl,
  } = req.body;

  if (!provider || !policyNumber || !expiryDate) {
    res.status(400).json({
      success: false,
      message: 'Provider, policy number, and expiry date are required',
    });
    return;
  }

  const policy = await prisma.clientInsurancePolicy.create({
    data: {
      userId,
      provider,
      policyNumber,
      coverageType: coverageType || 'Full Coverage',
      premium: premium ? parseFloat(premium) : 0,
      premiumFrequency: premiumFrequency || 'monthly',
      startDate: startDate || null,
      expiryDate,
      deductible: deductible ? parseFloat(deductible) : 0,
      coverageAmount: coverageAmount ? parseFloat(coverageAmount) : 0,
      agentName: agentName || null,
      agentPhone: agentPhone || null,
      notes: notes || null,
      vehicleId: vehicleId || null,
      vehicleName: vehicleName || null,
      cardImageUrl: cardImageUrl || null,
    },
  });

  res.status(201).json({ success: true, data: policy });
};

/**
 * PATCH /api/v1/users/me/insurance-policies/:id
 * Update a client vehicle insurance policy
 */
export const updateInsurancePolicy = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  // Verify ownership
  const existing = await prisma.clientInsurancePolicy.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    res.status(404).json({ success: false, message: 'Policy not found' });
    return;
  }

  const {
    provider, policyNumber, coverageType, premium, premiumFrequency,
    startDate, expiryDate, deductible, coverageAmount,
    agentName, agentPhone, notes, vehicleId, vehicleName,
  } = req.body;

  const policy = await prisma.clientInsurancePolicy.update({
    where: { id },
    data: {
      ...(provider !== undefined && { provider }),
      ...(policyNumber !== undefined && { policyNumber }),
      ...(coverageType !== undefined && { coverageType }),
      ...(premium !== undefined && { premium: parseFloat(premium) }),
      ...(premiumFrequency !== undefined && { premiumFrequency }),
      ...(startDate !== undefined && { startDate }),
      ...(expiryDate !== undefined && { expiryDate }),
      ...(deductible !== undefined && { deductible: parseFloat(deductible) }),
      ...(coverageAmount !== undefined && { coverageAmount: parseFloat(coverageAmount) }),
      ...(agentName !== undefined && { agentName }),
      ...(agentPhone !== undefined && { agentPhone }),
      ...(notes !== undefined && { notes }),
      ...(vehicleId !== undefined && { vehicleId }),
      ...(vehicleName !== undefined && { vehicleName }),
    },
  });

  res.json({ success: true, data: policy });
};

/**
 * DELETE /api/v1/users/me/insurance-policies/:id
 * Delete a client vehicle insurance policy
 */
export const deleteInsurancePolicy = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  const existing = await prisma.clientInsurancePolicy.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    res.status(404).json({ success: false, message: 'Policy not found' });
    return;
  }

  await prisma.clientInsurancePolicy.delete({ where: { id } });

  res.json({ success: true, message: 'Policy deleted' });
};
