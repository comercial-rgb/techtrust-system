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
