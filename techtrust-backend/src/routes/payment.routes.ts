import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.use(authenticate);

router.post('/create-intent', asyncHandler(paymentController.createPaymentIntent));
router.post('/:paymentId/confirm', asyncHandler(paymentController.confirmPayment));
router.get('/history', asyncHandler(paymentController.getPaymentHistory));

export default router;
