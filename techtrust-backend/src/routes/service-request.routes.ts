import { Router } from 'express';
import * as serviceRequestController from '../controllers/service-request.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { asyncHandler } from '../utils/async-handler';
import {
  createServiceRequestValidation,
  listServiceRequestsValidation,
  requestIdValidation,
  cancelServiceRequestValidation,
} from '../validators/service-request.validator';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

/**
 * POST /api/v1/service-requests
 * Criar nova solicitação
 */
router.post(
  '/',
  validate(createServiceRequestValidation),
  asyncHandler(serviceRequestController.createServiceRequest)
);

/**
 * GET /api/v1/service-requests
 * Listar solicitações
 */
router.get(
  '/',
  validate(listServiceRequestsValidation),
  asyncHandler(serviceRequestController.getServiceRequests)
);

/**
 * GET /api/v1/service-requests/:requestId
 * Ver detalhes
 */
router.get(
  '/:requestId',
  validate(requestIdValidation),
  asyncHandler(serviceRequestController.getServiceRequest)
);

/**
 * POST /api/v1/service-requests/:requestId/cancel
 * Cancelar solicitação
 */
router.post(
  '/:requestId/cancel',
  validate(cancelServiceRequestValidation),
  asyncHandler(serviceRequestController.cancelServiceRequest)
);

/**
 * POST /api/v1/service-requests/:requestId/renew
 * Renew request to receive more quotes
 */
router.post(
  '/:requestId/renew',
  validate(requestIdValidation),
  asyncHandler(serviceRequestController.renewServiceRequest)
);

export default router;
