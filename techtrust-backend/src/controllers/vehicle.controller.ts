/**
 * ============================================
 * VEHICLE CONTROLLER
 * ============================================
 * CRUD de veículos do usuário
 * Enhanced: vPIC 144 variables, mileage reminders, organic catalog
 */

import { Request, Response } from "express";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error-handler";
import { logger } from "../config/logger";
import { isValidVINFormat } from "../services/nhtsa.service";
import {
  SUBSCRIPTION_PLANS,
  type PlanKey,
} from "../config/businessRules";
import {
  decodeVIN_vPIC,
  vpicToVehicleFields,
  getRecalls_NHTSA,
} from "../services/nhtsa-vpic.service";
import {
  updateMileageManual,
  getMileageBannerData,
  getMileageHistory,
  setMileageReminderOptOut,
} from "../services/mileage-reminder.service";
import { getCatalogByVehicle } from "../services/organic-catalog.service";

/**
 * GET /api/v1/vehicles
 * Listar todos os veículos do usuário
 */
export const getVehicles = async (req: Request, res: Response) => {
  const userId = req.user!.id;

  logger.info("🚗 GET /vehicles - userId:", userId);

  const vehicles = await prisma.vehicle.findMany({
    where: {
      userId: userId,
      isActive: true,
    },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
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
      engineType: true,
      fuelType: true,
      bodyType: true,
      trim: true,
      driveType: true,
      numberOfRows: true,
      seatingCapacity: true,
      countryOfManufacturer: true,
      category: true,
      transmission: true,
      // Enhanced vPIC fields
      engineCylinders: true,
      displacementL: true,
      displacementCC: true,
      engineHP: true,
      engineConfiguration: true,
      turbo: true,
      electrificationLevel: true,
      vehicleType: true,
      doors: true,
      manufacturer: true,
      fuelTypeSecondary: true,
      transmissionSpeeds: true,
      vpicCompleteness: true,
      lastMileageUpdate: true,
    },
  });

  logger.info(`🚗 Found ${vehicles.length} vehicles for user ${userId}`);
  logger.info("🚗 Vehicles:", JSON.stringify(vehicles, null, 2));

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
  const {
    plateNumber,
    plateState,
    vin,
    make,
    model,
    year,
    color,
    currentMileage,
    engineType,
    fuelType,
    bodyType,
    trim,
    driveType,
    numberOfRows,
    seatingCapacity,
    countryOfManufacturer,
    category,
    transmission,
    vinDecoded = false,
  } = req.body;

  // Verificar assinatura e limite de veículos
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId: userId,
      status: "ACTIVE",
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!subscription) {
    throw new AppError(
      "Assinatura não encontrada",
      404,
      "SUBSCRIPTION_NOT_FOUND",
    );
  }

  // Contar veículos ativos
  const vehicleCount = await prisma.vehicle.count({
    where: {
      userId: userId,
      isActive: true,
    },
  });

  // Verificar limite (businessRules SUBSCRIPTION_PLANS como source of truth)
  const planConfig = SUBSCRIPTION_PLANS[subscription.plan as PlanKey];
  const maxVehicles = planConfig?.maxVehicles ?? subscription.maxVehicles;

  if (vehicleCount >= maxVehicles) {
    throw new AppError(
      `You've reached the limit of ${maxVehicles} vehicle(s) for your ${subscription.plan} plan. Upgrade to add more.`,
      403,
      "VEHICLE_LIMIT_REACHED",
    );
  }

  // Verificar se placa já existe para este usuário (se placa foi fornecida)
  if (plateNumber) {
    const existingVehicle = await prisma.vehicle.findFirst({
      where: {
        userId: userId,
        plateNumber: plateNumber.toUpperCase(),
        isActive: true,
      },
    });

    if (existingVehicle) {
      throw new AppError(
        "Você já cadastrou um veículo com esta placa",
        409,
        "PLATE_ALREADY_EXISTS",
      );
    }
  }

  // Se for o primeiro veículo, definir como primary
  const isPrimary = vehicleCount === 0;

  // Criar veículo
  const vehicle = await prisma.vehicle.create({
    data: {
      userId,
      plateNumber: plateNumber?.toUpperCase() || null,
      plateState: plateState?.toUpperCase() || null,
      vin: vin?.toUpperCase() || null,
      make,
      model,
      year: parseInt(year),
      color,
      currentMileage: currentMileage ? parseInt(currentMileage) : null,
      engineType,
      fuelType,
      bodyType,
      trim,
      driveType,
      numberOfRows: numberOfRows ? parseInt(numberOfRows) : null,
      seatingCapacity: seatingCapacity ? parseInt(seatingCapacity) : null,
      countryOfManufacturer,
      category,
      transmission,
      vinDecoded: vinDecoded,
      vinDecodedAt: vinDecoded ? new Date() : null,
      isPrimary,
      isActive: true,
    },
  });

  logger.info(
    `Veículo adicionado: ${vehicle.plateNumber || vehicle.vin || vehicle.id} por ${userId}`,
  );

  res.status(201).json({
    success: true,
    message: "Veículo adicionado com sucesso",
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
          nextServiceDueDate: "asc",
        },
      },
      serviceRequests: {
        take: 5,
        orderBy: {
          createdAt: "desc",
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
    throw new AppError("Veículo não encontrado", 404, "VEHICLE_NOT_FOUND");
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
  const {
    plateNumber, vin, make, model, year, color, currentMileage,
    vehicleType, fuelType, engineType, bodyType, trim, driveType,
    numberOfRows, seatingCapacity, countryOfManufacturer, category,
    transmission, vinDecoded, photoUrl,
  } = req.body;

  // Map vehicleType → bodyType if bodyType not explicitly provided
  const resolvedBodyType = bodyType || vehicleType || undefined;

  // Verificar se veículo pertence ao usuário
  const existingVehicle = await prisma.vehicle.findFirst({
    where: {
      id: vehicleId,
      userId: userId,
      isActive: true,
    },
  });

  if (!existingVehicle) {
    throw new AppError("Veículo não encontrado", 404, "VEHICLE_NOT_FOUND");
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
      throw new AppError(
        "Você já tem outro veículo com esta placa",
        409,
        "PLATE_ALREADY_EXISTS",
      );
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
      ...(resolvedBodyType !== undefined && { bodyType: resolvedBodyType }),
      ...(fuelType !== undefined && { fuelType }),
      ...(engineType !== undefined && { engineType }),
      ...(trim !== undefined && { trim }),
      ...(driveType !== undefined && { driveType }),
      ...(numberOfRows !== undefined && { numberOfRows: numberOfRows ? parseInt(numberOfRows) : null }),
      ...(seatingCapacity !== undefined && { seatingCapacity: seatingCapacity ? parseInt(seatingCapacity) : null }),
      ...(countryOfManufacturer !== undefined && { countryOfManufacturer }),
      ...(category !== undefined && { category }),
      ...(transmission !== undefined && { transmission }),
      ...(vinDecoded !== undefined && { vinDecoded: !!vinDecoded }),
      ...(photoUrl !== undefined && { photoUrl }),
    },
  });

  logger.info(`Veículo atualizado: ${vehicle.id}`);

  res.json({
    success: true,
    message: "Veículo atualizado com sucesso",
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
    throw new AppError("Veículo não encontrado", 404, "VEHICLE_NOT_FOUND");
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
    message: "Veículo principal atualizado",
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
    throw new AppError("Veículo não encontrado", 404, "VEHICLE_NOT_FOUND");
  }

  // Verificar se há service requests ativos
  const activeRequests = await prisma.serviceRequest.count({
    where: {
      vehicleId: vehicleId,
      status: {
        in: [
          "SEARCHING_PROVIDERS",
          "QUOTES_RECEIVED",
          "SCHEDULED",
          "IN_PROGRESS",
        ],
      },
    },
  });

  if (activeRequests > 0) {
    throw new AppError(
      "Não é possível deletar veículo com solicitações de serviço ativas",
      400,
      "VEHICLE_HAS_ACTIVE_REQUESTS",
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
        createdAt: "asc",
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
    message: "Veículo removido com sucesso",
  });
};

