/**
 * ============================================
 * STRIPE WEBHOOK ROUTES
 * ============================================
 * Receber e processar eventos do Stripe
 * 
 * IMPORTANTE: O body deve ser raw (Buffer) para
 * verificação da assinatura do webhook
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import * as stripeService from '../services/stripe.service';
import Stripe from 'stripe';

const router = Router();

/**
 * POST /api/v1/webhooks/stripe
 * Receber webhooks do Stripe
 * 
 * NOTA: Este endpoint NÃO usa express.json() -
 * precisa do raw body para verificação da assinatura.
 * O middleware raw é aplicado no server.ts antes do json parser.
 */
router.post('/stripe', async (req: Request, res: Response): Promise<any> => {
  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    logger.warn('Webhook sem stripe-signature header');
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let event: Stripe.Event;

  try {
    event = stripeService.constructWebhookEvent(req.body, signature);
  } catch (err: any) {
    logger.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  logger.info(`Webhook recebido: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      // ==========================================
      // PAYMENT INTENTS
      // ==========================================
      case 'payment_intent.amount_capturable_updated':
        // Pré-autorização confirmada (hold ativo no cartão)
        await handlePaymentIntentAuthorized(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.succeeded':
        // Captura confirmada (cobrança real efetuada)
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.canceled':
        // Hold cancelado (void)
        await handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      // ==========================================
      // SUBSCRIPTIONS
      // ==========================================
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      // ==========================================
      // STRIPE CONNECT
      // ==========================================
      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;

      case 'transfer.created':
        await handleTransferCreated(event.data.object as Stripe.Transfer);
        break;

      // ==========================================
      // CHARGES / REFUNDS
      // ==========================================
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      case 'charge.dispute.created':
        await handleDisputeCreated(event.data.object as Stripe.Dispute);
        break;

      default:
        logger.debug(`Webhook event não tratado: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    logger.error(`Erro ao processar webhook ${event.type}:`, error);
    // Retornar 200 mesmo em erro para o Stripe não reenviar
    // Erros são logados para investigação manual
    res.json({ received: true, error: error.message });
  }
});

// ============================================
// HANDLERS
// ============================================

/**
 * Payment Intent autorizado (pré-autorização / hold confirmado)
 */
async function handlePaymentIntentAuthorized(paymentIntent: Stripe.PaymentIntent) {
  logger.info(`PaymentIntent authorized (hold): ${paymentIntent.id} - amount_capturable: ${paymentIntent.amount_capturable}`);

  const payment = await prisma.payment.findUnique({
    where: { stripePaymentIntentId: paymentIntent.id },
    include: { workOrder: true },
  });

  if (!payment) {
    logger.warn(`Payment não encontrado para PI authorized: ${paymentIntent.id}`);
    return;
  }

  if (payment.status !== 'PENDING') {
    logger.info(`Payment ${payment.id} não está PENDING (${payment.status}), ignorando authorized`);
    return;
  }

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'AUTHORIZED',
        authorizedAt: new Date(),
        stripeChargeId: typeof paymentIntent.latest_charge === 'string'
          ? paymentIntent.latest_charge
          : (paymentIntent.latest_charge as any)?.id || null,
      },
    }),
    prisma.workOrder.update({
      where: { id: payment.workOrderId },
      data: { status: 'IN_PROGRESS' },
    }),
  ]);

  // Notificar provider
  await prisma.notification.create({
    data: {
      userId: payment.providerId,
      type: 'PAYMENT_RECEIVED',
      title: 'Payment Authorized',
      message: `Payment of $${Number(payment.totalAmount).toFixed(2)} has been authorized for order ${payment.workOrder.orderNumber}. Complete the service to receive funds.`,
      data: JSON.stringify({
        paymentId: payment.id,
        workOrderId: payment.workOrderId,
        amount: Number(payment.providerAmount),
      }),
    },
  });

  logger.info(`Payment ${payment.paymentNumber} marcado como AUTHORIZED (hold) via webhook`);
}

/**
 * Payment Intent cancelado (void / hold liberado)
 */
async function handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent) {
  logger.info(`PaymentIntent canceled: ${paymentIntent.id}`);

  const payment = await prisma.payment.findUnique({
    where: { stripePaymentIntentId: paymentIntent.id },
  });

  if (!payment) return;

  if (payment.status === 'CANCELLED') return;

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'CANCELLED' },
  });

  // Notificar customer que o hold foi liberado
  await prisma.notification.create({
    data: {
      userId: payment.customerId,
      type: 'REMINDER',
      title: 'Hold Released',
      message: `The payment hold of $${Number(payment.totalAmount).toFixed(2)} for ${payment.paymentNumber} has been released.`,
      data: JSON.stringify({ paymentId: payment.id }),
    },
  });

  logger.info(`Payment ${payment.paymentNumber} CANCELLED (hold released) via webhook`);
}

