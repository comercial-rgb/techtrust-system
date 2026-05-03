/**
 * ============================================
 * STRIPE SERVICE - Serviço centralizado
 * ============================================
 * Gerenciamento de pagamentos, assinaturas,
 * Connect e webhooks via Stripe API
 */

import Stripe from "stripe";
import { logger } from "../config/logger";

// ============================================
// INICIALIZAÇÃO
// ============================================

const MOCK_STRIPE = process.env.MOCK_STRIPE === "true";

let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY não configurada");
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia" as any,
      typescript: true,
    });
  }
  return stripe;
}

// ============================================
// CUSTOMERS
// ============================================

/**
 * Criar ou buscar um Stripe Customer a partir do userId
 */
export async function getOrCreateCustomer(params: {
  userId: string;
  email: string;
  name: string;
  existingStripeCustomerId?: string | null;
}): Promise<string> {
  if (MOCK_STRIPE) {
    return params.existingStripeCustomerId || `mock_cus_${params.userId}`;
  }

  const s = getStripe();

  // Se já tem ID, verificar se é válido
  if (params.existingStripeCustomerId) {
    try {
      await s.customers.retrieve(params.existingStripeCustomerId);
      return params.existingStripeCustomerId;
    } catch {
      logger.warn(
        `Stripe Customer ${params.existingStripeCustomerId} não encontrado, criando novo`,
      );
    }
  }

  // Criar novo customer
  const customer = await s.customers.create({
    email: params.email,
    name: params.name,
    metadata: {
      userId: params.userId,
    },
  });

  logger.info(
    `Stripe Customer criado: ${customer.id} para user ${params.userId}`,
  );
  return customer.id;
}

// ============================================
// PAYMENT INTENTS
// ============================================

export interface CreatePaymentIntentParams {
  amount: number; // em centavos
  currency?: string;
  customerId: string; // Stripe Customer ID
  paymentMethodId?: string; // Stripe Payment Method ID
  providerStripeAccountId?: string | null;
  platformFeeAmount: number; // em centavos
  metadata?: Record<string, string>;
  description?: string;
  captureMethod?: "automatic" | "manual"; // manual = pré-autorização
  confirm?: boolean;
  offSession?: boolean;
  // Sales tax fields (Marketplace Facilitator)
  salesTaxAmountCents?: number; // Sales tax in cents (calculated by tax.service)
}

/**
 * Criar PaymentIntent (com ou sem Stripe Connect)
 */
