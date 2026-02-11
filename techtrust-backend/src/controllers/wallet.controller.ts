/**
 * ============================================
 * WALLET CONTROLLER
 * ============================================
 * Cross-device wallet balance & transactions
 */

import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error-handler';
import { logger } from '../config/logger';

/**
 * GET /api/v1/wallet
 * Get wallet balance and recent transactions
 */
export const getWallet = async (req: Request, res: Response) => {
  const userId = req.user!.id;

  // Find or create wallet
  let wallet = await prisma.wallet.findUnique({
    where: { userId },
    include: {
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  });

  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });
  }

  res.json({
    success: true,
    data: {
      balance: Number(wallet.balance),
      transactions: wallet.transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        description: t.description,
        method: t.method,
        date: t.createdAt.toISOString().split('T')[0],
        createdAt: t.createdAt,
      })),
    },
  });
};

/**
 * POST /api/v1/wallet/add-funds
 * Add funds to wallet
 */
export const addFunds = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { amount, method } = req.body;

  if (!amount || amount <= 0) {
    throw new AppError('Amount must be greater than 0', 400, 'INVALID_AMOUNT');
  }

  if (amount < 10) {
    throw new AppError('Minimum amount is $10.00', 400, 'MINIMUM_AMOUNT');
  }

  if (!['card', 'pix', 'transfer'].includes(method)) {
    throw new AppError('Invalid funding method', 400, 'INVALID_METHOD');
  }

  // Find or create wallet
  let wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    wallet = await prisma.wallet.create({ data: { userId } });
  }

  // Add funds in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const updatedWallet = await tx.wallet.update({
      where: { userId },
      data: {
        balance: { increment: amount },
      },
    });

    const transaction = await tx.walletTransaction.create({
      data: {
        walletId: wallet!.id,
        type: 'credit',
        amount,
        description: `Funds added via ${method}`,
        method,
      },
    });

    return { wallet: updatedWallet, transaction };
  });

  logger.info(`Wallet funds added: $${amount} via ${method} for user ${userId}`);

  res.json({
    success: true,
    message: 'Funds added successfully',
    data: {
      balance: Number(result.wallet.balance),
      transaction: {
        id: result.transaction.id,
        type: result.transaction.type,
        amount: Number(result.transaction.amount),
        description: result.transaction.description,
        method: result.transaction.method,
        date: result.transaction.createdAt.toISOString().split('T')[0],
      },
    },
  });
};

/**
 * GET /api/v1/wallet/transactions
 * Get paginated wallet transactions
 */
export const getTransactions = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    res.json({ success: true, data: { transactions: [], total: 0 } });
    return;
  }

  const [transactions, total] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
  ]);

  res.json({
    success: true,
    data: {
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        description: t.description,
        method: t.method,
        date: t.createdAt.toISOString().split('T')[0],
        createdAt: t.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    },
  });
};
