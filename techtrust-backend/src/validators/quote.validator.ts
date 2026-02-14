/**
 * ============================================
 * QUOTE VALIDATORS
 * ============================================
 * Validações para orçamentos
 */

import { body, param } from 'express-validator';

/**
 * Validação para createQuote
 */
export const createQuoteValidation = [
  body('serviceRequestId')
    .trim()
    .notEmpty().withMessage('ID da solicitação é obrigatório'),

  body('partsCost')
    .notEmpty().withMessage('Custo de peças é obrigatório')
    .isFloat({ min: 0 }).withMessage('Custo de peças deve ser um número positivo'),

  body('laborCost')
    .notEmpty().withMessage('Custo de mão-de-obra é obrigatório')
    .isFloat({ min: 0 }).withMessage('Custo de mão-de-obra deve ser um número positivo'),

  body('additionalFees')
    .optional()
    .isFloat({ min: 0 }).withMessage('Taxas adicionais devem ser um número positivo'),

  body('taxAmount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Impostos devem ser um número positivo'),

  body('partsList')
    .optional()
    .isArray().withMessage('Lista de peças deve ser um array'),

  body('laborDescription')
    .trim()
    .notEmpty().withMessage('Descrição do serviço é obrigatória')
    .isLength({ min: 20, max: 1000 }).withMessage('Descrição deve ter entre 20 e 1000 caracteres'),

  body('estimatedHours')
    .optional()
    .isFloat({ min: 0.5, max: 100 }).withMessage('Horas estimadas deve estar entre 0.5 e 100'),

  body('estimatedCompletionTime')
    .optional()
    .trim(),

  body('availableDate')
    .optional()
    .isISO8601().withMessage('Data disponível inválida'),

  body('availableTime')
    .optional()
    .isISO8601().withMessage('Hora disponível inválida'),

  body('warrantyMonths')
    .optional()
    .isInt({ min: 1, max: 120 }).withMessage('Garantia deve estar entre 1 e 120 meses'),

  body('warrantyMileage')
    .optional()
    .isInt({ min: 1000 }).withMessage('Garantia em km deve ser no mínimo 1000'),

  body('warrantyDescription')
    .optional()
    .trim(),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Notas devem ter no máximo 500 caracteres'),

  // ===== FDACS Compliance Fields =====
  body('proposedCompletionDate')
    .optional()
    .isISO8601().withMessage('Proposed completion date must be a valid date'),

  body('laborChargeType')
    .optional()
    .isIn(['FLAT_RATE', 'HOURLY', 'BOTH']).withMessage('Labor charge type must be FLAT_RATE, HOURLY, or BOTH'),

  body('hourlyRate')
    .optional()
    .isFloat({ min: 0 }).withMessage('Hourly rate must be a positive number'),

  body('shopSuppliesFee')
    .optional()
    .isFloat({ min: 0 }).withMessage('Shop supplies fee must be a positive number'),

  body('newTireCount')
    .optional()
    .isInt({ min: 0 }).withMessage('New tire count must be a non-negative integer'),

  body('newBatteryCount')
    .optional()
    .isInt({ min: 0 }).withMessage('New battery count must be a non-negative integer'),

  body('intendedPaymentMethod')
    .optional()
    .isIn(['CASH', 'CHECK', 'VISA', 'MC', 'AMEX', 'OTHER']).withMessage('Invalid payment method'),

  body('authorizedPersonName')
    .optional()
    .trim(),

  body('authorizedPersonPhone')
    .optional()
    .trim(),

  body('saveReplacedParts')
    .optional()
    .isBoolean().withMessage('Save replaced parts must be true or false'),

  body('dailyStorageCharge')
    .optional()
    .isFloat({ min: 0 }).withMessage('Daily storage charge must be a positive number'),

  body('estimateConsentType')
    .optional()
    .isIn(['REQUEST_ESTIMATE', 'NO_ESTIMATE_LIMIT', 'NO_ESTIMATE']).withMessage('Invalid consent type'),

  body('maxAmountWithoutEstimate')
    .optional()
    .isFloat({ min: 0 }).withMessage('Max amount must be a positive number'),

  body('consentSignature')
    .optional()
    .trim(),
];

/**
 * Validação para quoteId param
 */
export const quoteIdValidation = [
  param('quoteId')
    .trim()
    .notEmpty().withMessage('ID do orçamento é obrigatório'),
];
