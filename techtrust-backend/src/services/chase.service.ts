/**
 * ============================================
 * CHASE PAYMENT SERVICE (Placeholder)
 * ============================================
 * Integração futura com Chase Payment Solutions.
 * Estruturado seguindo a interface IPaymentProcessor
 * para fácil ativação quando as credenciais estiverem disponíveis.
 *
 * Documentação Chase: https://developer.chase.com
 * 
 * Para ativar:
 * 1. Obter credenciais Chase Merchant Services
 * 2. Configurar env vars: CHASE_MERCHANT_ID, CHASE_API_KEY, CHASE_API_SECRET
 * 3. Implementar os métodos abaixo
 * 4. Registrar no payment-processor.interface.ts
 */

import { logger } from '../config/logger';
import {
  IPaymentProcessor,
  PaymentProcessorResult,
  CaptureResult,
  RefundResult,
  registerProcessor,
} from './payment-processor.interface';

const CHASE_ENABLED = process.env.CHASE_ENABLED === 'true';

class ChasePaymentProcessor implements IPaymentProcessor {
  name = 'Chase Payment Solutions';

  private merchantId: string;
  private apiKey: string;

  constructor() {
    this.merchantId = process.env.CHASE_MERCHANT_ID || '';
    this.apiKey = process.env.CHASE_API_KEY || '';

    if (CHASE_ENABLED && (!this.merchantId || !this.apiKey)) {
      logger.warn('⚠️ Chase Payment Solutions habilitado mas credenciais não configuradas');
    }
  }

  private ensureConfigured(): void {
    if (!CHASE_ENABLED) {
      throw new Error('Chase Payment Solutions is not enabled. Set CHASE_ENABLED=true');
    }
    if (!this.merchantId || !this.apiKey) {
      throw new Error('Chase credentials not configured. Set CHASE_MERCHANT_ID and CHASE_API_KEY');
    }
  }

  async getOrCreateCustomer(params: {
    userId: string;
    email: string;
    name: string;
    existingCustomerId?: string | null;
  }): Promise<string> {
    this.ensureConfigured();

    // TODO: Implementar quando credenciais Chase estiverem disponíveis
    // Chase usa "Customer Vault" para armazenar dados do cliente
    //
    // const response = await chaseApi.post('/customers', {
    //   merchant_id: this.merchantId,
    //   email: params.email,
    //   name: params.name,
    //   external_id: params.userId,
    // });
    // return response.data.customer_id;

    logger.info(`[Chase] getOrCreateCustomer placeholder for ${params.userId}`);
    throw new Error('Chase Payment Solutions: Implementation pending');
  }

  async createPaymentHold(params: {
    amount: number;
    currency: string;
    customerId: string;
    paymentMethodId?: string;
    providerAccountId?: string | null;
    platformFeeAmount: number;
    metadata?: Record<string, string>;
    description?: string;
  }): Promise<PaymentProcessorResult> {
    this.ensureConfigured();

    // TODO: Implementar quando credenciais Chase estiverem disponíveis
    // Chase suporta auth-only (pre-authorization) transactions
    //
    // const response = await chaseApi.post('/transactions/authorize', {
    //   merchant_id: this.merchantId,
    //   amount: params.amount,
    //   currency: params.currency,
    //   customer_id: params.customerId,
    //   payment_method: params.paymentMethodId,
    //   capture: false, // auth-only = pre-authorization
    //   metadata: params.metadata,
    //   description: params.description,
    // });
    // return {
    //   paymentIntentId: response.data.transaction_id,
    //   status: 'authorized',
    //   transactionId: response.data.transaction_id,
    // };

    logger.info(`[Chase] createPaymentHold placeholder: $${params.amount / 100}`);
    throw new Error('Chase Payment Solutions: Implementation pending');
  }

  async capturePayment(paymentIntentId: string, _amount?: number): Promise<CaptureResult> {
    this.ensureConfigured();

    // TODO: Implementar quando credenciais Chase estiverem disponíveis
    // Chase capture endpoint
    //
    // const response = await chaseApi.post(`/transactions/${paymentIntentId}/capture`, {
    //   merchant_id: this.merchantId,
    //   amount: amount, // null = captura total
    // });
    // return {
    //   status: 'captured',
    //   transactionId: response.data.transaction_id,
    // };

    logger.info(`[Chase] capturePayment placeholder: ${paymentIntentId}`);
    throw new Error('Chase Payment Solutions: Implementation pending');
  }

  async voidPayment(paymentIntentId: string): Promise<{ status: string }> {
    this.ensureConfigured();

    // TODO: Implementar quando credenciais Chase estiverem disponíveis
    //
    // const response = await chaseApi.post(`/transactions/${paymentIntentId}/void`, {
    //   merchant_id: this.merchantId,
    // });
    // return { status: 'voided' };

    logger.info(`[Chase] voidPayment placeholder: ${paymentIntentId}`);
    throw new Error('Chase Payment Solutions: Implementation pending');
  }

  async getPaymentStatus(paymentIntentId: string): Promise<{
    status: string;
    chargeId?: string;
    amount: number;
  }> {
    this.ensureConfigured();

    // TODO: Implementar quando credenciais Chase estiverem disponíveis

    logger.info(`[Chase] getPaymentStatus placeholder: ${paymentIntentId}`);
    throw new Error('Chase Payment Solutions: Implementation pending');
  }

  async createRefund(params: {
    paymentIntentId: string;
    amount?: number;
    reason?: string;
  }): Promise<RefundResult> {
    this.ensureConfigured();

    // TODO: Implementar quando credenciais Chase estiverem disponíveis
    //
    // const response = await chaseApi.post(`/transactions/${params.paymentIntentId}/refund`, {
    //   merchant_id: this.merchantId,
    //   amount: params.amount,
    //   reason: params.reason,
    // });
    // return {
    //   refundId: response.data.refund_id,
    //   status: 'succeeded',
    //   amount: params.amount || 0,
    // };

    logger.info(`[Chase] createRefund placeholder: ${params.paymentIntentId}`);
    throw new Error('Chase Payment Solutions: Implementation pending');
  }

  supportsCardType(cardType: 'credit' | 'debit'): boolean {
    // Chase suporta tanto crédito quanto débito
    // Com taxas menores para débito
    return ['credit', 'debit'].includes(cardType);
  }
}

// Registrar processador Chase se habilitado
const chaseProcessor = new ChasePaymentProcessor();

if (CHASE_ENABLED) {
  registerProcessor('CHASE', chaseProcessor);
  logger.info('✅ Chase Payment Solutions registered as payment processor');
} else {
  // Registrar mesmo desabilitado, para listar como opção futura
  registerProcessor('CHASE', chaseProcessor);
  logger.info('ℹ️ Chase Payment Solutions registered (disabled - set CHASE_ENABLED=true to activate)');
}

export { chaseProcessor };
export default chaseProcessor;