export async function createPaymentIntent(
  params: CreatePaymentIntentParams,
): Promise<{
  paymentIntentId: string;
  clientSecret: string;
  status: string;
}> {
  if (MOCK_STRIPE) {
    const mockId = `mock_pi_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    return {
      paymentIntentId: mockId,
      clientSecret: `${mockId}_secret_mock`,
      status: "requires_payment_method",
    };
  }

  const s = getStripe();

  const intentParams: Stripe.PaymentIntentCreateParams = {
    amount: params.amount,
    currency: params.currency || "usd",
    customer: params.customerId,
    description: params.description,
    metadata: {
      ...(params.metadata || {}),
      // Sales tax tracking for Marketplace Facilitator compliance
      ...(params.salesTaxAmountCents ? {
        sales_tax_amount_cents: String(params.salesTaxAmountCents),
        tax_collected_by: "TECHTRUST_MARKETPLACE_FACILITATOR",
      } : {}),
    },
    capture_method: params.captureMethod || "manual", // Pré-autorização por padrão
    automatic_payment_methods: {
      enabled: true,
    },
  };

  // Se tem payment method, anexar
  if (params.paymentMethodId) {
    intentParams.payment_method = params.paymentMethodId;
  }

  if (params.confirm) {
    intentParams.confirm = true;
    if (params.offSession) {
      intentParams.off_session = true;
    }
  }

  // Se Connect (tem provider), usar transfer_data
  if (params.providerStripeAccountId) {
    intentParams.application_fee_amount = params.platformFeeAmount;
    intentParams.transfer_data = {
      destination: params.providerStripeAccountId,
    };
  }

  const paymentIntent = await s.paymentIntents.create(intentParams);

  logger.info(
    `PaymentIntent criado: ${paymentIntent.id} (${paymentIntent.status})`,
  );

  return {
    paymentIntentId: paymentIntent.id,
    clientSecret: paymentIntent.client_secret!,
    status: paymentIntent.status,
  };
}

/**
 * Verifica o status atual de um PaymentIntent sem alterá-lo.
 * Usado pelo fluxo de confirmação do app para saber se o hold foi colocado.
 *
 * Nota: a confirmação do PI acontece no lado do cliente via Stripe SDK.
 * Este endpoint apenas verifica se o status após confirmação do cliente
 * é `requires_capture` (hold ativo) ou `succeeded` (capturado direto).
 */
export async function retrievePaymentIntentStatus(paymentIntentId: string): Promise<{
  status: string;
  chargeId?: string;
}> {
  if (MOCK_STRIPE) {
    return {
      status: "requires_capture",
      chargeId: `mock_ch_${Date.now()}`,
    };
  }

  const s = getStripe();
  const intent = await s.paymentIntents.retrieve(paymentIntentId);

  return {
    status: intent.status,
    chargeId:
      typeof intent.latest_charge === "string"
        ? intent.latest_charge
        : intent.latest_charge?.id,
  };
}

/**
 * @deprecated Use retrievePaymentIntentStatus — mantido para compatibilidade
 * com chamadas existentes em payment.controller.ts enquanto o refactor é feito.
 */
export const confirmPaymentIntent = retrievePaymentIntentStatus;

export async function retrieveSubscription(subscriptionId: string): Promise<{
  id: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEnd?: Date | null;
  items: Array<{ id: string; priceId?: string }>;
}> {
  if (MOCK_STRIPE) {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    return {
      id: subscriptionId,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      trialEnd: null,
      items: [{ id: `mock_si_${Date.now()}`, priceId: "mock_price" }],
    };
  }

  const s = getStripe();
  const subscription = await s.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });

  return {
    id: subscription.id,
    status: subscription.status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    trialEnd: subscription.trial_end
      ? new Date(subscription.trial_end * 1000)
      : null,
    items: subscription.items.data.map((item) => ({
      id: item.id,
      priceId:
        typeof item.price === "string"
          ? item.price
          : item.price?.id,
    })),
  };
}

/**
 * Capturar PaymentIntent pré-autorizado
 * Converte o hold em cobrança real
 */
export async function capturePaymentIntent(
  paymentIntentId: string,
  amountToCapture?: number,
  applicationFeeAmount?: number,
): Promise<{
  status: string;
  chargeId?: string;
}> {
  if (MOCK_STRIPE) {
    return {
      status: "succeeded",
      chargeId: `mock_ch_${Date.now()}`,
    };
  }

  const s = getStripe();
  const captureParams: Stripe.PaymentIntentCaptureParams = {};
  if (amountToCapture) {
    captureParams.amount_to_capture = amountToCapture;
  }
  if (applicationFeeAmount) {
    captureParams.application_fee_amount = applicationFeeAmount;
  }

  const intent = await s.paymentIntents.capture(paymentIntentId, captureParams);

  logger.info(`PaymentIntent capturado: ${intent.id} (${intent.status})`);

  return {
    status: intent.status,
    chargeId:
      typeof intent.latest_charge === "string"
        ? intent.latest_charge
        : intent.latest_charge?.id,
  };
}

/**
 * Recuperar status do PaymentIntent
 */
export async function retrievePaymentIntent(paymentIntentId: string): Promise<{
  id: string;
  status: string;
  amount: number;
  chargeId?: string;
}> {
  if (MOCK_STRIPE) {
    return {
      id: paymentIntentId,
      status: "succeeded",
      amount: 0,
      chargeId: `mock_ch_${Date.now()}`,
    };
  }

  const s = getStripe();
  const intent = await s.paymentIntents.retrieve(paymentIntentId);

  return {
    id: intent.id,
    status: intent.status,
    amount: intent.amount,
    chargeId:
      typeof intent.latest_charge === "string"
        ? intent.latest_charge
        : intent.latest_charge?.id,
  };
}

/**
 * Cancelar PaymentIntent pré-autorizado e liberar hold.
 */
export async function cancelPaymentIntent(paymentIntentId: string): Promise<{
  status: string;
}> {
  if (MOCK_STRIPE) {
    return { status: "canceled" };
  }

  const s = getStripe();
  const intent = await s.paymentIntents.cancel(paymentIntentId);

  logger.info(`PaymentIntent cancelado: ${intent.id} (${intent.status})`);

  return { status: intent.status };
}

/**
 * Cancela PI; se já estiver cancelado / estado terminal, não falha (reprocessamento admin/webhook).
 */
export async function cancelPaymentIntentIdempotent(
  paymentIntentId: string,
): Promise<{ status: string }> {
  try {
    return await cancelPaymentIntent(paymentIntentId);
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    const msg = (err?.message || "").toLowerCase();
    if (
      err?.code === "payment_intent_unexpected_state" ||
      msg.includes("canceled") ||
      msg.includes("cancelled") ||
      msg.includes("has a status of canceled")
    ) {
      logger.info(
        `cancelPaymentIntentIdempotent: PI ${paymentIntentId} ignorado (${err?.message || "unknown"})`,
      );
      return { status: "canceled" };
    }
    throw e;
  }
}

// ============================================
// PAYMENT METHODS
// ============================================

/**
 * Criar SetupIntent para coletar método de pagamento de forma segura
 */
export async function createSetupIntent(stripeCustomerId: string): Promise<{
  setupIntentId: string;
  clientSecret: string;
}> {
  if (MOCK_STRIPE) {
    const mockId = `mock_seti_${Date.now()}`;
    return {
      setupIntentId: mockId,
      clientSecret: `${mockId}_secret_mock`,
    };
  }

  const s = getStripe();
  const setupIntent = await s.setupIntents.create({
    customer: stripeCustomerId,
    automatic_payment_methods: {
      enabled: true,
    },
  });

  return {
    setupIntentId: setupIntent.id,
    clientSecret: setupIntent.client_secret!,
  };
}

/**
 * Listar métodos de pagamento do customer no Stripe
 */
export async function listPaymentMethods(stripeCustomerId: string): Promise<
  Array<{
    id: string;
    type: string;
    card?: {
      brand: string;
      last4: string;
      expMonth: number;
      expYear: number;
    };
  }>
> {
  if (MOCK_STRIPE) {
    return [];
  }

  const s = getStripe();
  const methods = await s.paymentMethods.list({
    customer: stripeCustomerId,
    type: "card",
  });

  return methods.data.map((m) => ({
    id: m.id,
    type: m.type,
    card: m.card
      ? {
          brand: m.card.brand,
          last4: m.card.last4,
          expMonth: m.card.exp_month,
          expYear: m.card.exp_year,
        }
      : undefined,
  }));
}

/**
 * Retrieve a single payment method from Stripe by ID
 */
export async function retrievePaymentMethod(paymentMethodId: string): Promise<{
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  billingName?: string;
  billingZip?: string;
}> {
  if (MOCK_STRIPE) {
    return {
      id: paymentMethodId,
      type: "card",
      card: { brand: "visa", last4: "4242", expMonth: 12, expYear: 2030 },
      billingName: "Mock User",
    };
  }

  const s = getStripe();
  const pm = await s.paymentMethods.retrieve(paymentMethodId);

  return {
    id: pm.id,
    type: pm.type,
    card: pm.card
      ? {
          brand: pm.card.brand,
          last4: pm.card.last4,
          expMonth: pm.card.exp_month,
          expYear: pm.card.exp_year,
        }
      : undefined,
    billingName: pm.billing_details?.name || undefined,
    billingZip: pm.billing_details?.address?.postal_code || undefined,
  };
}

/**
 * Detach (remover) payment method do customer
 */
export async function detachPaymentMethod(
  paymentMethodId: string,
): Promise<void> {
  if (MOCK_STRIPE) return;

  const s = getStripe();
  await s.paymentMethods.detach(paymentMethodId);
  logger.info(`PaymentMethod detached: ${paymentMethodId}`);
}

// ============================================
// REFUNDS
// ============================================

/**
 * Criar reembolso
 */
export async function createRefund(params: {
  paymentIntentId: string;
  amount?: number; // centavos, se parcial
  reason?: "duplicate" | "fraudulent" | "requested_by_customer";
}): Promise<{
  refundId: string;
  status: string;
  amount: number;
}> {
  if (MOCK_STRIPE) {
    return {
      refundId: `mock_re_${Date.now()}`,
      status: "succeeded",
      amount: params.amount || 0,
    };
  }

  const s = getStripe();

  const refundParams: Stripe.RefundCreateParams = {
    payment_intent: params.paymentIntentId,
  };

  if (params.amount) {
    refundParams.amount = params.amount;
  }

  if (params.reason) {
    refundParams.reason = params.reason;
  }

  const refund = await s.refunds.create(refundParams);

  logger.info(`Refund criado: ${refund.id} para PI ${params.paymentIntentId}`);

  return {
    refundId: refund.id,
    status: refund.status || "succeeded",
    amount: refund.amount,
  };
}

// ============================================
// STRIPE CONNECT (Providers)
// ============================================

/**
 * Criar Connected Account para provider
 */
export async function createConnectAccount(params: {
  email: string;
  businessName?: string;
  userId: string;
}): Promise<{
  accountId: string;
}> {
  if (MOCK_STRIPE) {
    return {
      accountId: `mock_acct_${params.userId}`,
    };
  }

  const s = getStripe();

  const account = await s.accounts.create({
    type: "express",
    email: params.email,
    business_type: "individual",
    metadata: {
      userId: params.userId,
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_profile: {
      name: params.businessName || undefined,
      mcc: "7538", // Auto repair shops
    },
  });

  logger.info(
    `Stripe Connect Account criado: ${account.id} para user ${params.userId}`,
  );

  return {
    accountId: account.id,
  };
}

/**
 * Gerar link de onboarding para Connected Account
 */
export async function createAccountLink(params: {
  accountId: string;
  refreshUrl: string;
  returnUrl: string;
}): Promise<string> {
  if (MOCK_STRIPE) {
    return `https://mock-stripe-onboarding.com/${params.accountId}`;
  }

  const s = getStripe();

  const accountLink = await s.accountLinks.create({
    account: params.accountId,
    refresh_url: params.refreshUrl,
    return_url: params.returnUrl,
    type: "account_onboarding",
  });

  return accountLink.url;
}

