import { Router } from 'express';
import * as geocodingController from '../controllers/geocoding.controller';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

// Endpoints públicos de geocoding
router.post('/geocode', asyncHandler(geocodingController.geocode));
router.post('/reverse', asyncHandler(geocodingController.reverse));

export default router;
