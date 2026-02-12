/**
 * ============================================
 * ESTIMATE SHARE ROUTES
 * ============================================
 * Share Written Estimates for competing quotes
 */

import { Router } from 'express';
import * as estimateShareController from '../controllers/estimate-share.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';

const router = Router();
router.use(authenticate);

// Share an estimate (customer)
router.post('/', asyncHandler(estimateShareController.shareEstimate));

// List my shared estimates (customer)
router.get('/my', asyncHandler(estimateShareController.getMySharedEstimates));

// List available shared estimates (provider - for competing quotes)
router.get('/available', asyncHandler(estimateShareController.getAvailableSharedEstimates));

// Get shared estimate detail
router.get('/:id', asyncHandler(estimateShareController.getSharedEstimateDetail));

// Submit competing quote (provider)
router.post('/:id/submit-quote', asyncHandler(estimateShareController.submitCompetingQuote));

// Close sharing (customer)
router.patch('/:id/close', asyncHandler(estimateShareController.closeSharing));

export default router;
