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
import * as quickbooksService from '../services/quickbooks.service';
import Stripe from 'stripe';
import crypto from 'crypto';

const router = Router();

/**
 * Garante que o valor cobrado no Stripe bate com o registro local.
 * Em caso de divergência: loga com severidade SECURITY, marca payment como FAILED
 * e notifica admins — nunca silencia a discrepância.
 */
async function assertPaymentIntentAmountMatches(
  paymentIntent: Stripe.PaymentIntent,
  payment: { totalAmount: unknown; paymentNumber: string; id: string; workOrderId: string },
): Promise<boolean> {
  const cur = (paymentIntent.currency || "usd").toLowerCase();
  if (cur !== "usd") {
    logger.warn(
      `Webhook PI ${paymentIntent.id}: moeda ${paymentIntent.currency} — checagem de valor ignorada`,
    );
    return true;
  }

  const expectedCents = Math.round(Number(payment.totalAmount) * 100);
  if (paymentIntent.amount === expectedCents) return true;

  logger.error(
    `SECURITY: amount mismatch PI ${paymentIntent.id} — Stripe=${paymentIntent.amount}c, ` +
    `local=${expectedCents}c (payment ${payment.id})`,
  );

  // Marcar payment como FAILED para não deixar em PENDING indefinidamente
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'FAILED' },
  });

  // Notificar todos os admins
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true },
  });

  const alertTag = `[amount_mismatch:${payment.id}]`;
  for (const admin of admins) {
    const dup = await prisma.notification.findFirst({
      where: { userId: admin.id, message: { contains: alertTag } },
    });
    if (dup) continue;
    await prisma.notification.create({
      data: {
        userId: admin.id,
        type: 'SYSTEM_ALERT',
        title: '⚠️ Payment Amount Mismatch',
        message: `${alertTag} PI ${paymentIntent.id}: Stripe=${paymentIntent.amount}c vs expected=${expectedCents}c. Payment ${payment.id} marked FAILED.`,
        data: { paymentId: payment.id, stripeAmount: paymentIntent.amount, expectedCents },
        relatedWorkOrderId: payment.workOrderId,
      },
    });
  }

  return false;
}

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

  const existingEvent = await prisma.stripeWebhookEvent.findUnique({
    where: { id: event.id },
  });
  if (existingEvent?.processedAt) {
    logger.info(`Webhook Stripe dedupe (já processado): ${event.id}`);
    return res.json({ received: true, duplicate: true });
  }

  await prisma.stripeWebhookEvent.upsert({
    where: { id: event.id },
    create: { id: event.id, type: event.type },
    update: {},
  });

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
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

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

    await prisma.stripeWebhookEvent.update({
      where: { id: event.id },
      data: { processedAt: new Date() },
    });

    res.json({ received: true });
  } catch (error: any) {
    logger.error(`Erro ao processar webhook ${event.type}:`, error);
    // 500 → Stripe reenvia; linha em stripe_webhook_events fica sem processedAt para reprocessar com segurança (handlers idempotentes por estado).
    return res.status(500).json({
      received: false,
      error: error?.message || "webhook_processing_error",
    });
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

  if (payment.status === 'AUTHORIZED') {
    logger.info(
      `Payment ${payment.id} já AUTHORIZED (fluxo app ou webhook), ignorando amount_capturable_updated`,
    );
    return;
  }

  if (!(await assertPaymentIntentAmountMatches(paymentIntent, payment))) {
    return;
  }

  if (payment.status !== 'PENDING') {
    logger.info(
      `Payment ${payment.id} não está PENDING (${payment.status}), ignorando authorized`,
    );
    return;
  }

  const woStatus = payment.workOrder.status;
  const preserveQuoteHoldFlow =
    woStatus === 'PAYMENT_HOLD' || woStatus === 'PENDING_START';

  const chargeId =
    typeof paymentIntent.latest_charge === 'string'
      ? paymentIntent.latest_charge
      : (paymentIntent.latest_charge as { id?: string } | null)?.id || null;

  if (preserveQuoteHoldFlow) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'AUTHORIZED',
        authorizedAt: new Date(),
        stripeChargeId: chargeId,
      },
    });
    logger.info(
      `Payment ${payment.paymentNumber} AUTHORIZED via webhook (WO permanece ${woStatus})`,
    );
    return;
  }

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'AUTHORIZED',
        authorizedAt: new Date(),
        stripeChargeId: chargeId,
      },
    }),
    prisma.workOrder.update({
      where: { id: payment.workOrderId },
      data: { status: 'IN_PROGRESS' },
    }),
  ]);

  await prisma.notification.create({
    data: {
      userId: payment.providerId,
      type: 'PAYMENT_RECEIVED',
      title: 'Payment Authorized',
      message: `Payment of $${Number(payment.totalAmount).toFixed(2)} has been authorized for order ${payment.workOrder.orderNumber}. Complete the service to receive funds.`,
      data: {
        paymentId: payment.id,
        workOrderId: payment.workOrderId,
        amount: Number(payment.providerAmount),
      },
      relatedWorkOrderId: payment.workOrderId,
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
      data: { paymentId: payment.id },
      relatedWorkOrderId: payment.workOrderId,
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

  if (!(await assertPaymentIntentAmountMatches(paymentIntent, payment))) {
    return;
  }

  const chargeId =
    typeof paymentIntent.latest_charge === 'string'
      ? paymentIntent.latest_charge
      : (paymentIntent.latest_charge as { id?: string } | null)?.id || null;

  if (payment.paymentType === 'SUPPLEMENT') {
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'CAPTURED',
          capturedAt: new Date(),
          stripeChargeId: chargeId,
        },
      }),
      prisma.paymentSupplement.updateMany({
        where: { stripePaymentIntentId: paymentIntent.id },
        data: { status: 'CAPTURED', capturedAt: new Date() },
      }),
    ]);
    logger.info(
      `Payment ${payment.paymentNumber} (SUPPLEMENT) CAPTURED via webhook — WO não alterada`,
    );
    return;
  }

  if (payment.paymentType === 'CANCELLATION_FEE') {
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'CAPTURED',
          capturedAt: new Date(),
          stripeChargeId: chargeId,
        },
      }),
    ]);
    logger.info(
      `Payment ${payment.paymentNumber} (CANCELLATION_FEE) CAPTURED via webhook`,
    );
    return;
  }

  if (payment.workOrder.status === 'COMPLETED') {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'CAPTURED',
        capturedAt: new Date(),
        stripeChargeId: chargeId,
      },
    });
    logger.info(
      `Payment ${payment.paymentNumber} CAPTURED via webhook (WO já COMPLETED pelo app)`,
    );
    return;
  }

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'CAPTURED',
        capturedAt: new Date(),
        stripeChargeId: chargeId,
      },
    }),
    prisma.workOrder.update({
      where: { id: payment.workOrderId },
      data: { status: 'COMPLETED' },
    }),
    prisma.serviceRequest.update({
      where: { id: payment.workOrder.serviceRequestId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    }),
  ]);

  await prisma.notification.create({
    data: {
      userId: payment.providerId,
      type: 'PAYMENT_RECEIVED',
      title: 'Payment Received',
      message: `Payment of $${Number(payment.providerAmount).toFixed(2)} has been received for order ${payment.workOrder.orderNumber}`,
      data: {
        paymentId: payment.id,
        workOrderId: payment.workOrderId,
        amount: Number(payment.providerAmount),
      },
      relatedWorkOrderId: payment.workOrderId,
    },
  });

  logger.info(`Payment ${payment.paymentNumber} marcado como CAPTURED via webhook`);

  // Auto-sync to QuickBooks after capture (non-blocking — failure must never prevent WO completion)
  // Retries: attempt 1 immediately, then 30 s, 5 min, 30 min before giving up.
  if (quickbooksService.isQuickBooksConfigured()) {
    const qboRetryDelaysMs = [0, 30_000, 300_000, 1_800_000]; // 0 s, 30 s, 5 min, 30 min
    const paymentId = payment.id;
    const paymentNumber = payment.paymentNumber;
    const scheduleQboSync = (attemptIndex: number) => {
      setTimeout(async () => {
        try {
          await quickbooksService.syncCapturedPaymentToQuickBooks(paymentId);
          logger.info(`QBO auto-sync OK for payment ${paymentNumber} (attempt ${attemptIndex + 1})`);
        } catch (qboErr: any) {
          const nextIndex = attemptIndex + 1;
          if (nextIndex < qboRetryDelaysMs.length) {
            logger.warn(
              `QBO auto-sync attempt ${attemptIndex + 1}/${qboRetryDelaysMs.length} failed ` +
              `for ${paymentNumber}: ${qboErr.message}. Retrying in ${qboRetryDelaysMs[nextIndex] / 1000}s.`,
            );
            scheduleQboSync(nextIndex);
          } else {
            logger.error(
              `QBO auto-sync FAILED all ${qboRetryDelaysMs.length} attempts for payment ${paymentNumber}: ` +
              `${qboErr.message}. Run POST /api/v1/quickbooks/sync-payment/${paymentId} manually.`,
            );
          }
        }
      }, qboRetryDelaysMs[attemptIndex]);
    };
    setImmediate(() => scheduleQboSync(0));
  }
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

  if (['CAPTURED', 'REFUNDED', 'CANCELLED', 'AUTHORIZED'].includes(payment.status)) {
    logger.info(
      `Payment ${payment.id} em estado terminal ${payment.status}, ignorando payment_failed`,
    );
    return;
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'FAILED' },
  });

  await prisma.notification.create({
    data: {
      userId: payment.customerId,
      type: 'REMINDER',
      title: 'Payment Failed',
      message: `Your payment ${payment.paymentNumber} has failed. Please try again.`,
      data: { paymentId: payment.id },
      relatedWorkOrderId: payment.workOrderId,
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
 * Checkout finalizado pelo site público/dashboard.
 * Cria ou sincroniza a assinatura local após o Stripe criar a subscription.
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const billingType = session.metadata?.billingType;

  if (billingType === 'vehicle_addon') {
    await handleVehicleAddOnCheckoutCompleted(session);
    return;
  }

  if (billingType === 'request_renewal') {
    await handleRequestRenewalCheckoutCompleted(session);
    return;
  }

  if (billingType === 'request_cancellation') {
    await handleRequestCancellationCheckoutCompleted(session);
    return;
  }

  if (session.mode !== 'subscription' || !session.subscription) {
    return;
  }

  const userId = session.metadata?.userId;
  const planKey = session.metadata?.planKey;
  const stripeSubscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription.id;
  const stripeCustomerId = typeof session.customer === 'string'
    ? session.customer
    : session.customer?.id;

  if (!userId || !planKey || !stripeCustomerId) {
    logger.warn(`Checkout session sem metadata obrigatória: ${session.id}`);
    return;
  }

  const existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId },
  });

  if (existing) {
    logger.info(`Checkout session ${session.id} já sincronizada com subscription ${existing.id}`);
    return;
  }

  const template = await prisma.subscriptionPlanTemplate.findUnique({
    where: { planKey },
  });

  if (!template || !template.isActive) {
    logger.warn(`Template de plano não encontrado para checkout: ${planKey}`);
    return;
  }

  const stripeSub = await stripeService.retrieveSubscription(stripeSubscriptionId);
  const planEnum = planKey.toUpperCase() as 'STARTER' | 'PRO' | 'ENTERPRISE';

  await prisma.$transaction(async (tx) => {
    await tx.subscription.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    await tx.subscription.create({
      data: {
        userId,
        plan: planEnum,
        price: Number(template.monthlyPrice),
        status: stripeSub.status === 'past_due' ? 'PAST_DUE' : 'ACTIVE',
        stripeSubscriptionId,
        stripeCustomerId,
        maxVehicles: template.vehicleLimit,
        maxServiceRequestsPerMonth: template.serviceRequestsPerMonth,
        currentPeriodStart: stripeSub.currentPeriodStart,
        currentPeriodEnd: stripeSub.currentPeriodEnd,
        trialEnd: stripeSub.trialEnd || null,
      },
    });
  });

  logger.info(`Checkout session ${session.id} sincronizada para user ${userId}, plan ${planKey}`);
}

