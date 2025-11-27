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
];

/**
 * Validação para quoteId param
 */
export const quoteIdValidation = [
  param('quoteId')
    .trim()
    .notEmpty().withMessage('ID do orçamento é obrigatório'),
];
