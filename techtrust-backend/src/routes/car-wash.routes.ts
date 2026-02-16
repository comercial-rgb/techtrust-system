import { Router } from 'express';
import * as carWashController from '../controllers/car-wash.controller';
import { authenticate, authorize, optionalAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

// ============================================
// PUBLIC / CATALOG ENDPOINTS
// ============================================
router.get('/catalog/services', asyncHandler(carWashController.getServiceCatalog));
router.get('/catalog/amenities', asyncHandler(carWashController.getAmenityCatalog));
router.get('/catalog/payment-methods', asyncHandler(carWashController.getPaymentMethodCatalog));

// ============================================
// CLIENT ENDPOINTS (search is public, profile uses optional auth)
// ============================================
router.get('/nearby', asyncHandler(carWashController.searchNearby));
router.get('/profile/:id', optionalAuth, asyncHandler(carWashController.getProfile));
router.get('/profile/:id/reviews', asyncHandler(carWashController.getReviews));

// ============================================
// AUTHENTICATED CLIENT ENDPOINTS
// ============================================
router.use(authenticate);

// Favorites
router.get('/favorites', asyncHandler(carWashController.getFavorites));
router.post('/:id/favorite', asyncHandler(carWashController.toggleFavorite));

// Reviews
router.post('/:id/reviews', asyncHandler(carWashController.createReview));

// Tracking
router.post('/:id/track-action', asyncHandler(carWashController.trackAction));

// ============================================
// PROVIDER ENDPOINTS
// ============================================
router.post('/provider/create', authorize('PROVIDER'), asyncHandler(carWashController.createCarWash));
router.get('/provider/my-car-washes', authorize('PROVIDER'), asyncHandler(carWashController.getMyCarWashes));
router.patch('/provider/:id', authorize('PROVIDER'), asyncHandler(carWashController.updateCarWash));
router.get('/provider/:id/dashboard', authorize('PROVIDER'), asyncHandler(carWashController.getProviderDashboard));

// Provider — Packages
router.post('/provider/:id/packages', authorize('PROVIDER'), asyncHandler(carWashController.createPackage));
router.patch('/provider/:id/packages/:packageId', authorize('PROVIDER'), asyncHandler(carWashController.updatePackage));
router.delete('/provider/:id/packages/:packageId', authorize('PROVIDER'), asyncHandler(carWashController.deletePackage));

// Provider — Add-Ons
router.post('/provider/:id/add-ons', authorize('PROVIDER'), asyncHandler(carWashController.createAddOn));
router.patch('/provider/:id/add-ons/:addOnId', authorize('PROVIDER'), asyncHandler(carWashController.updateAddOn));
router.delete('/provider/:id/add-ons/:addOnId', authorize('PROVIDER'), asyncHandler(carWashController.deleteAddOn));

// Provider — Memberships
router.post('/provider/:id/memberships', authorize('PROVIDER'), asyncHandler(carWashController.createMembership));
router.patch('/provider/:id/memberships/:membershipId', authorize('PROVIDER'), asyncHandler(carWashController.updateMembership));
router.delete('/provider/:id/memberships/:membershipId', authorize('PROVIDER'), asyncHandler(carWashController.deleteMembership));

// Provider — Photos
router.post('/provider/:id/photos', authorize('PROVIDER'), asyncHandler(carWashController.addPhoto));
router.delete('/provider/:id/photos/:photoId', authorize('PROVIDER'), asyncHandler(carWashController.deletePhoto));

// Provider — Review Responses
router.post('/provider/:id/reviews/:reviewId/respond', authorize('PROVIDER'), asyncHandler(carWashController.respondToReview));

// ============================================
// ADMIN ENDPOINTS
// ============================================
router.get('/admin/pending', authorize('ADMIN'), asyncHandler(carWashController.getPendingApprovals));
router.patch('/admin/:id/status', authorize('ADMIN'), asyncHandler(carWashController.updateStatus));

export default router;
