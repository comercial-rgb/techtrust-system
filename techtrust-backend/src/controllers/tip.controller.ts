/**
 * ============================================
 * TIP CONTROLLER
 * ============================================
 * Optional gratuity/tip system after service completion
 */

import { Request, Response } from "express";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error-handler";
import { logger } from "../config/logger";

/**
 * POST /api/v1/tips
 * Send a tip to a provider after service completion
 */
export const sendTip = async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const { workOrderId, amount, message, paymentMethod } = req.body;

  if (!workOrderId) {
    throw new AppError("Work order ID is required", 400, "MISSING_WORK_ORDER");
  }

  if (!amount || amount <= 0) {
    throw new AppError(
      "Tip amount must be greater than 0",
      400,
      "INVALID_AMOUNT",
    );
  }

  if (amount > 500) {
    throw new AppError(
      "Maximum tip amount is $500.00",
      400,
      "MAX_TIP_EXCEEDED",
    );
  }

  // Verify the work order belongs to this customer and is completed
  const workOrder = await prisma.workOrder.findFirst({
    where: {
      id: workOrderId,
      customerId,
      status: "COMPLETED",
    },
  });

  if (!workOrder) {
    throw new AppError(
      "Completed work order not found",
      404,
      "ORDER_NOT_FOUND",
    );
  }

  // Check if already tipped this work order
  const existingTip = await prisma.tip.findFirst({
    where: {
      workOrderId,
      customerId,
      status: "COMPLETED",
    },
  });

  if (existingTip) {
    throw new AppError(
      "You have already tipped for this service",
      409,
      "ALREADY_TIPPED",
    );
  }

  // If paying from wallet, verify balance
  if (paymentMethod === "wallet") {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: customerId },
    });
    if (!wallet || Number(wallet.balance) < amount) {
      throw new AppError(
        "Insufficient wallet balance",
        400,
        "INSUFFICIENT_BALANCE",
      );
    }
  }

  // Process tip in a transaction
  const tip = await prisma.$transaction(async (tx) => {
    // Create the tip record
    const newTip = await tx.tip.create({
      data: {
        customerId,
        providerId: workOrder.providerId,
        workOrderId,
        amount,
        paymentMethod: paymentMethod || "card",
        message: message?.trim() || null,
        status: "COMPLETED",
      },
    });

    // If wallet payment, deduct from customer wallet and add to provider wallet
    if (paymentMethod === "wallet") {
      // Deduct from customer
      await tx.wallet.update({
        where: { userId: customerId },
        data: { balance: { decrement: amount } },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: (await tx.wallet.findUnique({
            where: { userId: customerId },
          }))!.id,
          type: "debit",
          amount,
          description: `Tip sent for service #${workOrder.orderNumber}`,
          method: "tip_sent",
          relatedTipId: newTip.id,
        },
      });

      // Add to provider wallet (create if not exists)
      let providerWallet = await tx.wallet.findUnique({
        where: { userId: workOrder.providerId },
      });
      if (!providerWallet) {
        providerWallet = await tx.wallet.create({
          data: { userId: workOrder.providerId },
        });
      }

      await tx.wallet.update({
        where: { userId: workOrder.providerId },
        data: { balance: { increment: amount } },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: providerWallet.id,
          type: "credit",
          amount,
          description: `Tip received for service #${workOrder.orderNumber}`,
          method: "tip_received",
          relatedTipId: newTip.id,
        },
      });
    }

    return newTip;
  });

  // Send notification to provider
  try {
    await prisma.notification.create({
      data: {
        userId: workOrder.providerId,
        type: "PAYMENT_RECEIVED",
        title: "Tip Received! 🎉",
        message: `You received a $${Number(amount).toFixed(2)} tip${message ? `: "${message}"` : ""}`,
        relatedWorkOrderId: workOrderId,
        data: { tipId: tip.id, amount: Number(amount) },
      },
    });

    // Emit socket event
    const io = req.app.get("io");
    if (io) {
      io.to(`user:${workOrder.providerId}`).emit("tip_received", {
        tipId: tip.id,
        amount: Number(amount),
        message,
        workOrderId,
      });
    }
  } catch (notifError) {
    logger.warn("Failed to send tip notification:", notifError);
  }

  logger.info(
    `Tip sent: $${amount} from ${customerId} to ${workOrder.providerId} for WO ${workOrder.orderNumber}`,
  );

  res.status(201).json({
    success: true,
    message: "Tip sent successfully!",
    data: {
      id: tip.id,
      amount: Number(tip.amount),
      message: tip.message,
      status: tip.status,
    },
  });
};

/**
 * GET /api/v1/tips/my-tips
 * Get tips given by customer (or received by provider)
 */
export const getMyTips = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const role = (req.query.role as string) || "customer";

  const where =
    role === "provider" ? { providerId: userId } : { customerId: userId };

  const tips = await prisma.tip.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      workOrder: {
        select: { orderNumber: true },
      },
      customer: {
        select: { fullName: true },
      },
      provider: {
        select: { fullName: true },
      },
    },
    take: 50,
  });

  res.json({
    success: true,
    data: tips.map((tip) => ({
      id: tip.id,
      amount: Number(tip.amount),
      message: tip.message,
      status: tip.status,
      workOrderNumber: tip.workOrder.orderNumber,
      customerName: tip.customer.fullName,
      providerName: tip.provider.fullName,
      createdAt: tip.createdAt,
    })),
  });
};
