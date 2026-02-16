import { Router } from 'express';
import * as partsStoreController from '../controllers/parts-store.controller';
import { authenticate, authorize, optionalAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

// ============================================
// PUBLIC ENDPOINTS
// ============================================
router.get('/categories', asyncHandler(partsStoreController.getCategories));
router.get('/search', asyncHandler(partsStoreController.searchStores));
router.get('/products/search', asyncHandler(partsStoreController.searchProducts));
router.get('/products/:productId', asyncHandler(partsStoreController.getProductDetail));
router.get('/:id', optionalAuth, asyncHandler(partsStoreController.getStoreProfile));
router.get('/:id/products', asyncHandler(partsStoreController.getStoreProducts));
router.get('/:id/reviews', asyncHandler(partsStoreController.getStoreReviews));

// ============================================
// AUTHENTICATED CLIENT ENDPOINTS
// ============================================
router.use(authenticate);

// Favorites
router.get('/favorites', asyncHandler(partsStoreController.getFavorites));
router.post('/:id/favorite', asyncHandler(partsStoreController.toggleFavorite));

// Reviews
router.post('/:id/reviews', asyncHandler(partsStoreController.createStoreReview));

// Reservations
router.post('/products/:productId/reserve', asyncHandler(partsStoreController.reserveProduct));

// Tracking
router.post('/:id/track-action', asyncHandler(partsStoreController.trackAction));

// ============================================
// PROVIDER ENDPOINTS
// ============================================
router.post('/provider/create', authorize('PROVIDER'), asyncHandler(partsStoreController.createStore));
router.get('/provider/my-stores', authorize('PROVIDER'), asyncHandler(partsStoreController.getMyStores));
router.patch('/provider/:id', authorize('PROVIDER'), asyncHandler(partsStoreController.updateStore));
router.get('/provider/:id/dashboard', authorize('PROVIDER'), asyncHandler(partsStoreController.getProviderDashboard));

// Provider — Products
router.post('/provider/:id/products', authorize('PROVIDER'), asyncHandler(partsStoreController.createProduct));
router.patch('/provider/:id/products/:productId', authorize('PROVIDER'), asyncHandler(partsStoreController.updateProduct));
router.delete('/provider/:id/products/:productId', authorize('PROVIDER'), asyncHandler(partsStoreController.deleteProduct));

// Provider — Review Responses
router.post('/provider/:id/reviews/:reviewId/respond', authorize('PROVIDER'), asyncHandler(partsStoreController.respondToReview));

// ============================================
// ADMIN ENDPOINTS
// ============================================
router.get('/admin/pending', authorize('ADMIN'), asyncHandler(partsStoreController.getPendingStores));
router.patch('/admin/:id/verify', authorize('ADMIN'), asyncHandler(partsStoreController.verifyStore));

export default router;
