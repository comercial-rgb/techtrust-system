import { Router } from 'express';
import * as verificationController from '../controllers/verification.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.use(authenticate);

// POST /verification/verify - Admin: Verify compliance item, insurance, or technician cert
router.post('/verify', asyncHandler(verificationController.verifyEntity));

// GET /verification/pending - Admin: Get all pending verifications
router.get('/pending', asyncHandler(verificationController.getPendingVerifications));

// GET /verification/logs/:entityId - Get verification history
router.get('/logs/:entityId', asyncHandler(verificationController.getVerificationLogs));

// POST /verification/risk-acceptance - Customer: Accept risk disclaimer
router.post('/risk-acceptance', asyncHandler(verificationController.acceptRiskDisclaimer));

// GET /verification/risk-acceptance/check - Customer: Check risk acceptance status
router.get('/risk-acceptance/check', asyncHandler(verificationController.checkRiskAcceptance));

export default router;
