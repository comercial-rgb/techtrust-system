/**
 * ============================================
 * VEHICLE CONTROLLER
 * ============================================
 * CRUD de veículos do usuário
 */

import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error-handler';
import { logger } from '../config/logger';

/**
 * GET /api/v1/vehicles
 * Listar todos os veículos do usuário
 */
export const getVehicles = async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const vehicles = await prisma.vehicle.findMany({
    where: {
      userId: userId,
      isActive: true,
    },
    orderBy: [
      { isPrimary: 'desc' },
      { createdAt: 'desc' },
    ],
    select: {
      id: true,
      plateNumber: true,
      vin: true,
      make: true,
      model: true,
      year: true,
      color: true,
      currentMileage: true,
      photoUrl: true,
      isPrimary: true,
      createdAt: true,
    },
  });

  res.json({
    success: true,
    data: vehicles,
  });
};

/**
 * POST /api/v1/vehicles
 * Adicionar novo veículo
 */
export const createVehicle = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { plateNumber, vin, make, model, year, color, currentMileage } = req.body;

  // Verificar assinatura e limite de veículos
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId: userId,
      status: 'ACTIVE',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!subscription) {
    throw new AppError('Assinatura não encontrada', 404, 'SUBSCRIPTION_NOT_FOUND');
  }

  // Contar veículos ativos
  const vehicleCount = await prisma.vehicle.count({
    where: {
      userId: userId,
      isActive: true,
    },
  });

  // Verificar limite
  if (vehicleCount >= subscription.maxVehicles) {
    throw new AppError(
      `Você atingiu o limite de ${subscription.maxVehicles} veículo(s) do seu plano ${subscription.plan}. Faça upgrade para adicionar mais.`,
      403,
      'VEHICLE_LIMIT_REACHED'
    );
  }

  // Verificar se placa já existe para este usuário
  const existingVehicle = await prisma.vehicle.findFirst({
    where: {
      userId: userId,
      plateNumber: plateNumber.toUpperCase(),
      isActive: true,
    },
  });

  if (existingVehicle) {
    throw new AppError('Você já cadastrou um veículo com esta placa', 409, 'PLATE_ALREADY_EXISTS');
  }

  // Se for o primeiro veículo, definir como primary
  const isPrimary = vehicleCount === 0;

  // Criar veículo
  const vehicle = await prisma.vehicle.create({
    data: {
      userId,
      plateNumber: plateNumber.toUpperCase(),
      vin: vin?.toUpperCase(),
      make,
      model,
      year: parseInt(year),
      color,
      currentMileage: currentMileage ? parseInt(currentMileage) : null,
      isPrimary,
      isActive: true,
    },
  });

  logger.info(`Veículo adicionado: ${vehicle.plateNumber} por ${userId}`);

  res.status(201).json({
    success: true,
    message: 'Veículo adicionado com sucesso',
    data: vehicle,
  });
};

/**
 * GET /api/v1/vehicles/:vehicleId
 * Obter detalhes de um veículo
 */
