/**
 * ============================================
 * PAYMENT SERVICE - Mobile
 * ============================================
 * Integração com backend para pagamentos,
 * métodos de pagamento e assinaturas
 */

import api from './api';

// ============================================
// PAYMENT INTENTS
// ============================================

export interface PaymentBreakdown {
  serviceAmount: number;
  platformFee: number;
  stripeFee: number;
  totalAmount: number;
  providerWillReceive: number;
}

export interface CreatePaymentIntentResponse {
  paymentId: string;
  paymentNumber: string;
  clientSecret: string;
  publishableKey: string;
  totalAmount: number;
  breakdown: PaymentBreakdown;
  existing?: boolean;
}

/**
 * Criar PaymentIntent para uma work order
 */
export async function createPaymentIntent(
  workOrderId: string,
  paymentMethodId?: string
): Promise<CreatePaymentIntentResponse> {
  const { data } = await api.post('/payments/create-intent', {
    workOrderId,
    paymentMethodId,
  });
  return data.data;
}

/**
 * Confirmar pagamento (verificar com Stripe - pré-autorização)
 */
export async function confirmPayment(paymentId: string): Promise<{
  success: boolean;
  message: string;
  stripeStatus?: string;
  status?: string;
}> {
  const { data } = await api.post(`/payments/${paymentId}/confirm`);
  return data;
}

/**
 * Capturar pagamento (converter hold em cobrança real)
 * Chamado após serviço ser concluído
 */
export async function capturePayment(paymentId: string): Promise<{
  success: boolean;
  message: string;
}> {
  const { data } = await api.post(`/payments/${paymentId}/capture`);
  return data;
}

/**
 * Cancelar pré-autorização (liberar hold sem cobrar)
 */
export async function voidPayment(paymentId: string, reason?: string): Promise<{
  success: boolean;
  message: string;
}> {
  const { data } = await api.post(`/payments/${paymentId}/void`, { reason });
  return data;
}

/**
 * Solicitar reembolso
 */
export async function requestRefund(
  paymentId: string,
  reason?: string
): Promise<{ success: boolean; message: string; refundId?: string }> {
  const { data } = await api.post(`/payments/${paymentId}/refund`, { reason });
  return data;
}

/**
 * Criar SetupIntent para salvar cartão de forma segura (PCI)
 */
export async function createSetupIntent(): Promise<{
  clientSecret: string;
  publishableKey: string;
  stripeCustomerId: string;
}> {
  const { data } = await api.post('/payments/setup-intent');
  return data.data;
}

// ============================================
// PAYMENT HISTORY
// ============================================

export interface PaymentRecord {
  id: string;
  paymentNumber: string;
  status: 'PENDING' | 'AUTHORIZED' | 'CAPTURED' | 'REFUNDED' | 'FAILED' | 'CANCELLED';
  subtotal: number;
  platformFee: number;
  stripeFee: number;
  totalAmount: number;
  providerAmount: number;
  refundAmount: number | null;
  createdAt: string;
  capturedAt: string | null;
  workOrder: {
    orderNumber: string;
    serviceRequest: {
      title: string;
      vehicle: {
        plateNumber: string;
        make: string;
        model: string;
      };
    };
  };
}

