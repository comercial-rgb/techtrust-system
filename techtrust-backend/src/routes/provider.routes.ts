import { Router } from 'express';
import * as providerController from '../controllers/provider.controller';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

// Endpoint público de busca (não requer autenticação)
router.get('/search', asyncHandler(providerController.searchProvidersByLocation));
router.get('/active-cities', asyncHandler(providerController.getActiveCities));

// Endpoints protegidos (requerem autenticação como PROVIDER)
router.use(authenticate);
router.use(authorize('PROVIDER'));

router.get('/dashboard', asyncHandler(providerController.getDashboard));
router.get('/dashboard-stats', asyncHandler(providerController.getDashboardStats));
router.get('/recent-activity', asyncHandler(providerController.getRecentActivity));
router.get('/pending-requests', asyncHandler(providerController.getPendingRequests));
router.get('/available-requests', asyncHandler(providerController.getAvailableRequests));
router.get('/my-quotes', asyncHandler(providerController.getMyQuotes));
router.patch('/profile', asyncHandler(providerController.updateProfile));

export default router;
