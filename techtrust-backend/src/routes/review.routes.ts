import { Router } from 'express';
import * as reviewController from '../controllers/review.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.use(authenticate);

router.post('/', asyncHandler(reviewController.createReview));

// GET /reviews/provider/me - shortcut for provider to get own reviews
router.get('/provider/me', asyncHandler(async (req, res) => {
  req.params.providerId = req.user!.id;
  return reviewController.getProviderReviews(req, res);
}));

router.get('/provider/:providerId', asyncHandler(reviewController.getProviderReviews));
router.post('/:reviewId/response', asyncHandler(reviewController.respondToReview));
router.get('/my-reviews', asyncHandler(reviewController.getMyReviews));

export default router;
