/**
 * Rotas Admin - Database Operations
 */

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';
import * as databaseController from '../controllers/database.controller';

const router = Router();

/**
 * POST /api/v1/admin/database/clean
 * Limpa banco de dados (exceto admins)
 * Requer: ADMIN role
 */
router.post(
  '/clean',
  authenticate,
  authorize('ADMIN'),
  asyncHandler(databaseController.cleanDatabase)
);

export default router;