/**
 * Verificar status do Connected Account
 */
export async function getConnectAccountStatus(accountId: string): Promise<{
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirements: string[];
}> {
  if (MOCK_STRIPE) {
    return {
      chargesEnabled: true,
      payoutsEnabled: true,
      detailsSubmitted: true,
      requirements: [],
    };
  }

  const s = getStripe();
  const account = await s.accounts.retrieve(accountId);

  return {
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
    requirements: account.requirements?.currently_due || [],
  };
}

/**
 * Gerar login link para dashboard Express
 */
export async function createLoginLink(accountId: string): Promise<string> {
  if (MOCK_STRIPE) {
    return `https://mock-stripe-dashboard.com/${accountId}`;
  }

  const s = getStripe();
  const loginLink = await s.accounts.createLoginLink(accountId);
  return loginLink.url;
}

// ============================================
// CHECKOUT SESSIONS
// ============================================

/**
 * Create a Stripe Checkout Session for subscription payment.
 * Supports Card, Apple Pay, and Google Pay natively.
 */
export async function createCheckoutSession(params: {
  customerId: string;
  priceId: string;
  userId: string;
  planKey: string;
  successUrl: string;
  cancelUrl: string;
  trialDays?: number;
}): Promise<{
  sessionId: string;
  url: string;
}> {
  if (MOCK_STRIPE) {
    return {
      sessionId: `mock_cs_${Date.now()}`,
      url: params.successUrl,
    };
  }

  const s = getStripe();

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    customer: params.customerId,
    mode: 'subscription',
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    payment_method_collection: 'always',
    // card covers Apple Pay & Google Pay automatically in Checkout Sessions
    payment_method_types: ['card', 'us_bank_account', 'link'],
    payment_method_options: {
      us_bank_account: {
        financial_connections: { permissions: ['payment_method'] },
      },
    },
    metadata: {
      userId: params.userId,
      planKey: params.planKey,
    },
    subscription_data: {
      metadata: {
        userId: params.userId,
        planKey: params.planKey,
      },
    },
    allow_promotion_codes: true,
  };

  if (params.trialDays) {
    sessionParams.subscription_data!.trial_period_days = params.trialDays;
  }

  const session = await s.checkout.sessions.create(sessionParams);

  logger.info(
    `Checkout Session criada: ${session.id} para user ${params.userId} (plan: ${params.planKey})`,
  );

  return {
    sessionId: session.id,
    url: session.url!,
  };
}

