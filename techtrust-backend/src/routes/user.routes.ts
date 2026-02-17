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
 * GET /api/v1/users/dashboard-stats
 * Estatísticas do dashboard do cliente
 */
router.get('/dashboard-stats', asyncHandler(userController.getDashboardStats));

/**
 * GET /api/v1/users/reports
 * Relatórios de gastos do cliente
 */
router.get('/reports', asyncHandler(userController.getReports));

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

// D30 — Login Sessions
router.get('/me/sessions', asyncHandler(userController.getSessions));
router.post('/me/sessions/revoke', asyncHandler(userController.revokeSessions));

// D28 — Client Insurance Policies
router.get('/me/insurance-policies', asyncHandler(userController.getInsurancePolicies));
router.post('/me/insurance-policies', asyncHandler(userController.createInsurancePolicy));
router.patch('/me/insurance-policies/:id', asyncHandler(userController.updateInsurancePolicy));
router.delete('/me/insurance-policies/:id', asyncHandler(userController.deleteInsurancePolicy));

export default router;
