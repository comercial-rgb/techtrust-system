/**
 * ============================================
 * AUTH VALIDATORS
 * ============================================
 * Validações para rotas de autenticação
 */

import { body } from 'express-validator';

/**
 * Validação para signup
 */
export const signupValidation = [
  body('fullName')
    .trim()
    .notEmpty().withMessage('Nome completo é obrigatório')
    .isLength({ min: 3 }).withMessage('Nome deve ter no mínimo 3 caracteres'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email é obrigatório')
    .isEmail().withMessage('Email inválido')
    .normalizeEmail(),

  body('phone')
    .trim()
    .notEmpty().withMessage('Telefone é obrigatório')
    .matches(/^\+\d{10,15}$/).withMessage('Telefone deve estar no formato E.164 (ex: +5511999999999)'),

  body('password')
    .notEmpty().withMessage('Senha é obrigatória')
    .isLength({ min: 8 }).withMessage('Senha deve ter no mínimo 8 caracteres'),

  body('language')
    .optional()
    .isIn(['EN', 'PT', 'ES']).withMessage('Idioma deve ser EN, PT ou ES'),
];

/**
 * Validação para verify-otp
 */
export const verifyOTPValidation = [
  body('userId')
    .trim()
    .notEmpty().withMessage('ID do usuário é obrigatório')
    .isUUID().withMessage('ID do usuário inválido'),

  body('otpCode')
    .exists().withMessage('Código OTP é obrigatório')
    .isString().withMessage('Código OTP deve ser uma string')
    .trim()
    .notEmpty().withMessage('Código OTP não pode estar vazio')
    .isLength({ min: 6, max: 6 }).withMessage('Código OTP deve ter 6 dígitos')
    .isNumeric().withMessage('Código OTP deve conter apenas números'),
];

/**
 * Validação para resend-otp
 */
export const resendOTPValidation = [
  body('userId')
    .trim()
    .notEmpty().withMessage('ID do usuário é obrigatório')
    .isUUID().withMessage('ID do usuário inválido'),
];

/**
 * Validação para login
 */
export const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email é obrigatório')
    .isEmail().withMessage('Email inválido')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Senha é obrigatória'),
];

/**
 * Validação para refresh
 */
export const refreshValidation = [
  body('refreshToken')
    .trim()
    .notEmpty().withMessage('Refresh token é obrigatório'),
];
