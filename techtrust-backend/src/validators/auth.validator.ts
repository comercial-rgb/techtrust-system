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
 * Aceita tanto 'otpCode' quanto 'code' para compatibilidade com versões antigas do app
 */
export const verifyOTPValidation = [
  body('userId')
    .trim()
    .notEmpty().withMessage('ID do usuário é obrigatório')
    .isUUID().withMessage('ID do usuário inválido'),

  // Validação customizada: aceita otpCode OU code
  body().custom((_value, { req }) => {
    const otpCode = req.body?.otpCode || req.body?.code;
    if (!otpCode) {
      throw new Error('Código OTP é obrigatório (envie como otpCode ou code)');
    }
    const trimmed = String(otpCode).trim();
    if (trimmed.length !== 6) {
      throw new Error('Código OTP deve ter 6 dígitos');
    }
    if (!/^\d{6}$/.test(trimmed)) {
      throw new Error('Código OTP deve conter apenas números');
    }
    return true;
  }),
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
