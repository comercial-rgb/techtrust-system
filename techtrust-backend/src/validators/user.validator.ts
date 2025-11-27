/**
 * ============================================
 * USER VALIDATORS
 * ============================================
 * Validações para rotas de usuário
 */

import { body } from 'express-validator';

/**
 * Validação para updateMe
 */
export const updateMeValidation = [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 3 }).withMessage('Nome deve ter no mínimo 3 caracteres'),

  body('language')
    .optional()
    .isIn(['EN', 'PT', 'ES']).withMessage('Idioma deve ser EN, PT ou ES'),

  body('address')
    .optional()
    .trim(),

  body('city')
    .optional()
    .trim(),

  body('state')
    .optional()
    .trim(),

  body('zipCode')
    .optional()
    .trim(),

  body('pushEnabled')
    .optional()
    .isBoolean().withMessage('pushEnabled deve ser true ou false'),

  body('emailNotifications')
    .optional()
    .isBoolean().withMessage('emailNotifications deve ser true ou false'),

  body('smsNotifications')
    .optional()
    .isBoolean().withMessage('smsNotifications deve ser true ou false'),
];

/**
 * Validação para changePassword
 */
export const changePasswordValidation = [
  body('currentPassword')
    .notEmpty().withMessage('Senha atual é obrigatória'),

  body('newPassword')
    .notEmpty().withMessage('Nova senha é obrigatória')
    .isLength({ min: 8 }).withMessage('Nova senha deve ter no mínimo 8 caracteres'),
];

/**
 * Validação para updateFCMToken
 */
export const updateFCMTokenValidation = [
  body('fcmToken')
    .notEmpty().withMessage('Token FCM é obrigatório')
    .trim(),
];

/**
 * Validação para deleteMe
 */
export const deleteMeValidation = [
  body('password')
    .notEmpty().withMessage('Senha é obrigatória para confirmar exclusão'),
];
