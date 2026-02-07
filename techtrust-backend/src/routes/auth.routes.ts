import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validate } from '../middleware/validation';
import { authRateLimiter } from '../middleware/rate-limiter';
import { asyncHandler } from '../utils/async-handler';
import { debugLogger } from '../middleware/debug';
import {
  signupValidation,
  verifyOTPValidation,
  resendOTPValidation,
  loginValidation,
  refreshValidation,
} from '../validators/auth.validator';

const router = Router();

/**
 * POST /api/v1/auth/signup
 * Cadastro de novo usuário
 */
router.post(
  '/signup',
  authRateLimiter,
  validate(signupValidation),
  asyncHandler(authController.signup)
);

/**
 * POST /api/v1/auth/verify-otp
 * Verificar código OTP
 */
router.post(
  '/verify-otp',
  debugLogger, // Adiciona debug antes da validação
  validate(verifyOTPValidation),
  asyncHandler(authController.verifyOTP)
);

/**
 * POST /api/v1/auth/resend-otp
 * Reenviar código OTP
 */
router.post(
  '/resend-otp',
  validate(resendOTPValidation),
  asyncHandler(authController.resendOTP)
);

/**
 * POST /api/v1/auth/login
 * Login de usuário
 */
router.post(
  '/login',
  authRateLimiter,
  validate(loginValidation),
  asyncHandler(authController.login)
);

/**
 * POST /api/v1/auth/refresh
 * Renovar token de acesso
 */
router.post(
  '/refresh',
  validate(refreshValidation),
  asyncHandler(authController.refresh)
);

/**
 * POST /api/v1/auth/logout
 * Logout (descarta tokens no client-side)
 */
router.post('/logout', asyncHandler(authController.logout));

/**
 * POST /api/v1/auth/forgot-password
 * Solicitar recuperação de senha
 */
router.post(
  '/forgot-password',
  authRateLimiter,
  asyncHandler(authController.forgotPassword)
);

/**
 * POST /api/v1/auth/reset-password
 * Redefinir senha com token
 */
router.post(
  '/reset-password',
  authRateLimiter,
  asyncHandler(authController.resetPassword)
);

export default router;