/**
 * Checkout de add-on de veículo para plano Free.
 * O add-on só vira ativo depois da confirmação de pagamento/assinatura pelo Stripe.
 */
async function handleVehicleAddOnCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== 'subscription' || !session.subscription) {
    logger.warn(`Vehicle add-on checkout sem subscription: ${session.id}`);
    return;
  }

  const userId = session.metadata?.userId;
  const vehicleId = session.metadata?.vehicleId;
  const plan = session.metadata?.plan || 'FREE';
  const stripeSubscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription.id;
  const stripeCustomerId = typeof session.customer === 'string'
    ? session.customer
    : session.customer?.id;

  if (!userId || !vehicleId || !stripeCustomerId) {
    logger.warn(`Vehicle add-on checkout sem metadata obrigatória: ${session.id}`);
    return;
  }

  const subscription = await prisma.subscription.findFirst({
    where: { userId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  });

  if (!subscription) {
    logger.warn(`Subscription ativa não encontrada para add-on checkout: ${session.id}`);
    return;
  }

  const existingAddOn = await prisma.vehicleAddOn.findFirst({
    where: { userId, vehicleId, subscriptionId: subscription.id, isActive: true },
  });

  if (existingAddOn) {
    logger.info(`Vehicle add-on já existe para vehicle ${vehicleId}, checkout ${session.id}`);
    return;
  }

  const stripeSub = await stripeService.retrieveSubscription(stripeSubscriptionId);
  const stripeItemId = stripeSub.items[0]?.id;

  if (!stripeItemId) {
    logger.warn(`Subscription ${stripeSubscriptionId} sem item para vehicle add-on`);
    return;
  }

  const priceByPlan: Record<string, number> = {
    FREE: 6.99,
    STARTER: 5.99,
    PRO: 3.99,
    ENTERPRISE: 0,
  };
  const monthlyPrice = priceByPlan[plan.toUpperCase()] ?? 6.99;

  await prisma.$transaction([
    prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        stripeSubscriptionId,
        stripeCustomerId,
        currentPeriodStart: stripeSub.currentPeriodStart,
        currentPeriodEnd: stripeSub.currentPeriodEnd,
      },
    }),
    prisma.vehicleAddOn.create({
      data: {
        subscriptionId: subscription.id,
        userId,
        vehicleId,
        monthlyPrice,
        stripeSubscriptionItemId: stripeItemId,
        isActive: true,
      },
    }),
  ]);

  logger.info(`Vehicle add-on ativado via checkout ${session.id} para vehicle ${vehicleId}`);
}