export interface PaymentHistoryResponse {
  data: PaymentRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * Obter histórico de pagamentos
 */
export async function getPaymentHistory(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<PaymentHistoryResponse> {
  const { data } = await api.get('/payments/history', { params });
  return data;
}

// ============================================
// PAYMENT METHODS
// ============================================

export interface PaymentMethod {
  id: string;
  type: 'credit' | 'debit' | 'pix';
  cardBrand: string | null;
  cardLast4: string | null;
  cardExpMonth: number | null;
  cardExpYear: number | null;
  holderName: string | null;
  pixKey: string | null;
  isDefault: boolean;
  createdAt: string;
}

/**
 * Listar métodos de pagamento
 */
export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  const { data } = await api.get('/payment-methods');
  return data.data;
}

/**
 * Adicionar método de pagamento
 */
export async function addPaymentMethod(method: {
  type: 'credit' | 'debit' | 'pix';
  cardBrand?: string;
  cardLast4?: string;
  cardExpMonth?: string;
  cardExpYear?: string;
  holderName?: string;
  pixKey?: string;
}): Promise<PaymentMethod> {
  const { data } = await api.post('/payment-methods', method);
  return data.data;
}

/**
 * Definir método como padrão
 */
export async function setDefaultPaymentMethod(id: string): Promise<void> {
  await api.patch(`/payment-methods/${id}/default`);
}

/**
 * Remover método de pagamento
 */
export async function removePaymentMethod(id: string): Promise<void> {
  await api.delete(`/payment-methods/${id}`);
}

// ============================================
// SUBSCRIPTIONS
// ============================================

export interface SubscriptionInfo {
  id: string;
  plan: 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
  price: number;
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED';
  maxVehicles: number;
  maxServiceRequestsPerMonth: number | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  features: string[];
  templateName: string;
  templateDescription: string | null;
}

export interface SubscriptionPlan {
  id: string;
  planKey: string;
  name: string;
  description: string | null;
  monthlyPrice: number;
  yearlyPrice: number;
  vehicleLimit: number;
  serviceRequestsPerMonth: number | null;
  features: string[];
  isFeatured: boolean;
}

/**
 * Obter assinatura atual
 */
export async function getMySubscription(): Promise<SubscriptionInfo> {
  const { data } = await api.get('/subscriptions/me');
  return data.data;
}

/**
 * Listar planos disponíveis
 */
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const { data } = await api.get('/subscriptions/plans');
  return data.data;
}

/**
 * Assinar/upgrade plano
 */
export async function subscribe(
  planKey: string,
  billingPeriod: 'monthly' | 'yearly' = 'monthly'
): Promise<{
  subscriptionId: string;
  clientSecret?: string;
  plan: string;
  message: string;
}> {
  const { data } = await api.post('/subscriptions/subscribe', {
    planKey,
    billingPeriod,
  });
  return { ...data.data, message: data.message };
}

/**
 * Cancelar assinatura
 */
export async function cancelSubscription(
  immediately: boolean = false,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  const { data } = await api.post('/subscriptions/cancel', {
    immediately,
    reason,
  });
  return data;
}

/**
 * Verificar uso da assinatura
 */
export async function getSubscriptionUsage(): Promise<{
  plan: string;
  vehicles: { used: number; limit: number };
  serviceRequests: { used: number; limit: number | null; unlimited: boolean };
  period: { start: string; end: string };
}> {
  const { data } = await api.get('/subscriptions/usage');
  return data.data;
}

// ============================================
// STRIPE CONNECT (Provider)
// ============================================

/**
 * Iniciar onboarding do Stripe Connect
 */
export async function startConnectOnboarding(): Promise<{
  onboardingUrl: string;
  accountId: string;
}> {
  const { data } = await api.post('/connect/onboard');
  return data.data;
}

/**
 * Verificar status do Connect
 */
export async function getConnectStatus(): Promise<{
  hasAccount: boolean;
  accountId?: string;
  onboardingCompleted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirements: string[];
}> {
  const { data } = await api.get('/connect/status');
  return data.data;
}

/**
 * Obter link do dashboard Stripe Express
 */
export async function getConnectDashboard(): Promise<{ dashboardUrl: string }> {
  const { data } = await api.get('/connect/dashboard');
  return data.data;
}

/**
 * Obter saldo do provider
 */
export async function getProviderBalance(): Promise<{
  available: number;
  pending: number;
  currency: string;
}> {
  const { data } = await api.get('/connect/balance');
  return data.data;
}

export default {
  // Payments
  createPaymentIntent,
  confirmPayment,
  capturePayment,
  voidPayment,
  requestRefund,
  createSetupIntent,
  // History
  getPaymentHistory,
  // Payment Methods
  getPaymentMethods,
  addPaymentMethod,
  setDefaultPaymentMethod,
  removePaymentMethod,
  // Subscriptions
  getMySubscription,
  getSubscriptionPlans,
  subscribe,
  cancelSubscription,
  getSubscriptionUsage,
  // Connect
  startConnectOnboarding,
  getConnectStatus,
  getConnectDashboard,
  getProviderBalance,
};