/**
 * Create a Checkout Session for a Free-plan vehicle add-on subscription.
 * The add-on is activated locally only after checkout.session.completed.
 */
export async function createVehicleAddOnCheckoutSession(params: {
  customerId: string;
  priceId: string;
  userId: string;
  vehicleId: string;
  plan: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{
  sessionId: string;
  url: string;
}> {
  if (MOCK_STRIPE) {
    return {
      sessionId: `mock_cs_vehicle_addon_${Date.now()}`,
      url: params.successUrl,
    };
  }

  const s = getStripe();

  const session = await s.checkout.sessions.create({
    customer: params.customerId,
    mode: "subscription",
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    payment_method_types: ["card", "us_bank_account", "link"],
    payment_method_options: {
      us_bank_account: {
        financial_connections: { permissions: ["payment_method"] },
      },
    },
    metadata: {
      billingType: "vehicle_addon",
      userId: params.userId,
      vehicleId: params.vehicleId,
      plan: params.plan,
    },
    subscription_data: {
      metadata: {
        billingType: "vehicle_addon",
        userId: params.userId,
        vehicleId: params.vehicleId,
        plan: params.plan,
      },
    },
  });

  logger.info(
    `Vehicle add-on Checkout Session criada: ${session.id} para user ${params.userId}, vehicle ${params.vehicleId}`,
  );

  return {
    sessionId: session.id,
    url: session.url!,
  };
}

/**
 * Create a one-time Checkout Session for small platform fees that are not
 * attached to an existing paid subscription.
 */
export async function createOneTimeCheckoutSession(params: {
  customerId: string;
  amount: number;
  currency?: string;
  name: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}): Promise<{
  sessionId: string;
  url: string;
}> {
  if (MOCK_STRIPE) {
    return {
      sessionId: `mock_cs_fee_${Date.now()}`,
      url: params.successUrl,
    };
  }

  const s = getStripe();
  const session = await s.checkout.sessions.create({
    customer: params.customerId,
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: params.currency || "usd",
          product_data: { name: params.name },
          unit_amount: params.amount,
        },
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      ...params.metadata,
      userId: params.userId,
    },
  });

  logger.info(
    `One-time Checkout Session criada: ${session.id} (${params.name}) para user ${params.userId}`,
  );

  return {
    sessionId: session.id,
    url: session.url!,
  };
}

