import { Router } from 'express';
import * as walletController from '../controllers/wallet.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.use(authenticate);

// GET /wallet - Get balance and recent transactions
router.get('/', asyncHandler(walletController.getWallet));

// POST /wallet/add-funds - Add funds to wallet
router.post('/add-funds', asyncHandler(walletController.addFunds));

// GET /wallet/transactions - Get paginated transaction history
router.get('/transactions', asyncHandler(walletController.getTransactions));

export default router;
