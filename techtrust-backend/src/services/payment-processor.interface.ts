/**
 * ============================================
 * PAYMENT PROCESSOR INTERFACE
 * ============================================
 * Abstração para suportar múltiplos processadores de pagamento
 * (Stripe, Chase, etc.)
 */

export interface PaymentProcessorResult {
  paymentIntentId: string;
  clientSecret?: string;
  status: string;
  chargeId?: string;
  transactionId?: string;
}

export interface CaptureResult {
  status: string;
  chargeId?: string;
  transactionId?: string;
}

export interface RefundResult {
  refundId: string;
  status: string;
  amount: number;
}

export interface CustomerResult {
  customerId: string;
}

export interface ProcessorFeeBreakdown {
  processingFee: number;
  platformFee: number;
  totalAmount: number;
  processingTime: string;
}

export interface IPaymentProcessor {
  /** Nome do processador */
  name: string;

  /** Criar ou recuperar cliente no processador */
  getOrCreateCustomer(params: {
    userId: string;
    email: string;
    name: string;
    existingCustomerId?: string | null;
  }): Promise<string>;

  /** Criar pré-autorização (hold) no cartão */
  createPaymentHold(params: {
    amount: number;
    currency: string;
    customerId: string;
    paymentMethodId?: string;
    providerAccountId?: string | null;
    platformFeeAmount: number;
    metadata?: Record<string, string>;
    description?: string;
  }): Promise<PaymentProcessorResult>;

  /** Capturar pagamento pré-autorizado */
  capturePayment(paymentIntentId: string, amount?: number): Promise<CaptureResult>;

  /** Cancelar/voar pré-autorização */
  voidPayment(paymentIntentId: string): Promise<{ status: string }>;

  /** Confirmar status do pagamento */
  getPaymentStatus(paymentIntentId: string): Promise<{
    status: string;
    chargeId?: string;
    amount: number;
  }>;

  /** Processar reembolso */
  createRefund(params: {
    paymentIntentId: string;
    amount?: number;
    reason?: string;
  }): Promise<RefundResult>;

  /** Verificar se o processador suporta o tipo de cartão */
  supportsCardType(cardType: 'credit' | 'debit'): boolean;

  /** Verificar webhook signature */
  verifyWebhookSignature?(payload: Buffer, signature: string): any;
}

/**
 * Registry de processadores de pagamento
 */
const processors: Map<string, IPaymentProcessor> = new Map();

export function registerProcessor(name: string, processor: IPaymentProcessor): void {
  processors.set(name.toUpperCase(), processor);
}

export function getProcessor(name: string): IPaymentProcessor {
  const processor = processors.get(name.toUpperCase());
  if (!processor) {
    throw new Error(`Payment processor '${name}' not registered. Available: ${Array.from(processors.keys()).join(', ')}`);
  }
  return processor;
}

export function getAvailableProcessors(): string[] {
  return Array.from(processors.keys());
}

export default {
  registerProcessor,
  getProcessor,
  getAvailableProcessors,
};