// ============================================
// SUBSCRIPTIONS
// ============================================

/**
 * Criar assinatura
 */
export async function createSubscription(params: {
  customerId: string; // Stripe Customer ID
  priceId: string; // Stripe Price ID
  trialDays?: number;
  metadata?: Record<string, string>;
}): Promise<{
  subscriptionId: string;
  clientSecret?: string;
  clientSecretType?: "payment" | "setup";
  status: string;
  currentPeriodEnd: Date;
  trialEnd?: Date | null;
}> {
  if (MOCK_STRIPE) {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    const trialEnd = params.trialDays
      ? new Date(now.getTime() + params.trialDays * 24 * 60 * 60 * 1000)
      : null;

    return {
      subscriptionId: `mock_sub_${Date.now()}`,
      clientSecret: `mock_sub_secret_${Date.now()}`,
      clientSecretType: params.trialDays ? "setup" : "payment",
      status: "active",
      currentPeriodEnd: periodEnd,
      trialEnd,
    };
  }

  const s = getStripe();

  const subParams: Stripe.SubscriptionCreateParams = {
    customer: params.customerId,
    items: [{ price: params.priceId }],
    payment_behavior: "default_incomplete",
    payment_settings: {
      save_default_payment_method: "on_subscription",
    },
    expand: ["latest_invoice.payment_intent", "pending_setup_intent"],
    metadata: params.metadata || {},
  };

  if (params.trialDays) {
    subParams.trial_period_days = params.trialDays;
  }

  const subscription = await s.subscriptions.create(subParams);

  const invoice = subscription.latest_invoice as Stripe.Invoice;
  const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent;
  const setupIntent = (subscription as any).pending_setup_intent as Stripe.SetupIntent | null;
  const clientSecret = paymentIntent?.client_secret || setupIntent?.client_secret || undefined;

  logger.info(
    `Subscription criada: ${subscription.id} (${subscription.status})`,
  );

  return {
    subscriptionId: subscription.id,
    clientSecret,
    clientSecretType: setupIntent?.client_secret ? "setup" : paymentIntent?.client_secret ? "payment" : undefined,
    status: subscription.status,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    trialEnd: subscription.trial_end
      ? new Date(subscription.trial_end * 1000)
      : null,
  };
}