/**
 * Checkout de taxa avulsa de renovação de solicitação.
 */
async function handleRequestRenewalCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const requestId = session.metadata?.requestId;
  const expiresAt = session.metadata?.expiresAt || null;
  const quoteDeadline = session.metadata?.quoteDeadline || null;

  if (!userId || !requestId) {
    logger.warn(`Renewal checkout sem metadata obrigatória: ${session.id}`);
    return;
  }

  const request = await prisma.serviceRequest.findFirst({
    where: { id: requestId, userId },
  });

  if (!request) {
    logger.warn(`Request ${requestId} não encontrada para renewal checkout ${session.id}`);
    return;
  }

  await prisma.serviceRequest.update({
    where: { id: requestId },
    data: {
      status: "SEARCHING_PROVIDERS",
      cancelledAt: null,
      cancellationReason: null,
      acceptedQuoteId: null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      quoteDeadline: quoteDeadline ? new Date(quoteDeadline) : new Date(Date.now() + 24 * 60 * 60 * 1000),
      renewalCount: { increment: 1 },
      lastRenewedAt: new Date(),
    },
  });

  logger.info(`Request ${request.requestNumber} renovada via checkout ${session.id}`);
}

/**
 * Checkout de taxa de cancelamento de solicitação.
 */
async function handleRequestCancellationCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const requestId = session.metadata?.requestId;
  const reason = session.metadata?.reason || "Cancelled after Stripe cancellation fee payment";

  if (!userId || !requestId) {
    logger.warn(`Cancellation checkout sem metadata obrigatória: ${session.id}`);
    return;
  }

  const request = await prisma.serviceRequest.findFirst({
    where: { id: requestId, userId },
  });

  if (!request) {
    logger.warn(`Request ${requestId} não encontrada para cancellation checkout ${session.id}`);
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.serviceRequest.update({
      where: { id: requestId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
    });

    await tx.workOrder.updateMany({
      where: { serviceRequestId: requestId, status: { notIn: ["COMPLETED", "CANCELLED"] } },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
      },
    });
  });

  logger.info(`Request ${request.requestNumber} cancelada via checkout ${session.id}`);
}

