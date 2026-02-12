import { Router } from 'express';
import * as complianceController from '../controllers/compliance.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.use(authenticate);

// GET /compliance - Get compliance items for current provider
router.get('/', asyncHandler(complianceController.getComplianceItems));

// POST /compliance - Create or update a compliance item
router.post('/', asyncHandler(complianceController.upsertComplianceItem));

// POST /compliance/auto-create - Auto-create required compliance items
router.post('/auto-create', asyncHandler(complianceController.autoCreateComplianceItems));

// GET /compliance/summary - Get compliance summary with service gating
router.get('/summary', asyncHandler(complianceController.getComplianceSummary));

export default router;