/**
 * End a trial immediately. Stripe creates/finalizes the first invoice according
 * to the subscription's saved payment method and billing settings.
 */
export async function endSubscriptionTrialNow(subscriptionId: string): Promise<{
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEnd?: Date | null;
}> {
  if (MOCK_STRIPE) {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    return {
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      trialEnd: null,
    };
  }

  const s = getStripe();
  const sub = await s.subscriptions.update(subscriptionId, {
    trial_end: "now",
    proration_behavior: "none",
  });

  logger.info(`Subscription trial ended now: ${subscriptionId} (${sub.status})`);

  return {
    status: sub.status,
    currentPeriodStart: new Date(sub.current_period_start * 1000),
    currentPeriodEnd: new Date(sub.current_period_end * 1000),
    trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
  };
}

/**
 * Cancelar assinatura
 */
export async function cancelSubscription(params: {
  subscriptionId: string;
  immediately?: boolean;
}): Promise<{
  status: string;
  cancelAt?: Date;
}> {
  if (MOCK_STRIPE) {
    return {
      status: "canceled",
    };
  }

  const s = getStripe();

  if (params.immediately) {
    const sub = await s.subscriptions.cancel(params.subscriptionId);
    return { status: sub.status };
  }

  // Cancelar no fim do período
  const sub = await s.subscriptions.update(params.subscriptionId, {
    cancel_at_period_end: true,
  });

  logger.info(`Subscription cancelada: ${params.subscriptionId}`);

  return {
    status: sub.status,
    cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000) : undefined,
  };
}

/**
 * Alterar plano da assinatura
 */
export async function updateSubscription(params: {
  subscriptionId: string;
  newPriceId: string;
}): Promise<{
  status: string;
  currentPeriodEnd: Date;
}> {
  if (MOCK_STRIPE) {
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    return { status: "active", currentPeriodEnd: periodEnd };
  }

  const s = getStripe();
  const sub = await s.subscriptions.retrieve(params.subscriptionId);

  const updated = await s.subscriptions.update(params.subscriptionId, {
    items: [
      {
        id: sub.items.data[0].id,
        price: params.newPriceId,
      },
    ],
    proration_behavior: "create_prorations",
  });

  logger.info(
    `Subscription atualizada: ${params.subscriptionId} → price ${params.newPriceId}`,
  );

  return {
    status: updated.status,
    currentPeriodEnd: new Date(updated.current_period_end * 1000),
  };
}