/**
 * POST /api/v1/vehicles/decode-vin
 * Decodificar VIN usando API NHTSA vPIC (Enhanced — 144 variables)
 *
 * Se saveToVehicle=true e vehicleId fornecido, salva automaticamente
 * todos os campos decodificados no veículo.
 */
export const decodeVehicleVIN = async (req: Request, res: Response) => {
  const { vin, saveToVehicle, vehicleId } = req.body;
  const userId = req.user!.id;

  if (!vin) {
    throw new AppError("VIN é obrigatório", 400, "VIN_REQUIRED");
  }

  // Validar formato do VIN
  if (!isValidVINFormat(vin)) {
    throw new AppError(
      "VIN inválido. Deve conter 17 caracteres alfanuméricos (sem I, O, Q)",
      400,
      "INVALID_VIN_FORMAT",
    );
  }

  // Decodificar VIN via NHTSA vPIC Enhanced (144 variables + cache)
  const decoded = await decodeVIN_vPIC(vin);

  if (!decoded.success || !decoded.vehicle?.make) {
    throw new AppError(
      decoded.error || "VIN não pôde ser decodificado. Verifique se o VIN está correto.",
      400,
      "VIN_DECODE_FAILED",
    );
  }

  // Se solicitado, salvar no veículo existente
  if (saveToVehicle && vehicleId) {
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, userId, isActive: true },
    });

    if (vehicle) {
      const fields = vpicToVehicleFields(decoded.vehicle);
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: {
          ...fields,
          vin: vin.toUpperCase(),
          vinDecoded: true,
          vinDecodedAt: new Date(),
        },
      });
      logger.info(`VIN decoded and saved to vehicle ${vehicleId}: ${vin}`);
    }
  }

  logger.info(`VIN decodificado com sucesso: ${vin} (completeness: ${decoded.completeness}%)`);

  res.json({
    success: true,
    data: decoded,
  });
};

