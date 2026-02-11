import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.use(authenticate);

// Criar PaymentIntent para work order (pré-autorização)
router.post('/create-intent', asyncHandler(paymentController.createPaymentIntent));

// Criar SetupIntent para salvar cartão (PCI compliant)
router.post('/setup-intent', asyncHandler(paymentController.createSetupIntent));

// Confirmar pré-autorização (cliente autorizou o hold)
router.post('/:paymentId/confirm', asyncHandler(paymentController.confirmPayment));

// Capturar pagamento (hold → cobrança real, após serviço concluído)
router.post('/:paymentId/capture', asyncHandler(paymentController.capturePayment));

// Cancelar pré-autorização (liberar hold sem cobrar)
router.post('/:paymentId/void', asyncHandler(paymentController.voidPayment));

// Solicitar reembolso (48h após captura)
router.post('/:paymentId/refund', asyncHandler(paymentController.requestRefund));

// Histórico de pagamentos
router.get('/history', asyncHandler(paymentController.getPaymentHistory));

export default router;
