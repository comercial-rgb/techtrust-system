/**
 * Endpoint Admin para limpar banco de dados
 * POST /api/v1/admin/database/clean
 */

import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error-handler';
import { logger } from '../config/logger';

export const cleanDatabase = async (req: Request, res: Response) => {
  try {
    // Verificar se é admin
    if (req.user?.role !== 'ADMIN') {
      throw new AppError('Apenas administradores podem limpar o banco', 403, 'FORBIDDEN');
    }

    // Verificar se está em produção - CUIDADO!
    if (process.env.NODE_ENV === 'production') {
      // Exigir confirmação extra em produção
      const { confirmPassword } = req.body;
      if (confirmPassword !== process.env.ADMIN_CLEAN_PASSWORD) {
        throw new AppError('Senha de confirmação inválida', 403, 'INVALID_CONFIRMATION');
      }
    }

    logger.warn('Iniciando limpeza do banco de dados...');

    // Limpar em ordem para respeitar relações
    await prisma.notification.deleteMany({});
    await prisma.chatMessage.deleteMany({});
    await prisma.review.deleteMany({});
    await prisma.paymentMethod.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.workOrder.deleteMany({});
    await prisma.quote.deleteMany({});
    await prisma.serviceRequest.deleteMany({});
    await prisma.vehicleMaintenanceSchedule.deleteMany({});
    await prisma.vehicle.deleteMany({});
    await prisma.coverageZone.deleteMany({});
    await prisma.providerProfile.deleteMany({});
    await prisma.subscription.deleteMany({});

    // Deletar usuários (exceto ADMIN)
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        role: {
          not: 'ADMIN'
        }
      }
    });

    // Limpar conteúdo
    await prisma.banner.deleteMany({});
    await prisma.specialOffer.deleteMany({});
    await prisma.article.deleteMany({});
    await prisma.notice.deleteMany({});

    logger.info(`Banco limpo: ${deletedUsers.count} usuários deletados`);

    res.json({
      success: true,
      message: 'Banco de dados limpo com sucesso',
      data: {
        usersDeleted: deletedUsers.count,
      },
    });
  } catch (error) {
    throw error;
  }
};
