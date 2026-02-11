import { Router } from 'express';
import * as tipController from '../controllers/tip.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.use(authenticate);

// POST /tips - Send a tip
router.post('/', asyncHandler(tipController.sendTip));

// GET /tips/my-tips - Get my tips (sent or received)
router.get('/my-tips', asyncHandler(tipController.getMyTips));

export default router;
