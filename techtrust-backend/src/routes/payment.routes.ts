import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';
import * as pixController from '../controllers/pix.payment.controller';
import { authenticate } from '../middleware/auth';
import { paymentFlowRateLimiter } from '../middleware/rate-limiter';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.use(authenticate);
router.use(paymentFlowRateLimiter);

// ─── CARTÃO (Stripe — pré-autorização) ──────────────────────────────────────

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

// ─── PIX (Usuários brasileiros — BRL→USD) ────────────────────────────────────

// Emitir QR Code PIX para work order
router.post('/pix/create-charge', asyncHandler(pixController.createPixPaymentCharge));

// Verificar se PIX foi pago (polling manual — confirmação primária via webhook Asaas)
router.post('/pix/:paymentId/confirm', asyncHandler(pixController.confirmPixPayment));

// Cancelar cobrança PIX pendente
router.post('/pix/:paymentId/cancel', asyncHandler(pixController.cancelPixPayment));

// ─── HISTÓRICO ───────────────────────────────────────────────────────────────

// Histórico de pagamentos (cartão + PIX)
router.get('/history', asyncHandler(paymentController.getPaymentHistory));

export default router;
