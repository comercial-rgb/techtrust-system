/**
 * ============================================
 * STRIPE SERVICE - Serviço centralizado
 * ============================================
 * Gerenciamento de pagamentos, assinaturas,
 * Connect e webhooks via Stripe API
 */

import Stripe from 'stripe';
import { logger } from '../config/logger';

// ============================================
// INICIALIZAÇÃO
// ============================================

const MOCK_STRIPE = process.env.MOCK_STRIPE === 'true';

let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY não configurada');
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia' as any,
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
      logger.warn(`Stripe Customer ${params.existingStripeCustomerId} não encontrado, criando novo`);
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

  logger.info(`Stripe Customer criado: ${customer.id} para user ${params.userId}`);
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
  captureMethod?: 'automatic' | 'manual'; // manual = pré-autorização
}

/**
 * Criar PaymentIntent (com ou sem Stripe Connect)
 */
export async function createPaymentIntent(
  params: CreatePaymentIntentParams
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
      status: 'requires_payment_method',
    };
  }

  const s = getStripe();

  const intentParams: Stripe.PaymentIntentCreateParams = {
    amount: params.amount,
    currency: params.currency || 'usd',
    customer: params.customerId,
    description: params.description,
    metadata: params.metadata || {},
    capture_method: params.captureMethod || 'manual', // Pré-autorização por padrão
    automatic_payment_methods: {
      enabled: true,
    },
  };

  // Se tem payment method, anexar
  if (params.paymentMethodId) {
    intentParams.payment_method = params.paymentMethodId;
  }

  // Se Connect (tem provider), usar transfer_data
  if (params.providerStripeAccountId) {
    intentParams.application_fee_amount = params.platformFeeAmount;
    intentParams.transfer_data = {
      destination: params.providerStripeAccountId,
    };
  }

  const paymentIntent = await s.paymentIntents.create(intentParams);

  logger.info(`PaymentIntent criado: ${paymentIntent.id} (${paymentIntent.status})`);

  return {
    paymentIntentId: paymentIntent.id,
    clientSecret: paymentIntent.client_secret!,
    status: paymentIntent.status,
  };
}

/**
 * Confirmar PaymentIntent (server-side) — verifica status
 */
export async function confirmPaymentIntent(paymentIntentId: string): Promise<{
  status: string;
  chargeId?: string;
}> {
  if (MOCK_STRIPE) {
    return {
      status: 'requires_capture',
      chargeId: `mock_ch_${Date.now()}`,
    };
  }

  const s = getStripe();
  const intent = await s.paymentIntents.retrieve(paymentIntentId);

  return {
    status: intent.status,
    chargeId: typeof intent.latest_charge === 'string' ? intent.latest_charge : intent.latest_charge?.id,
  };
}

/**
 * Capturar PaymentIntent pré-autorizado
 * Converte o hold em cobrança real
 */
export async function capturePaymentIntent(paymentIntentId: string, amountToCapture?: number): Promise<{
  status: string;
  chargeId?: string;
}> {
  if (MOCK_STRIPE) {
    return {
      status: 'succeeded',
      chargeId: `mock_ch_${Date.now()}`,
    };
  }

  const s = getStripe();
  const captureParams: Stripe.PaymentIntentCaptureParams = {};
  if (amountToCapture) {
    captureParams.amount_to_capture = amountToCapture;
  }

  const intent = await s.paymentIntents.capture(paymentIntentId, captureParams);

  logger.info(`PaymentIntent capturado: ${intent.id} (${intent.status})`);

  return {
    status: intent.status,
    chargeId: typeof intent.latest_charge === 'string' ? intent.latest_charge : intent.latest_charge?.id,
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
      status: 'succeeded',
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
    chargeId: typeof intent.latest_charge === 'string' ? intent.latest_charge : intent.latest_charge?.id,
  };
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
    type: 'card',
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
      type: 'card',
      card: { brand: 'visa', last4: '4242', expMonth: 12, expYear: 2030 },
      billingName: 'Mock User',
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
export async function detachPaymentMethod(paymentMethodId: string): Promise<void> {
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
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
}): Promise<{
  refundId: string;
  status: string;
  amount: number;
}> {
  if (MOCK_STRIPE) {
    return {
      refundId: `mock_re_${Date.now()}`,
      status: 'succeeded',
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
    status: refund.status || 'succeeded',
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
    type: 'express',
    email: params.email,
    business_type: 'individual',
    metadata: {
      userId: params.userId,
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_profile: {
      name: params.businessName || undefined,
      mcc: '7538', // Auto repair shops
    },
  });

  logger.info(`Stripe Connect Account criado: ${account.id} para user ${params.userId}`);

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
    type: 'account_onboarding',
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
  status: string;
  currentPeriodEnd: Date;
}> {
  if (MOCK_STRIPE) {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    return {
      subscriptionId: `mock_sub_${Date.now()}`,
      clientSecret: `mock_sub_secret_${Date.now()}`,
      status: 'active',
      currentPeriodEnd: periodEnd,
    };
  }

  const s = getStripe();

  const subParams: Stripe.SubscriptionCreateParams = {
    customer: params.customerId,
    items: [{ price: params.priceId }],
    payment_behavior: 'default_incomplete',
    payment_settings: {
      save_default_payment_method: 'on_subscription',
    },
    expand: ['latest_invoice.payment_intent'],
    metadata: params.metadata || {},
  };

  if (params.trialDays) {
    subParams.trial_period_days = params.trialDays;
  }

  const subscription = await s.subscriptions.create(subParams);

  const invoice = subscription.latest_invoice as Stripe.Invoice;
  const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent;

  logger.info(`Subscription criada: ${subscription.id} (${subscription.status})`);

  return {
    subscriptionId: subscription.id,
    clientSecret: paymentIntent?.client_secret || undefined,
    status: subscription.status,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
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
      status: 'canceled',
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
    return { status: 'active', currentPeriodEnd: periodEnd };
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
    proration_behavior: 'create_prorations',
  });

  logger.info(`Subscription atualizada: ${params.subscriptionId} → price ${params.newPriceId}`);

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
export function constructWebhookEvent(
  payload: Buffer,
  signature: string
): Stripe.Event {
  const s = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET não configurada');
  }

  return s.webhooks.constructEvent(payload, signature, webhookSecret);
}

export default {
  getOrCreateCustomer,
  createPaymentIntent,
  confirmPaymentIntent,
  capturePaymentIntent,
  retrievePaymentIntent,
  createSetupIntent,
  listPaymentMethods,
  detachPaymentMethod,
  createRefund,
  createConnectAccount,
  createAccountLink,
  getConnectAccountStatus,
  createLoginLink,
  createSubscription,
  cancelSubscription,
  updateSubscription,
  constructWebhookEvent,
};
