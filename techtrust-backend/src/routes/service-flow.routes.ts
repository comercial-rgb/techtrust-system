/**
 * ============================================
 * SERVICE FLOW ROUTES
 * ============================================
 * Rotas do fluxo completo de pagamento:
 * - Aprovação de orçamento com hold
 * - Suplementos de valor
 * - Cancelamento com validação
 * - Fotos do serviço
 * - Aprovação do cliente com termos
 * - Comparação de processadores
 * - Consulta de orçamento/recibo
 */

import { Router } from 'express';
import * as serviceFlowController from '../controllers/service-flow.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';

const router = Router();
router.use(authenticate);

// 1. Aprovação de orçamento + hold no cartão
router.post('/approve-quote', asyncHandler(serviceFlowController.approveQuoteWithPaymentHold));

// 2. Suplementos
router.post('/request-supplement', asyncHandler(serviceFlowController.requestSupplement));
router.post('/respond-supplement', asyncHandler(serviceFlowController.respondToSupplement));

// 3. Cancelamento
router.post('/request-cancellation', asyncHandler(serviceFlowController.requestCancellation));
router.post('/validate-cancellation', asyncHandler(serviceFlowController.validateCancellation));

// 4. Fotos do serviço
router.post('/upload-service-photos', asyncHandler(serviceFlowController.uploadServicePhotos));

// 5. Fornecedor finaliza serviço
router.post('/complete-service', asyncHandler(serviceFlowController.completeService));

// 6. Cliente aprova com termos + captura pagamento + recibo
router.post('/approve-service', asyncHandler(serviceFlowController.approveServiceAndProcessPayment));

// 7. Comparar processadores de pagamento (Stripe vs Chase)
router.post('/compare-processors', asyncHandler(serviceFlowController.comparePaymentProcessors));

// 8. Consultar orçamento aprovado e valores provisionados
router.get('/approved-quote/:workOrderId', asyncHandler(serviceFlowController.getApprovedQuoteDetails));

// 9. Consultar recibo
router.get('/receipt/:paymentId', asyncHandler(serviceFlowController.getReceipt));

export default router;
