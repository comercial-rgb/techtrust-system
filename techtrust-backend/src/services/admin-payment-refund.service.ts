import { prisma } from "../config/database";
import { AppError } from "../middleware/error-handler";
import * as stripeService from "./stripe.service";

/**
 * Reembolso manual (admin) em pagamento já capturado — sempre via Stripe.
 * Suporta reembolso parcial acumulado (várias chamadas até o total do pagamento).
 */
export async function adminRefundCapturedPayment(params: {
  paymentId: string;
  reason?: string;
  /** USD; se omitido, reembolsa o que ainda resta do total original */
  amountDollars?: number | null;
}) {
  const { paymentId, reason, amountDollars } = params;

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) {
    throw new AppError("Pagamento não encontrado", 404, "NOT_FOUND");
  }

  if (payment.status !== "CAPTURED") {
    throw new AppError(
      `Reembolso admin só para status CAPTURED (atual: ${payment.status}). Para hold, cancele o PaymentIntent.`,
      400,
      "INVALID_PAYMENT_STATUS",
    );
  }

  if (!payment.stripePaymentIntentId) {
    throw new AppError(
      "Pagamento sem stripePaymentIntentId — não é possível reembolsar no Stripe",
      400,
      "MISSING_STRIPE_PI",
    );
  }

  const total = Number(payment.totalAmount);
  const alreadyRefunded = Number(payment.refundAmount || 0);
  const remaining = Math.max(0, total - alreadyRefunded);

  if (remaining <= 0) {
    throw new AppError(
      "Valor já totalmente reembolsado para este pagamento",
      400,
      "ALREADY_FULLY_REFUNDED",
    );
  }

  const requested =
    amountDollars != null && !Number.isNaN(Number(amountDollars))
      ? Number(amountDollars)
      : remaining;

  if (requested <= 0 || requested > remaining + 0.009) {
    throw new AppError(
      `Valor inválido. Restante reembolsável: $${remaining.toFixed(2)}`,
      400,
      "INVALID_REFUND_AMOUNT",
    );
  }

  const refundCents = Math.round(requested * 100);

  let refundResult: { refundId: string; amount: number };
  try {
    refundResult = await stripeService.createRefund({
      paymentIntentId: payment.stripePaymentIntentId,
      amount: refundCents,
      reason: "requested_by_customer",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new AppError(`Stripe refund falhou: ${msg}`, 502, "STRIPE_REFUND_FAILED");
  }

  const refundedNow = refundResult.amount / 100;
  const newCumulative = alreadyRefunded + refundedNow;
  const fullyRefunded = newCumulative >= total - 0.01;

  return prisma.payment.update({
    where: { id: paymentId },
    data: {
      refundAmount: newCumulative,
      refundReason: reason || "Admin refund",
      ...(fullyRefunded
        ? { status: "REFUNDED", refundedAt: new Date() }
        : {}),
    },
  });
}