export const getVehicle = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { vehicleId } = req.params;

  const vehicle = await prisma.vehicle.findFirst({
    where: {
      id: vehicleId,
      userId: userId,
      isActive: true,
    },
    include: {
      maintenanceSchedule: {
        orderBy: {
          nextServiceDueDate: 'asc',
        },
      },
      serviceRequests: {
        take: 5,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          requestNumber: true,
          serviceType: true,
          title: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  if (!vehicle) {
    throw new AppError('Veículo não encontrado', 404, 'VEHICLE_NOT_FOUND');
  }

  res.json({
    success: true,
    data: vehicle,
  });
};

/**
 * PATCH /api/v1/vehicles/:vehicleId
 * Atualizar dados do veículo
 */
export const updateVehicle = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { vehicleId } = req.params;
  const { plateNumber, vin, make, model, year, color, currentMileage } = req.body;

  // Verificar se veículo pertence ao usuário
  const existingVehicle = await prisma.vehicle.findFirst({
    where: {
      id: vehicleId,
      userId: userId,
      isActive: true,
    },
  });

  if (!existingVehicle) {
    throw new AppError('Veículo não encontrado', 404, 'VEHICLE_NOT_FOUND');
  }

  // Se está alterando a placa, verificar duplicidade
  if (plateNumber && plateNumber !== existingVehicle.plateNumber) {
    const duplicate = await prisma.vehicle.findFirst({
      where: {
        userId: userId,
        plateNumber: plateNumber.toUpperCase(),
        isActive: true,
        NOT: {
          id: vehicleId,
        },
      },
    });

    if (duplicate) {
      throw new AppError('Você já tem outro veículo com esta placa', 409, 'PLATE_ALREADY_EXISTS');
    }
  }

  // Atualizar veículo
  const vehicle = await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      ...(plateNumber && { plateNumber: plateNumber.toUpperCase() }),
      ...(vin && { vin: vin.toUpperCase() }),
      ...(make && { make }),
      ...(model && { model }),
      ...(year && { year: parseInt(year) }),
      ...(color !== undefined && { color }),
      ...(currentMileage !== undefined && {
        currentMileage: currentMileage ? parseInt(currentMileage) : null,
        lastMileageUpdate: new Date(),
      }),
    },
  });

  logger.info(`Veículo atualizado: ${vehicle.id}`);

  res.json({
    success: true,
    message: 'Veículo atualizado com sucesso',
    data: vehicle,
  });
};

/**
 * POST /api/v1/vehicles/:vehicleId/set-primary
 * Definir veículo como principal
 */
export const setPrimaryVehicle = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { vehicleId } = req.params;

  // Verificar se veículo pertence ao usuário
  const vehicle = await prisma.vehicle.findFirst({
    where: {
      id: vehicleId,
      userId: userId,
      isActive: true,
    },
  });

  if (!vehicle) {
    throw new AppError('Veículo não encontrado', 404, 'VEHICLE_NOT_FOUND');
  }

  // Usar transaction para garantir consistência
  await prisma.$transaction([
    // Remover primary de todos os outros
    prisma.vehicle.updateMany({
      where: {
        userId: userId,
        isActive: true,
      },
      data: {
        isPrimary: false,
      },
    }),
    // Definir este como primary
    prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        isPrimary: true,
      },
    }),
  ]);

  logger.info(`Veículo principal definido: ${vehicle.id}`);

  res.json({
    success: true,
    message: 'Veículo principal atualizado',
  });
};

/**
 * DELETE /api/v1/vehicles/:vehicleId
 * Deletar veículo (soft delete)
 */
export const deleteVehicle = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { vehicleId } = req.params;

  // Verificar se veículo pertence ao usuário
  const vehicle = await prisma.vehicle.findFirst({
    where: {
      id: vehicleId,
      userId: userId,
      isActive: true,
    },
  });

  if (!vehicle) {
    throw new AppError('Veículo não encontrado', 404, 'VEHICLE_NOT_FOUND');
  }

  // Verificar se há service requests ativos
  const activeRequests = await prisma.serviceRequest.count({
    where: {
      vehicleId: vehicleId,
      status: {
        in: ['SEARCHING_PROVIDERS', 'QUOTES_RECEIVED', 'SCHEDULED', 'IN_PROGRESS'],
      },
    },
  });

  if (activeRequests > 0) {
    throw new AppError(
      'Não é possível deletar veículo com solicitações de serviço ativas',
      400,
      'VEHICLE_HAS_ACTIVE_REQUESTS'
    );
  }

  // Soft delete
  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      isActive: false,
      deletedAt: new Date(),
    },
  });

  // Se era o veículo principal, definir outro como principal
  if (vehicle.isPrimary) {
    const firstVehicle = await prisma.vehicle.findFirst({
      where: {
        userId: userId,
        isActive: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (firstVehicle) {
      await prisma.vehicle.update({
        where: { id: firstVehicle.id },
        data: { isPrimary: true },
      });
    }
  }

  logger.info(`Veículo deletado: ${vehicle.id}`);

  res.json({
    success: true,
    message: 'Veículo removido com sucesso',
  });
};