// ============================================
// WEBHOOKS
// ============================================

/**
 * Verificar assinatura do webhook
 */
/**
 * Add item to existing subscription (for vehicle add-ons)
 */
export async function addSubscriptionItem(params: {
  subscriptionId: string;
  priceId: string;
  metadata?: Record<string, string>;
}): Promise<{ subscriptionItemId: string }> {
  if (MOCK_STRIPE) {
    return { subscriptionItemId: `mock_si_${Date.now()}` };
  }

  const s = getStripe();
  const item = await s.subscriptionItems.create({
    subscription: params.subscriptionId,
    price: params.priceId,
    metadata: params.metadata || {},
    proration_behavior: "always_invoice",
    payment_behavior: "error_if_incomplete",
  });

  logger.info(`Subscription item adicionado: ${item.id} à subscription ${params.subscriptionId}`);
  return { subscriptionItemId: item.id };
}

/**
 * Add a one-time invoice item to an existing subscription and charge it now.
 */
export async function chargeOneTimeSubscriptionFee(params: {
  customerId: string;
  subscriptionId: string;
  amount: number;
  currency?: string;
  description: string;
  metadata?: Record<string, string>;
}): Promise<{ invoiceId: string; status: string }> {
  if (MOCK_STRIPE) {
    return {
      invoiceId: `mock_in_${Date.now()}`,
      status: "paid",
    };
  }

  const s = getStripe();

  await s.invoiceItems.create({
    customer: params.customerId,
    subscription: params.subscriptionId,
    amount: params.amount,
    currency: params.currency || "usd",
    description: params.description,
    metadata: params.metadata || {},
  });

  const invoice = await s.invoices.create({
    customer: params.customerId,
    subscription: params.subscriptionId,
    collection_method: "charge_automatically",
    metadata: params.metadata || {},
    pending_invoice_items_behavior: "include",
  });

  const finalized = await s.invoices.finalizeInvoice(invoice.id);
  const paid = finalized.status === "paid"
    ? finalized
    : await s.invoices.pay(finalized.id);

  logger.info(
    `One-time subscription fee charged: invoice ${paid.id} (${paid.status})`,
  );

  return {
    invoiceId: paid.id,
    status: paid.status || "unknown",
  };
}

/**
 * Remove item from subscription (for vehicle add-on removal)
 */
export async function removeSubscriptionItem(subscriptionItemId: string): Promise<void> {
  if (MOCK_STRIPE) {
    return;
  }

  const s = getStripe();
  await s.subscriptionItems.del(subscriptionItemId, {
    proration_behavior: 'create_prorations',
  });

  logger.info(`Subscription item removido: ${subscriptionItemId}`);
}

export function constructWebhookEvent(
  payload: Buffer,
  signature: string,
): Stripe.Event {
  const s = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET não configurada");
  }

  return s.webhooks.constructEvent(payload, signature, webhookSecret);
}

export default {
  getOrCreateCustomer,
  createPaymentIntent,
  confirmPaymentIntent,
  capturePaymentIntent,
  retrievePaymentIntent,
  cancelPaymentIntent,
  cancelPaymentIntentIdempotent,
  retrieveSubscription,
  createSetupIntent,
  listPaymentMethods,
  detachPaymentMethod,
  createRefund,
  createConnectAccount,
  createAccountLink,
  getConnectAccountStatus,
  createLoginLink,
  createCheckoutSession,
  createVehicleAddOnCheckoutSession,
  createOneTimeCheckoutSession,
  createSubscription,
  cancelSubscription,
  updateSubscription,
  addSubscriptionItem,
  removeSubscriptionItem,
  chargeOneTimeSubscriptionFee,
  constructWebhookEvent,
};