/**
 * GET /api/v1/vehicles/:vehicleId/recalls
 * Fetch NHTSA safety recalls for a vehicle (Enhanced)
 */
export const getVehicleRecalls = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { vehicleId } = req.params;

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, userId, isActive: true },
    select: { make: true, model: true, year: true },
  });

  if (!vehicle) {
    throw new AppError("Vehicle not found", 404, "VEHICLE_NOT_FOUND");
  }

  // Use enhanced recalls API
  const result = await getRecalls_NHTSA(vehicle.make, vehicle.model, vehicle.year);

  logger.info(`Recalls fetched: ${result.count} for ${vehicle.year} ${vehicle.make} ${vehicle.model}`);

  res.json({
    success: true,
    data: result.recalls,
    count: result.count,
  });
};

// ═══════════════════════════════════════════════
// MILEAGE ENDPOINTS
// ═══════════════════════════════════════════════

/**
 * POST /api/v1/vehicles/:vehicleId/mileage
 * Atualizar mileagem manualmente
 */
export const updateVehicleMileage = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { vehicleId } = req.params;
  const { mileage } = req.body;

  if (!mileage || isNaN(Number(mileage))) {
    throw new AppError("Mileage is required and must be a number", 400, "INVALID_MILEAGE");
  }

  const result = await updateMileageManual({
    userId,
    vehicleId,
    mileage: parseInt(mileage),
  });

  res.json({
    success: true,
    message: "Mileage updated",
    data: result,
  });
};

/**
 * GET /api/v1/vehicles/:vehicleId/mileage-history
 * Histórico de mileagem
 */
export const getVehicleMileageHistory = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { vehicleId } = req.params;

  const history = await getMileageHistory({
    userId,
    vehicleId,
    limit: parseInt(req.query.limit as string) || 20,
  });

  res.json({
    success: true,
    data: history,
  });
};

/**
 * GET /api/v1/vehicles/mileage-banner
 * Banner data para app open (Trigger 3)
 */
export const getMileageBanner = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const banner = await getMileageBannerData(userId);

  res.json({
    success: true,
    data: banner,
  });
};

/**
 * POST /api/v1/vehicles/mileage-reminder-opt-out
 * Opt-out de lembretes de mileagem
 */
export const mileageReminderOptOut = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { optOut } = req.body;

  await setMileageReminderOptOut(userId, optOut !== false);

  res.json({
    success: true,
    message: optOut !== false ? "Mileage reminders disabled" : "Mileage reminders enabled",
  });
};

// ═══════════════════════════════════════════════
// CATALOG ENDPOINTS
// ═══════════════════════════════════════════════

/**
 * GET /api/v1/vehicles/:vehicleId/catalog
 * Peças do catálogo orgânico para este veículo
 */
export const getVehicleCatalog = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { vehicleId } = req.params;

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, userId, isActive: true },
    select: { make: true, model: true, year: true },
  });

  if (!vehicle) {
    throw new AppError("Vehicle not found", 404, "VEHICLE_NOT_FOUND");
  }

  const catalog = await getCatalogByVehicle({
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    searchTerm: req.query.search as string,
    limit: parseInt(req.query.limit as string) || 20,
  });

  res.json({
    success: true,
    data: catalog,
    count: catalog.length,
  });
};
