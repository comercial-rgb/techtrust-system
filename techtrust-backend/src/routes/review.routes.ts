import { Router } from 'express';
import * as reviewController from '../controllers/review.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.use(authenticate);

router.post('/', asyncHandler(reviewController.createReview));
router.get('/provider/:providerId', asyncHandler(reviewController.getProviderReviews));
router.post('/:reviewId/response', asyncHandler(reviewController.respondToReview));
router.get('/my-reviews', asyncHandler(reviewController.getMyReviews));

export default router;
