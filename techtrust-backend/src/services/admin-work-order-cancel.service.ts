import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { AppError } from "../middleware/error-handler";
import * as stripeService from "./stripe.service";

export type AdminCancelPaymentLedgerEntry = {
  paymentId: string;
  paymentNumber: string;
  action: "void_hold" | "refund_captured" | "skipped";
  detail?: string;
};

export type AdminCancelWorkOrderResult = {
  orderNumber: string;
  workOrderId: string;
  serviceRequestId: string;
  ledger: AdminCancelPaymentLedgerEntry[];
  supplementActions: Array<{ supplementId: string; action: string }>;
};

/**
 * Cancela WO pelo admin: sincroniza Stripe (void holds / refund capturado) e atualiza banco.
 * @param refundCaptured — se true, reembolsa no Stripe pagamentos já CAPTURED; holds sempre liberados quando possível.
 */
export async function adminCancelWorkOrderWithStripe(opts: {
  workOrderId: string;
  reason: string;
  refundCaptured: boolean;
}): Promise<AdminCancelWorkOrderResult> {
  const { workOrderId, reason, refundCaptured } = opts;

  const order = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: {
      payments: {
        where: {
          status: { in: ["PENDING", "AUTHORIZED", "CAPTURED"] },
        },
      },
    },
  });

  if (!order) {
    throw new AppError("Ordem não encontrada", 404, "ORDER_NOT_FOUND");
  }

  if (order.status === "CANCELLED") {
    return {
      workOrderId: order.id,
      orderNumber: order.orderNumber,
      serviceRequestId: order.serviceRequestId,
      ledger: [],
      supplementActions: [],
    };
  }

  const ledger: AdminCancelPaymentLedgerEntry[] = [];
  const supplementActions: Array<{ supplementId: string; action: string }> =
    [];

  for (const p of order.payments) {
    if (!p.stripePaymentIntentId) {
      ledger.push({
        paymentId: p.id,
        paymentNumber: p.paymentNumber,
        action: "skipped",
        detail: "Sem stripePaymentIntentId",
      });
      continue;
    }

    if (p.status === "AUTHORIZED" || p.status === "PENDING") {
      try {
        await stripeService.cancelPaymentIntentIdempotent(p.stripePaymentIntentId);
        await prisma.payment.update({
          where: { id: p.id },
          data: {
            status: "CANCELLED",
            refundReason: reason,
          },
        });
        ledger.push({
          paymentId: p.id,
          paymentNumber: p.paymentNumber,
          action: "void_hold",
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(
          `Admin cancel: falha ao void PI ${p.stripePaymentIntentId} payment ${p.paymentNumber}: ${msg}`,
        );
        throw new AppError(
          `Não foi possível liberar o hold do pagamento ${p.paymentNumber}: ${msg}`,
          502,
          "STRIPE_VOID_FAILED",
        );
      }
    } else if (p.status === "CAPTURED") {
      if (!refundCaptured) {
        ledger.push({
          paymentId: p.id,
          paymentNumber: p.paymentNumber,
          action: "skipped",
          detail: "CAPTURED sem refundCaptured=true",
        });
        continue;
      }
      try {
        const refund = await stripeService.createRefund({
          paymentIntentId: p.stripePaymentIntentId,
          reason: "requested_by_customer",
        });
        await prisma.payment.update({
          where: { id: p.id },
          data: {
            status: "REFUNDED",
            refundedAt: new Date(),
            refundAmount: refund.amount / 100,
            refundReason: reason,
          },
        });
        ledger.push({
          paymentId: p.id,
          paymentNumber: p.paymentNumber,
          action: "refund_captured",
          detail: refund.refundId,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(
          `Admin cancel: falha ao reembolsar payment ${p.paymentNumber}: ${msg}`,
        );
        throw new AppError(
          `Não foi possível reembolsar o pagamento ${p.paymentNumber}: ${msg}`,
          502,
          "STRIPE_REFUND_FAILED",
        );
      }
    }
  }

  const supplements = await prisma.paymentSupplement.findMany({
    where: {
      workOrderId,
      status: "HOLD_PLACED",
      stripePaymentIntentId: { not: null },
    },
  });

  for (const s of supplements) {
    if (!s.stripePaymentIntentId) continue;
    try {
      await stripeService.cancelPaymentIntentIdempotent(s.stripePaymentIntentId);
      await prisma.paymentSupplement.update({
        where: { id: s.id },
        data: {
          status: "VOIDED",
          holdFailedReason: reason,
        },
      });
      supplementActions.push({ supplementId: s.id, action: "void_hold" });

      const supPay = await prisma.payment.findFirst({
        where: { stripePaymentIntentId: s.stripePaymentIntentId },
      });
      if (supPay && supPay.status === "AUTHORIZED") {
        await prisma.payment.update({
          where: { id: supPay.id },
          data: { status: "CANCELLED", refundReason: reason },
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(
        `Admin cancel: falha ao void suplemento PI ${s.stripePaymentIntentId}: ${msg}`,
      );
      throw new AppError(
        `Não foi possível liberar hold do suplemento: ${msg}`,
        502,
        "STRIPE_SUPPLEMENT_VOID_FAILED",
      );
    }
  }

  await prisma.$transaction([
    prisma.workOrder.update({
      where: { id: workOrderId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
      },
    }),
    prisma.serviceRequest.update({
      where: { id: order.serviceRequestId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
    }),
  ]);

  logger.warn(
    `[ADMIN] WO ${order.orderNumber} cancelada com Stripe. refundCaptured=${refundCaptured} ledger=${ledger.length} supplements=${supplementActions.length}`,
  );

  return {
    workOrderId: order.id,
    orderNumber: order.orderNumber,
    serviceRequestId: order.serviceRequestId,
    ledger,
    supplementActions,
  };
}
