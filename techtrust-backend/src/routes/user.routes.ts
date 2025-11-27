import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { asyncHandler } from '../utils/async-handler';
import {
  updateMeValidation,
  changePasswordValidation,
  updateFCMTokenValidation,
  deleteMeValidation,
} from '../validators/user.validator';

const router = Router();

// Todas as rotas de usuário requerem autenticação
router.use(authenticate);

/**
 * GET /api/v1/users/me
 * Obter perfil do usuário autenticado
 */
router.get('/me', asyncHandler(userController.getMe));

/**
 * PATCH /api/v1/users/me
 * Atualizar perfil
 */
router.patch(
  '/me',
  validate(updateMeValidation),
  asyncHandler(userController.updateMe)
);

/**
 * POST /api/v1/users/me/change-password
 * Alterar senha
 */
router.post(
  '/me/change-password',
  validate(changePasswordValidation),
  asyncHandler(userController.changePassword)
);

/**
 * POST /api/v1/users/me/fcm-token
 * Atualizar token FCM
 */
router.post(
  '/me/fcm-token',
  validate(updateFCMTokenValidation),
  asyncHandler(userController.updateFCMToken)
);

/**
 * DELETE /api/v1/users/me
 * Deletar conta
 */
router.delete(
  '/me',
  validate(deleteMeValidation),
  asyncHandler(userController.deleteMe)
);

export default router;
