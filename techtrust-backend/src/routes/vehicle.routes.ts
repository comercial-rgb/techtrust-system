import { Router } from 'express';
import * as vehicleController from '../controllers/vehicle.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { asyncHandler } from '../utils/async-handler';
import {
  createVehicleValidation,
  updateVehicleValidation,
  vehicleIdValidation,
} from '../validators/vehicle.validator';

const router = Router();

// Todas as rotas de veículos requerem autenticação
router.use(authenticate);

/**
 * POST /api/v1/vehicles/decode-vin
 * Decodificar VIN usando API NHTSA vPIC (Enhanced 144 vars)
 */
router.post('/decode-vin', asyncHandler(vehicleController.decodeVehicleVIN));

/**
 * GET /api/v1/vehicles/mileage-banner
 * Banner data para mileage reminder (app open trigger)
 * Nota: antes das rotas com :vehicleId para evitar conflito
 */
router.get('/mileage-banner', asyncHandler(vehicleController.getMileageBanner));

/**
 * POST /api/v1/vehicles/mileage-reminder-opt-out
 * Opt-out de lembretes de mileagem
 */
router.post(
  '/mileage-reminder-opt-out',
  asyncHandler(vehicleController.mileageReminderOptOut),
);

/**
 * GET /api/v1/vehicles
 * Listar todos os veículos do usuário
 */
router.get('/', asyncHandler(vehicleController.getVehicles));

/**
 * POST /api/v1/vehicles
 * Adicionar novo veículo
 */
router.post(
  '/',
  validate(createVehicleValidation),
  asyncHandler(vehicleController.createVehicle)
);

/**
 * GET /api/v1/vehicles/:vehicleId
 * Obter detalhes de um veículo
 */
router.get(
  '/:vehicleId',
  validate(vehicleIdValidation),
  asyncHandler(vehicleController.getVehicle)
);

/**
 * PATCH /api/v1/vehicles/:vehicleId
 * Atualizar veículo
 */
router.patch(
  '/:vehicleId',
  validate(updateVehicleValidation),
  asyncHandler(vehicleController.updateVehicle)
);

/**
 * POST /api/v1/vehicles/:vehicleId/set-primary
 * Definir como principal
 */
router.post(
  '/:vehicleId/set-primary',
  validate(vehicleIdValidation),
  asyncHandler(vehicleController.setPrimaryVehicle)
);

/**
 * DELETE /api/v1/vehicles/:vehicleId
 * Deletar veículo
 */
router.delete(
  '/:vehicleId',
  validate(vehicleIdValidation),
  asyncHandler(vehicleController.deleteVehicle)
);

/**
 * GET /api/v1/vehicles/:vehicleId/recalls
 * Fetch NHTSA safety recalls for this vehicle
 */
router.get(
  '/:vehicleId/recalls',
  asyncHandler(vehicleController.getVehicleRecalls)
);

/**
 * POST /api/v1/vehicles/:vehicleId/mileage
 * Atualizar mileagem manualmente
 */
router.post(
  '/:vehicleId/mileage',
  asyncHandler(vehicleController.updateVehicleMileage),
);

/**
 * GET /api/v1/vehicles/:vehicleId/mileage-history
 * Histórico de mileagem
 */
router.get(
  '/:vehicleId/mileage-history',
  asyncHandler(vehicleController.getVehicleMileageHistory),
);

/**
 * GET /api/v1/vehicles/:vehicleId/catalog
 * Peças do catálogo orgânico para este veículo
 */
router.get(
  '/:vehicleId/catalog',
  asyncHandler(vehicleController.getVehicleCatalog),
);

export default router;