/**
 * Maps a Stripe price ID to our plan enum.
 * Returns null if the price ID is unknown (e.g. add-ons).
 */
function getPlanFromPriceId(priceId: string): 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE' | null {
  const map: Record<string, 'STARTER' | 'PRO' | 'ENTERPRISE'> = {};
  const add = (envKey: string, plan: 'STARTER' | 'PRO' | 'ENTERPRISE') => {
    const val = process.env[envKey];
    if (val) map[val] = plan;
  };
  add('STRIPE_PRICE_STARTER', 'STARTER');
  add('STRIPE_PRICE_STARTER_MONTHLY', 'STARTER');
  add('STRIPE_PRICE_STARTER_YEARLY', 'STARTER');
  add('STRIPE_PRICE_PRO', 'PRO');
  add('STRIPE_PRICE_PRO_MONTHLY', 'PRO');
  add('STRIPE_PRICE_PRO_YEARLY', 'PRO');
  add('STRIPE_PRICE_ENTERPRISE', 'ENTERPRISE');
  add('STRIPE_PRICE_ENTERPRISE_MONTHLY', 'ENTERPRISE');
  add('STRIPE_PRICE_ENTERPRISE_YEARLY', 'ENTERPRISE');
  return map[priceId] ?? null;
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

  // Detectar mudança de plano (upgrade/downgrade)
  const priceId = subscription.items?.data?.[0]?.price?.id;
  const newPlan = priceId ? getPlanFromPriceId(priceId) : null;
  const planUpdate = newPlan && newPlan !== dbSub.plan ? { plan: newPlan } : {};

  if (newPlan && newPlan !== dbSub.plan) {
    logger.info(`Plan change detected: ${dbSub.plan} → ${newPlan} for subscription ${dbSub.id}`);
  }

  await prisma.subscription.update({
    where: { id: dbSub.id },
    data: {
      status,
      ...planUpdate,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
      cancelledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : null,
    },
  });

  logger.info(`Subscription ${dbSub.id} atualizada: status=${status}${newPlan ? ` plan=${newPlan}` : ''}`);
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

  if (dbSub.plan === 'FREE') {
    await prisma.$transaction([
      prisma.vehicleAddOn.updateMany({
        where: { subscriptionId: dbSub.id, isActive: true },
        data: { isActive: false, cancelledAt: new Date() },
      }),
      prisma.subscription.update({
        where: { id: dbSub.id },
        data: {
          stripeSubscriptionId: null,
          status: 'ACTIVE',
        },
      }),
    ]);
    return;
  }

  await prisma.subscription.update({
    where: { id: dbSub.id },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
    },
  });
}

