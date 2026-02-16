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
 * Decodificar VIN usando API NHTSA
 */
router.post('/decode-vin', asyncHandler(vehicleController.decodeVehicleVIN));

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

export default router;
