import { Router } from 'express';
import * as insuranceController from '../controllers/insurance.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.use(authenticate);

// GET /insurance - Get insurance policies for current provider
router.get('/', asyncHandler(insuranceController.getInsurancePolicies));

// POST /insurance - Create or update an insurance policy
router.post('/', asyncHandler(insuranceController.upsertInsurancePolicy));

// POST /insurance/batch - Batch upsert insurance policies (onboarding)
router.post('/batch', asyncHandler(insuranceController.batchUpsertInsurance));

export default router;
