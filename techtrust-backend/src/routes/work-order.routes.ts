import { Router } from 'express';
import * as workOrderController from '../controllers/work-order.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

/**
 * GET /api/v1/work-orders
 * Listar ordens
 */
router.get('/', asyncHandler(workOrderController.getWorkOrders));

/**
 * GET /api/v1/work-orders/:orderId
 * Ver detalhes
 */
router.get('/:orderId', asyncHandler(workOrderController.getWorkOrder));

/**
 * POST /api/v1/work-orders/:orderId/start
 * Fornecedor inicia
 */
router.post('/:orderId/start', asyncHandler(workOrderController.startWorkOrder));

/**
 * POST /api/v1/work-orders/:orderId/complete
 * Fornecedor completa
 */
router.post('/:orderId/complete', asyncHandler(workOrderController.completeWorkOrder));

/**
 * POST /api/v1/work-orders/:orderId/approve
 * Cliente aprova
 */
router.post('/:orderId/approve', asyncHandler(workOrderController.approveCompletion));

/**
 * POST /api/v1/work-orders/:orderId/report-issue
 * Cliente reporta problema
 */
router.post('/:orderId/report-issue', asyncHandler(workOrderController.reportIssue));

export default router;
