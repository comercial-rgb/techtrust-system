/**
 * ============================================
 * VEHICLE VALIDATORS
 * ============================================
 * Validações para rotas de veículos
 */

import { body, param } from 'express-validator';

/**
 * Validação para createVehicle
 */
export const createVehicleValidation = [
  body('plateNumber')
    .trim()
    .notEmpty().withMessage('Placa é obrigatória')
    .isLength({ min: 6, max: 10 }).withMessage('Placa deve ter entre 6 e 10 caracteres'),

  body('vin')
    .optional()
    .trim()
    .isLength({ min: 17, max: 17 }).withMessage('VIN deve ter exatamente 17 caracteres'),

  body('make')
    .trim()
    .notEmpty().withMessage('Marca é obrigatória'),

  body('model')
    .trim()
    .notEmpty().withMessage('Modelo é obrigatório'),

  body('year')
    .notEmpty().withMessage('Ano é obrigatório')
    .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
    .withMessage(`Ano deve estar entre 1900 e ${new Date().getFullYear() + 1}`),

  body('color')
    .optional()
    .trim(),

  body('currentMileage')
    .optional()
    .isInt({ min: 0 }).withMessage('Hodômetro deve ser um número positivo'),
];

/**
 * Validação para updateVehicle
 */
export const updateVehicleValidation = [
  param('vehicleId')
    .trim()
    .notEmpty().withMessage('ID do veículo é obrigatório'),

  body('plateNumber')
    .optional()
    .trim()
    .isLength({ min: 6, max: 10 }).withMessage('Placa deve ter entre 6 e 10 caracteres'),

  body('vin')
    .optional()
    .trim()
    .isLength({ min: 17, max: 17 }).withMessage('VIN deve ter exatamente 17 caracteres'),

  body('make')
    .optional()
    .trim(),

  body('model')
    .optional()
    .trim(),

  body('year')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
    .withMessage(`Ano deve estar entre 1900 e ${new Date().getFullYear() + 1}`),

  body('color')
    .optional()
    .trim(),

  body('currentMileage')
    .optional()
    .isInt({ min: 0 }).withMessage('Hodômetro deve ser um número positivo'),
];

/**
 * Validação para param vehicleId
 */
export const vehicleIdValidation = [
  param('vehicleId')
    .trim()
    .notEmpty().withMessage('ID do veículo é obrigatório'),
];