/**
 * Payment Intent concluído com sucesso (captura efetuada)
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  logger.info(`PaymentIntent succeeded: ${paymentIntent.id}`);

  const payment = await prisma.payment.findUnique({
    where: { stripePaymentIntentId: paymentIntent.id },
    include: { workOrder: true },
  });

  if (!payment) {
    logger.warn(`Payment não encontrado para PI: ${paymentIntent.id}`);
    return;
  }

  if (payment.status === 'CAPTURED') {
    logger.info(`Payment ${payment.id} já está CAPTURED, ignorando`);
    return;
  }

  // Atualizar pagamento, work order e service request
  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'CAPTURED',
        capturedAt: new Date(),
        stripeChargeId: typeof paymentIntent.latest_charge === 'string'
          ? paymentIntent.latest_charge
          : (paymentIntent.latest_charge as any)?.id || null,
      },
    }),
    prisma.workOrder.update({
      where: { id: payment.workOrderId },
      data: { status: 'COMPLETED' },
    }),
    prisma.serviceRequest.update({
      where: { id: payment.workOrder.serviceRequestId },
      data: { status: 'COMPLETED' },
    }),
  ]);

  // Criar notificação para provider
  await prisma.notification.create({
    data: {
      userId: payment.providerId,
      type: 'PAYMENT_RECEIVED',
      title: 'Payment Received',
      message: `Payment of $${Number(payment.providerAmount).toFixed(2)} has been received for order ${payment.workOrder.orderNumber}`,
      data: JSON.stringify({
        paymentId: payment.id,
        workOrderId: payment.workOrderId,
        amount: Number(payment.providerAmount),
      }),
    },
  });

  logger.info(`Payment ${payment.paymentNumber} marcado como CAPTURED via webhook`);
}

/**
 * Payment Intent falhou
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  logger.warn(`PaymentIntent failed: ${paymentIntent.id}`);

  const payment = await prisma.payment.findUnique({
    where: { stripePaymentIntentId: paymentIntent.id },
  });

  if (!payment) return;

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'FAILED' },
  });

  // Notificar customer
  await prisma.notification.create({
    data: {
      userId: payment.customerId,
      type: 'REMINDER',
      title: 'Payment Failed',
      message: `Your payment ${payment.paymentNumber} has failed. Please try again.`,
      data: JSON.stringify({ paymentId: payment.id }),
    },
  });

  logger.info(`Payment ${payment.paymentNumber} marcado como FAILED`);
}

/**
 * Subscription criada
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  logger.info(`Subscription created: ${subscription.id}`);
  // Tratado no handler de update para evitar duplicação
}

/**
 * Subscription atualizada (upgrade, downgrade, renewal, etc)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  logger.info(`Subscription updated: ${subscription.id} → ${subscription.status}`);

  const dbSub = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!dbSub) {
    logger.warn(`Subscription não encontrada no banco: ${subscription.id}`);
    return;
  }

  // Mapear status do Stripe para nosso enum
  let status: 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED' = 'ACTIVE';
  switch (subscription.status) {
    case 'active':
    case 'trialing':
      status = 'ACTIVE';
      break;
    case 'past_due':
      status = 'PAST_DUE';
      break;
    case 'canceled':
    case 'unpaid':
      status = 'CANCELLED';
      break;
    case 'incomplete_expired':
      status = 'EXPIRED';
      break;
  }

  await prisma.subscription.update({
    where: { id: dbSub.id },
    data: {
      status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : null,
    },
  });

  logger.info(`Subscription ${dbSub.id} atualizada para status ${status}`);
}

/**
 * Subscription cancelada/deletada
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  logger.info(`Subscription deleted: ${subscription.id}`);

  const dbSub = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!dbSub) return;

  await prisma.subscription.update({
    where: { id: dbSub.id },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
    },
  });
}

/**
 * Fatura paga (renovação de assinatura)
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription.id;

  logger.info(`Invoice paid for subscription: ${subscriptionId}`);

  const dbSub = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!dbSub) return;

  // Resetar uso mensal
  await prisma.subscription.update({
    where: { id: dbSub.id },
    data: {
      status: 'ACTIVE',
      serviceRequestsThisMonth: 0,
    },
  });
}

/**
 * Fatura falhou (problema de pagamento na assinatura)
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription.id;

  logger.warn(`Invoice payment failed for subscription: ${subscriptionId}`);

  const dbSub = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
    include: { user: true },
  });

  if (!dbSub) return;

  await prisma.subscription.update({
    where: { id: dbSub.id },
    data: { status: 'PAST_DUE' },
  });

  // Notificar usuário
  await prisma.notification.create({
    data: {
      userId: dbSub.userId,
      type: 'REMINDER',
      title: 'Subscription Payment Failed',
      message: 'Your subscription payment has failed. Please update your payment method to avoid service interruption.',
      data: JSON.stringify({ subscriptionId: dbSub.id }),
    },
  });
}

/**
 * Connect Account atualizado (onboarding completo, etc)
 */