/**
 * Fatura paga (renovação de assinatura).
 * Atualiza status para ACTIVE (recovery de PAST_DUE),
 * reseta uso mensal e sincroniza datas do período de cobrança.
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  // Processar somente faturas recorrentes de assinatura (billing_reason = subscription_cycle ou subscription_update)
  // Ignorar faturas de primeira cobrança (já tratadas em checkout.session.completed)
  const billingReason = (invoice as any).billing_reason as string | undefined;
  if (billingReason === 'subscription_create') return;

  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription.id;

  logger.info(`Invoice paid (${billingReason ?? 'unknown'}) for subscription: ${subscriptionId}`);

  const dbSub = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!dbSub) return;

  // Sincronizar datas do período com o que o Stripe retorna na invoice
  const periodStart = invoice.period_start ? new Date(invoice.period_start * 1000) : undefined;
  const periodEnd   = invoice.period_end   ? new Date(invoice.period_end   * 1000) : undefined;

  await prisma.subscription.update({
    where: { id: dbSub.id },
    data: {
      // Transition PAST_DUE → ACTIVE ao recuperar o pagamento
      status: 'ACTIVE',
      // Resetar uso mensal apenas em renovação de ciclo
      serviceRequestsThisMonth: 0,
      // Sincronizar datas de período
      ...(periodStart ? { currentPeriodStart: periodStart } : {}),
      ...(periodEnd   ? { currentPeriodEnd:   periodEnd   } : {}),
    },
  });

  logger.info(`Subscription ${dbSub.id} renovada: ACTIVE, uso resetado, período ${periodStart?.toISOString()} → ${periodEnd?.toISOString()}`);
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

  const invoiceTag = `[invoice_fail:${invoice.id}]`;
  const dup = await prisma.notification.findFirst({
    where: {
      userId: dbSub.userId,
      title: 'Subscription Payment Failed',
      message: { contains: invoiceTag },
    },
  });
  if (dup) return;

  await prisma.notification.create({
    data: {
      userId: dbSub.userId,
      type: 'REMINDER',
      title: 'Subscription Payment Failed',
      message: `${invoiceTag} Your subscription payment has failed. Please update your payment method to avoid service interruption.`,
      data: {
        subscriptionId: dbSub.id,
        stripeInvoiceId: invoice.id,
      },
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

  const alreadyComplete = profile.stripeOnboardingCompleted === true;

  await prisma.providerProfile.update({
    where: { id: profile.id },
    data: {
      stripeOnboardingCompleted: isOnboardingComplete,
    },
  });

  if (isOnboardingComplete && !alreadyComplete) {
    logger.info(`Provider ${profile.userId} completou onboarding do Stripe Connect`);

    await prisma.notification.create({
      data: {
        userId: profile.userId,
        type: 'REMINDER',
        title: 'Stripe Account Ready',
        message: 'Your Stripe account has been verified! You can now receive payments for your services.',
        data: { type: 'stripe_onboarding_complete' },
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
      if (payment.stripeTransferId) {
        logger.info(
          `Payment ${payment.paymentNumber} já tem transfer ${payment.stripeTransferId}, ignorando`,
        );
        return;
      }
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

  const refundedCents = charge.amount_refunded;
  const chargeTotalCents = charge.amount;
  const fullyRefunded =
    chargeTotalCents > 0 && refundedCents >= chargeTotalCents;
  const refundAmount = refundedCents / 100;

  if (payment.status === "REFUNDED") {
    logger.info(
      `Payment ${payment.paymentNumber} já REFUNDED, ignorando charge.refunded`,
    );
    return;
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      refundAmount,
      ...(fullyRefunded
        ? { status: "REFUNDED", refundedAt: new Date() }
        : {}),
    },
  });

  if (!fullyRefunded) {
    logger.info(
      `Reembolso parcial registrado para ${payment.paymentNumber}: $${refundAmount.toFixed(2)} (charge ${charge.id})`,
    );
    return;
  }

  const refundTag = `[refund:${charge.id}]`;
  const dup = await prisma.notification.findFirst({
    where: {
      userId: payment.customerId,
      title: "Refund Processed",
      message: { contains: refundTag },
    },
  });
  if (!dup) {
    await prisma.notification.create({
      data: {
        userId: payment.customerId,
        type: "PAYMENT_RECEIVED",
        title: "Refund Processed",
        message: `${refundTag} A refund of $${refundAmount.toFixed(2)} has been processed for payment ${payment.paymentNumber}.`,
        data: { paymentId: payment.id, refundAmount, chargeId: charge.id },
        relatedWorkOrderId: payment.workOrderId,
      },
    });
  }

  logger.info(`Payment ${payment.paymentNumber} reembolsado (total): $${refundAmount}`);
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

  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true },
  });

  const disputeTag = `[dispute:${dispute.id}]`;

  for (const admin of admins) {
    const dup = await prisma.notification.findFirst({
      where: {
        userId: admin.id,
        title: '⚠️ Payment Dispute',
        message: { contains: disputeTag },
      },
    });
    if (dup) continue;

    await prisma.notification.create({
      data: {
        userId: admin.id,
        type: 'REMINDER',
        title: '⚠️ Payment Dispute',
        message: `${disputeTag} A dispute has been opened for payment ${payment.paymentNumber} ($${Number(payment.totalAmount).toFixed(2)}). Please review immediately.`,
        data: { paymentId: payment.id, disputeId: dispute.id },
        relatedWorkOrderId: payment.workOrderId,
      },
    });
  }
}

// ============================================
// ASAAS WEBHOOK — PIX Payments (Brazilian users)
// ============================================

/**
 * POST /api/v1/webhooks/asaas
 *
 * Recebe eventos do Asaas para cobranças PIX.
 * Asaas envia um token de autenticação no header "asaas-access-token".
 * Validar contra ASAAS_WEBHOOK_TOKEN para evitar chamadas não autorizadas.
 *
 * Eventos tratados:
 *   PAYMENT_RECEIVED  → PIX confirmado → capturar pagamento + concluir ordem
 *   PAYMENT_OVERDUE   → PIX expirado sem pagamento → cancelar
 *   PAYMENT_DELETED   → Cobrança removida → cancelar
 */
