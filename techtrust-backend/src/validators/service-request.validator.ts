/**
 * ============================================
 * SERVICE REQUEST VALIDATORS
 * ============================================
 * Validações para solicitações de serviço
 */

import { body, param, query } from 'express-validator';

/**
 * Validação para createServiceRequest
 */
export const createServiceRequestValidation = [
  body('vehicleId')
    .trim()
    .notEmpty().withMessage('ID do veículo é obrigatório'),

  body('serviceType')
    .trim()
    .notEmpty().withMessage('Tipo de serviço é obrigatório')
    .isIn([
      'SCHEDULED_MAINTENANCE',
      'REPAIR',
      'ROADSIDE_SOS',
      'INSPECTION',
      'DETAILING',
    ]).withMessage('Tipo de serviço inválido'),

  body('title')
    .trim()
    .notEmpty().withMessage('Título é obrigatório')
    .isLength({ min: 10, max: 100 }).withMessage('Título deve ter entre 10 e 100 caracteres'),

  body('description')
    .trim()
    .notEmpty().withMessage('Descrição é obrigatória')
    .isLength({ min: 20, max: 1000 }).withMessage('Descrição deve ter entre 20 e 1000 caracteres'),

  body('serviceLocationType')
    .trim()
    .notEmpty().withMessage('Tipo de local é obrigatório')
    .isIn(['SHOP', 'MOBILE', 'CUSTOMER_LOCATION']).withMessage('Tipo de local inválido'),

  body('customerAddress')
    .optional()
    .trim(),

  body('preferredDate')
    .optional()
    .isISO8601().withMessage('Data preferida inválida'),

  body('preferredTime')
    .optional()
    .isISO8601().withMessage('Hora preferida inválida'),

  body('isUrgent')
    .optional()
    .isBoolean().withMessage('isUrgent deve ser true ou false'),
];

/**
 * Validação para query params
 */
export const listServiceRequestsValidation = [
  query('status')
    .optional()
    .isIn([
      'SEARCHING_PROVIDERS',
      'QUOTES_RECEIVED',
      'QUOTE_ACCEPTED',
      'SCHEDULED',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED',
    ]).withMessage('Status inválido'),

  query('vehicleId')
    .optional()
    .trim(),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Página deve ser um número positivo'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Limite deve estar entre 1 e 50'),
];

/**
 * Validação para requestId param
 */
export const requestIdValidation = [
  param('requestId')
    .trim()
    .notEmpty().withMessage('ID da solicitação é obrigatório'),
];

/**
 * Validação para cancelar
 */
export const cancelServiceRequestValidation = [
  param('requestId')
    .trim()
    .notEmpty().withMessage('ID da solicitação é obrigatório'),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Motivo deve ter no máximo 500 caracteres'),
];
