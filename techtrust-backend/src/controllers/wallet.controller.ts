/**
 * ============================================
 * WALLET CONTROLLER
 * ============================================
 * Cross-device wallet balance & transactions
 */

import { Request, Response } from "express";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error-handler";
import { logger } from "../config/logger";
import * as stripeService from "../services/stripe.service";

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
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
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
        date: t.createdAt.toISOString().split("T")[0],
        createdAt: t.createdAt,
      })),
    },
  });
};

/**
 * POST /api/v1/wallet/add-funds
 * Add funds to wallet — processes real Stripe payment for card method
 */
export const addFunds = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { amount, method, paymentMethodId } = req.body;

  if (!amount || amount <= 0) {
    throw new AppError("Amount must be greater than 0", 400, "INVALID_AMOUNT");
  }

  if (amount < 10) {
    throw new AppError("Minimum amount is $10.00", 400, "MINIMUM_AMOUNT");
  }

  if (amount > 1000) {
    throw new AppError("Maximum amount is $1,000.00", 400, "MAXIMUM_AMOUNT");
  }

  if (!["card", "pix", "transfer"].includes(method)) {
    throw new AppError("Invalid funding method", 400, "INVALID_METHOD");
  }

  // Find or create wallet
  let wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    wallet = await prisma.wallet.create({ data: { userId } });
  }

  // --- CARD PAYMENT: Process via Stripe ---
  if (method === "card") {
    // Find the user's payment method
    let paymentMethod;
    if (paymentMethodId) {
      paymentMethod = await prisma.paymentMethod.findFirst({
        where: { id: paymentMethodId, userId, isActive: true },
      });
    } else {
      // Use default payment method
      paymentMethod = await prisma.paymentMethod.findFirst({
        where: { userId, isDefault: true, isActive: true },
      });
      if (!paymentMethod) {
        paymentMethod = await prisma.paymentMethod.findFirst({
          where: { userId, isActive: true, type: { in: ["credit", "debit"] } },
        });
      }
    }

    if (!paymentMethod || !paymentMethod.stripePaymentMethodId) {
      throw new AppError(
        "No valid payment method found. Please add a credit or debit card first.",
        400,
        "NO_PAYMENT_METHOD",
      );
    }

    // Get or create Stripe customer
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");

    const subscription = await prisma.subscription.findFirst({
      where: { userId, status: "ACTIVE" },
    });
    let stripeCustomerId = subscription?.stripeCustomerId;

    if (!stripeCustomerId) {
      stripeCustomerId = await stripeService.getOrCreateCustomer({
        userId,
        email: user.email,
        name: user.fullName,
      });
    }

    // Create and confirm PaymentIntent with automatic capture
    const amountCents = Math.round(amount * 100);
    const paymentIntent = await stripeService.createPaymentIntent({
      amount: amountCents,
      currency: "usd",
      customerId: stripeCustomerId,
      paymentMethodId: paymentMethod.stripePaymentMethodId,
      platformFeeAmount: 0,
      description: `Wallet top-up: $${amount.toFixed(2)}`,
      captureMethod: "automatic",
      metadata: {
        type: "wallet_topup",
        userId,
        walletId: wallet.id,
      },
    });

    // Check if payment succeeded or requires further action
    if (paymentIntent.status !== "succeeded" && paymentIntent.status !== "requires_capture") {
      // For automatic capture, status should be 'succeeded' after confirmation
      // If it requires additional action (3D Secure), return clientSecret to frontend
      if (paymentIntent.status === "requires_action" || paymentIntent.status === "requires_payment_method") {
        res.json({
          success: false,
          requiresAction: true,
          clientSecret: paymentIntent.clientSecret,
          message: "Additional authentication required",
        });
        return;
      }
      throw new AppError("Payment failed. Please try again.", 400, "PAYMENT_FAILED");
    }

    // Payment succeeded — increment wallet balance
    const result = await prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: { balance: { increment: amount } },
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet!.id,
          type: "credit",
          amount,
          description: `Funds added via ${paymentMethod!.cardBrand || "card"} ****${paymentMethod!.cardLast4 || "****"}`,
          method: "card",
          relatedPaymentId: paymentIntent.paymentIntentId,
        },
      });

      return { wallet: updatedWallet, transaction };
    });

    logger.info(
      `Wallet funded: $${amount} via card (Stripe PI: ${paymentIntent.paymentIntentId}) for user ${userId}`,
    );

    res.json({
      success: true,
      message: "Funds added successfully",
      data: {
        balance: Number(result.wallet.balance),
        transaction: {
          id: result.transaction.id,
          type: result.transaction.type,
          amount: Number(result.transaction.amount),
          description: result.transaction.description,
          method: result.transaction.method,
          date: result.transaction.createdAt.toISOString().split("T")[0],
        },
      },
    });
    return;
  }

  // --- BANK TRANSFER: Pending (manual reconciliation) ---
  if (method === "transfer") {
    throw new AppError(
      "Bank transfers take 1-3 business days to process. For instant top-ups, please use a credit or debit card.",
      400,
      "TRANSFER_NOT_INSTANT",
    );
  }

  // --- PIX: Pending (requires PSP integration) ---
  if (method === "pix") {
    throw new AppError(
      "PIX payments are coming soon. Please use a credit or debit card for now.",
      400,
      "PIX_NOT_AVAILABLE",
    );
  }
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
      orderBy: { createdAt: "desc" },
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
        date: t.createdAt.toISOString().split("T")[0],
        createdAt: t.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    },
  });
};