router.post('/asaas', async (req: Request, res: Response): Promise<any> => {
  // Verificar token Asaas (não é HMAC; é um bearer token fixo configurado no dashboard Asaas)
  const token = req.headers['asaas-access-token'] as string | undefined;
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;

  if (!expectedToken) {
    logger.error('ASAAS_WEBHOOK_TOKEN não configurado — rejeitando webhook');
    return res.status(500).json({ error: 'Webhook token not configured' });
  }

  // Comparação em tempo constante para prevenir timing attacks
  const tokenValid = token != null && (() => {
    try {
      const a = Buffer.from(token);
      const b = Buffer.from(expectedToken);
      // timingSafeEqual exige buffers de mesmo tamanho
      if (a.length !== b.length) return false;
      return crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  })();

  if (!tokenValid) {
    logger.warn('Asaas webhook com token inválido');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const event = req.body as { event: string; payment?: { id: string; externalReference?: string; status: string; value: number } };

  if (!event?.event || !event?.payment?.id) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const asaasPaymentId = event.payment.id;
  const externalRef = event.payment.externalReference; // paymentId do TechTrust

  logger.info(`Asaas webhook: ${event.event} | PIX ${asaasPaymentId}`);

  // Idempotência: verificar se já processamos este evento
  const idempotencyKey = `asaas_${event.event}_${asaasPaymentId}`;
  const already = await prisma.stripeWebhookEvent.findUnique({
    where: { id: idempotencyKey },
  });
  if (already?.processedAt) {
    logger.info(`Asaas event já processado: ${idempotencyKey}`);
    return res.status(200).json({ received: true });
  }

  await prisma.stripeWebhookEvent.upsert({
    where: { id: idempotencyKey },
    create: { id: idempotencyKey, type: event.event },
    update: {},
  });

  try {
    switch (event.event) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED':
        await handleAsaasPixConfirmed(asaasPaymentId, externalRef, event.payment.value ?? 0);
        break;

      case 'PAYMENT_OVERDUE':
      case 'PAYMENT_DELETED':
        await handleAsaasPixExpiredOrDeleted(asaasPaymentId, externalRef);
        break;

      default:
        logger.info(`Asaas event ignorado: ${event.event}`);
    }

    await prisma.stripeWebhookEvent.update({
      where: { id: idempotencyKey },
      data: { processedAt: new Date() },
    });

    return res.status(200).json({ received: true });
  } catch (err) {
    logger.error(`Erro ao processar Asaas webhook ${event.event} (${asaasPaymentId}): ${err}`);
    // Retorna 500 para Asaas retentar
    return res.status(500).json({ error: 'Processing error' });
  }
});

async function handleAsaasPixConfirmed(
  asaasPaymentId: string,
  externalRef: string | undefined,
  paidAmountBrl: number,
) {
  // Localizar pagamento pelo pixPaymentId (primário) ou pelo externalReference (fallback)
  // Evitar `OR: [{}, ...]` que faz full-table scan — buscar somente pelo que existe
  const payment = await prisma.payment.findFirst({
    where: externalRef
      ? { OR: [{ pixPaymentId: asaasPaymentId }, { id: externalRef }], cardType: 'pix' }
      : { pixPaymentId: asaasPaymentId, cardType: 'pix' },
  });

  if (!payment) {
    logger.warn(`Asaas PIX confirmado mas payment não encontrado: ${asaasPaymentId}`);
    return;
  }

  if (payment.status === 'CAPTURED') {
    logger.info(`PIX já capturado: ${payment.paymentNumber}`);
    return;
  }

  // Validação de valor: valor pago deve bater com o valor cobrado (anti-fraude)
  // Tolerância de R$0.02 para diferenças de arredondamento
  const expectedBrl = Number(payment.pixAmountBrl ?? 0);
  if (expectedBrl > 0 && Math.abs(paidAmountBrl - expectedBrl) > 0.02) {
    logger.error(
      `SECURITY: PIX amount mismatch — payment ${payment.paymentNumber}: ` +
      `esperado R$ ${expectedBrl.toFixed(2)}, recebido R$ ${paidAmountBrl.toFixed(2)}`,
    );
    // Não processar — admin precisa investigar manualmente
    return;
  }

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'CAPTURED',
        authorizedAt: new Date(),
        capturedAt: new Date(),
        pixPaidAt: new Date(),
        // Substituir placeholder pelo ID real do Asaas
        stripePaymentIntentId: asaasPaymentId,
      },
    }),
    prisma.workOrder.update({
      where: { id: payment.workOrderId },
      data: { status: 'COMPLETED' },
    }),
  ]);

  // Notificar cliente e provider
  await prisma.notification.createMany({
    data: [
      {
        userId: payment.customerId,
        type: 'PAYMENT_RECEIVED',
        title: 'Pagamento PIX confirmado!',
        message: `Seu pagamento PIX de R$ ${Number(payment.pixAmountBrl).toFixed(2)} foi confirmado. O serviço foi concluído.`,
        data: { paymentId: payment.id },
        relatedWorkOrderId: payment.workOrderId,
      },
      {
        userId: payment.providerId,
        type: 'PAYMENT_RECEIVED',
        title: 'Pagamento recebido (PIX)',
        message: `Pagamento confirmado para a ordem ${payment.paymentNumber}. Valor líquido: $${Number(payment.providerAmount).toFixed(2)}.`,
        data: { paymentId: payment.id },
        relatedWorkOrderId: payment.workOrderId,
      },
    ],
  });

  logger.info(`PIX capturado via webhook Asaas: ${payment.paymentNumber}`);
}

async function handleAsaasPixExpiredOrDeleted(asaasPaymentId: string, externalRef?: string) {
  const payment = await prisma.payment.findFirst({
    where: externalRef
      ? { OR: [{ pixPaymentId: asaasPaymentId }, { id: externalRef }], cardType: 'pix', status: 'PENDING' }
      : { pixPaymentId: asaasPaymentId, cardType: 'pix', status: 'PENDING' },
  });

  if (!payment) return;

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'CANCELLED' },
  });

  await prisma.notification.create({
    data: {
      userId: payment.customerId,
      type: 'SYSTEM_ALERT',
      title: 'QR Code PIX expirado',
      message: 'O QR Code PIX expirou sem pagamento. Acesse o app para gerar uma nova cobrança.',
      data: { paymentId: payment.id, workOrderId: payment.workOrderId },
      relatedWorkOrderId: payment.workOrderId,
    },
  });

  logger.info(`PIX expirado/cancelado via webhook Asaas: ${payment.paymentNumber}`);
}

export default router;