async function handleAccountUpdated(account: Stripe.Account) {
  logger.info(`Account updated: ${account.id} (charges: ${account.charges_enabled}, payouts: ${account.payouts_enabled})`);

  const profile = await prisma.providerProfile.findUnique({
    where: { stripeAccountId: account.id },
  });

  if (!profile) {
    logger.warn(`ProviderProfile não encontrado para account: ${account.id}`);
    return;
  }

  const isOnboardingComplete = account.charges_enabled && account.payouts_enabled && account.details_submitted;

  await prisma.providerProfile.update({
    where: { id: profile.id },
    data: {
      stripeOnboardingCompleted: isOnboardingComplete,
    },
  });

  if (isOnboardingComplete) {
    logger.info(`Provider ${profile.userId} completou onboarding do Stripe Connect`);

    await prisma.notification.create({
      data: {
        userId: profile.userId,
        type: 'REMINDER',
        title: 'Stripe Account Ready',
        message: 'Your Stripe account has been verified! You can now receive payments for your services.',
        data: JSON.stringify({ type: 'stripe_onboarding_complete' }),
      },
    });
  }
}

/**
 * Transfer criada (pagamento ao provider)
 */
async function handleTransferCreated(transfer: Stripe.Transfer) {
  logger.info(`Transfer created: ${transfer.id} → ${transfer.destination}`);

  // Se o transfer tem metadata com paymentIntentId
  if (transfer.source_transaction) {
    const payment = await prisma.payment.findFirst({
      where: { stripeChargeId: transfer.source_transaction as string },
    });

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          stripeTransferId: transfer.id,
          transferredToProviderAt: new Date(),
        },
      });
      logger.info(`Transfer ${transfer.id} vinculado ao payment ${payment.paymentNumber}`);
    }
  }
}

/**
 * Charge reembolsado
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
  logger.info(`Charge refunded: ${charge.id}`);

  const payment = await prisma.payment.findFirst({
    where: { stripeChargeId: charge.id },
  });

  if (!payment) return;

  const refundAmount = charge.amount_refunded / 100; // centavos → dólares

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'REFUNDED',
      refundedAt: new Date(),
      refundAmount,
    },
  });

  // Notificar customer
  await prisma.notification.create({
    data: {
      userId: payment.customerId,
      type: 'PAYMENT_RECEIVED',
      title: 'Refund Processed',
      message: `A refund of $${refundAmount.toFixed(2)} has been processed for payment ${payment.paymentNumber}.`,
      data: JSON.stringify({ paymentId: payment.id, refundAmount }),
    },
  });

  logger.info(`Payment ${payment.paymentNumber} reembolsado: $${refundAmount}`);
}

/**
 * Disputa criada (chargeback)
 */
async function handleDisputeCreated(dispute: Stripe.Dispute) {
  logger.warn(`Dispute created: ${dispute.id} for charge ${dispute.charge}`);

  const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge.id;

  const payment = await prisma.payment.findFirst({
    where: { stripeChargeId: chargeId },
  });

  if (!payment) return;

  // Notificar admin (criar notificação genérica)
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true },
  });

  for (const admin of admins) {
    await prisma.notification.create({
      data: {
        userId: admin.id,
        type: 'REMINDER',
        title: '⚠️ Payment Dispute',
        message: `A dispute has been opened for payment ${payment.paymentNumber} ($${Number(payment.totalAmount).toFixed(2)}). Please review immediately.`,
        data: JSON.stringify({ paymentId: payment.id, disputeId: dispute.id }),
      },
    });
  }
}

export default router;
