import { Router } from 'express';
import * as quoteController from '../controllers/quote.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { asyncHandler } from '../utils/async-handler';
import {
  createQuoteValidation,
  quoteIdValidation,
} from '../validators/quote.validator';
import { requestIdValidation } from '../validators/service-request.validator';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

/**
 * POST /api/v1/quotes
 * Fornecedor cria orçamento
 */
router.post(
  '/',
  validate(createQuoteValidation),
  asyncHandler(quoteController.createQuote)
);

/**
 * GET /api/v1/quotes/service-requests/:requestId
 * Cliente lista orçamentos de uma solicitação
 */
router.get(
  '/service-requests/:requestId',
  validate(requestIdValidation),
  asyncHandler(quoteController.getQuotesForRequest)
);

/**
 * GET /api/v1/quotes/:quoteId
 * Ver detalhes
 */
router.get(
  '/:quoteId',
  validate(quoteIdValidation),
  asyncHandler(quoteController.getQuote)
);

/**
 * POST /api/v1/quotes/:quoteId/accept
 * Cliente aceita
 */
router.post(
  '/:quoteId/accept',
  validate(quoteIdValidation),
  asyncHandler(quoteController.acceptQuote)
);

/**
 * POST /api/v1/quotes/:quoteId/reject
 * Cliente rejeita
 */
router.post(
  '/:quoteId/reject',
  validate(quoteIdValidation),
  asyncHandler(quoteController.rejectQuote)
);

export default router;
