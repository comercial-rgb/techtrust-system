/**
 * ============================================
 * BUSINESS RULES - Regras de Negócio Centralizadas
 * ============================================
 * Todas as regras de pagamento, cancelamento, taxas e fluxos
 * em um único lugar para fácil manutenção.
 */

export const PAYMENT_RULES = {
  /** Modelo de pagamento: pré-autorização (hold no cartão) */
  PAYMENT_MODEL: 'PRE_AUTHORIZATION' as const,

  /** Taxa da plataforma em percentual */
  PLATFORM_FEE_PERCENT: 10,

  /** Dias para payout ao fornecedor */
  PROVIDER_PAYOUT_DAYS: 2,

  /** Valor mínimo de saque para fornecedores */
  MIN_WITHDRAWAL_AMOUNT: 50.00,

  /** Moeda padrão */
  CURRENCY: 'usd' as const,

  /** Stripe: hold expira em 7 dias por padrão */
  HOLD_EXPIRY_DAYS: 7,
};

export const PROCESSOR_FEES = {
  STRIPE: {
    name: 'Stripe',
    /** Taxa percentual Stripe */
    PERCENTAGE: 2.9,
    /** Taxa fixa Stripe por transação */
    FIXED_CENTS: 30,
    /** Descrição para o cliente */
    description: 'Standard card processing',
    /** Processadores de cartão aceitos */
    supportedCardTypes: ['credit', 'debit'] as const,
    /** Tempo de processamento */
    processingTime: 'Instant',
  },
  CHASE: {
    name: 'Chase Payment Solutions',
    /** Taxa percentual Chase (geralmente menor para débito) */
    PERCENTAGE_CREDIT: 2.6,
    PERCENTAGE_DEBIT: 1.5,
    /** Taxa fixa Chase */
    FIXED_CENTS: 10,
    /** Descrição para o cliente */
    description: 'Lower fees for debit cards',
    /** Processadores de cartão aceitos */
    supportedCardTypes: ['credit', 'debit'] as const,
    /** Tempo de processamento */
    processingTime: '1-2 business days',
  },
};

export const CANCELLATION_RULES = {
  /** Antes do fornecedor aceitar: sem taxa */
  BEFORE_ACCEPTANCE_FEE_PERCENT: 0,
  /** Após aceitar, mais de 24h: 10% */
  AFTER_ACCEPTANCE_OVER_24H_FEE_PERCENT: 10,
  /** Após aceitar, menos de 24h: 25% */
  AFTER_ACCEPTANCE_UNDER_24H_FEE_PERCENT: 25,
  /** Após início do serviço: requer validação do fornecedor */
  AFTER_SERVICE_START: 'REQUIRES_PROVIDER_VALIDATION' as const,
  /** Tempo mínimo para o fornecedor validar cancelamento (horas) */
  PROVIDER_VALIDATION_TIMEOUT_HOURS: 24,
};

export const REFUND_RULES = {
  /** Janela de reembolso em horas após captura */
  REFUND_WINDOW_HOURS: 48,
  /** Bônus de crédito se escolher crédito na plataforma ao invés de reembolso */
  CREDIT_BONUS_PERCENT: 10,
};

export const SUPPLEMENT_RULES = {
  /** Notificação ao cliente quando suplemento solicitado */
  NOTIFY_CUSTOMER: true,
  /** Tempo limite para cliente responder (horas) */
  CUSTOMER_RESPONSE_TIMEOUT_HOURS: 24,
  /** Se cliente não responder, prosseguir com orçamento original */
  DEFAULT_ACTION_ON_TIMEOUT: 'PROCEED_WITH_ORIGINAL' as const,
};

export const SERVICE_FLOW = {
  /** Statuses do WorkOrder */
  STATUSES: {
    PENDING_START: 'PENDING_START',
    PAYMENT_HOLD: 'PAYMENT_HOLD',
    IN_PROGRESS: 'IN_PROGRESS',
    SUPPLEMENT_REQUESTED: 'SUPPLEMENT_REQUESTED',
    AWAITING_APPROVAL: 'AWAITING_APPROVAL',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    DISPUTED: 'DISPUTED',
  } as const,

  /** Fotos obrigatórias quando cliente ausente */
  REQUIRE_PHOTOS_WHEN_ABSENT: true,
  /** Mínimo de fotos para finalizar (cliente ausente) */
  MIN_COMPLETION_PHOTOS: 3,

  /** Termos legais que o cliente precisa aceitar */
  LEGAL_TERMS: {
    /** Termo de aceite do serviço */
    SERVICE_ACCEPTANCE: 'service_acceptance',
    /** Disclaimer contra fraude bancária */
    FRAUD_DISCLAIMER: 'fraud_disclaimer',
    /** Política de cancelamento */
    CANCELLATION_POLICY: 'cancellation_policy',
  } as const,
};

/**
 * Calcula a taxa do processador para o valor dado
 */
export function calculateProcessorFee(
  amount: number,
  processor: 'STRIPE' | 'CHASE',
  cardType: 'credit' | 'debit' = 'credit'
): { feeAmount: number; feePercent: number; feeFixed: number } {
  if (processor === 'STRIPE') {
    const feePercent = PROCESSOR_FEES.STRIPE.PERCENTAGE;
    const feeFixed = PROCESSOR_FEES.STRIPE.FIXED_CENTS / 100;
    const feeAmount = (amount * feePercent) / 100 + feeFixed;
    return { feeAmount: Math.round(feeAmount * 100) / 100, feePercent, feeFixed };
  }

  // Chase
  const feePercent = cardType === 'debit'
    ? PROCESSOR_FEES.CHASE.PERCENTAGE_DEBIT
    : PROCESSOR_FEES.CHASE.PERCENTAGE_CREDIT;
  const feeFixed = PROCESSOR_FEES.CHASE.FIXED_CENTS / 100;
  const feeAmount = (amount * feePercent) / 100 + feeFixed;
  return { feeAmount: Math.round(feeAmount * 100) / 100, feePercent, feeFixed };
}

/**
 * Calcula a taxa de cancelamento baseada no estado do serviço
 */
export function calculateCancellationFee(
  totalAmount: number,
  serviceStarted: boolean,
  quoteAcceptedAt: Date | null,
): { feePercent: number; feeAmount: number } {
  // Antes de aceitar: sem taxa
  if (!quoteAcceptedAt) {
    return { feePercent: 0, feeAmount: 0 };
  }

  // Após início: requer validação do fornecedor
  if (serviceStarted) {
    return { feePercent: -1, feeAmount: -1 }; // -1 indica requer validação
  }

  const hoursSinceAcceptance = (Date.now() - quoteAcceptedAt.getTime()) / (1000 * 60 * 60);

  if (hoursSinceAcceptance > 24) {
    const feePercent = CANCELLATION_RULES.AFTER_ACCEPTANCE_OVER_24H_FEE_PERCENT;
    return { feePercent, feeAmount: (totalAmount * feePercent) / 100 };
  }

  const feePercent = CANCELLATION_RULES.AFTER_ACCEPTANCE_UNDER_24H_FEE_PERCENT;
  return { feePercent, feeAmount: (totalAmount * feePercent) / 100 };
}

/**
 * Compara as taxas dos processadores para um determinado valor
 * Retorno: recomendação com breakdown
 */
export function compareProcessorFees(amount: number, cardType: 'credit' | 'debit' = 'credit') {
  const stripeFee = calculateProcessorFee(amount, 'STRIPE', cardType);
  const chaseFee = calculateProcessorFee(amount, 'CHASE', cardType);

  const stripeTotal = amount + (amount * PAYMENT_RULES.PLATFORM_FEE_PERCENT / 100) + stripeFee.feeAmount;
  const chaseTotal = amount + (amount * PAYMENT_RULES.PLATFORM_FEE_PERCENT / 100) + chaseFee.feeAmount;

  const recommended = stripeTotal <= chaseTotal ? 'STRIPE' : 'CHASE';
  const savings = Math.abs(stripeTotal - chaseTotal);

  return {
    stripe: {
      processingFee: stripeFee.feeAmount,
      platformFee: Math.round((amount * PAYMENT_RULES.PLATFORM_FEE_PERCENT / 100) * 100) / 100,
      totalAmount: Math.round(stripeTotal * 100) / 100,
      processingTime: PROCESSOR_FEES.STRIPE.processingTime,
    },
    chase: {
      processingFee: chaseFee.feeAmount,
      platformFee: Math.round((amount * PAYMENT_RULES.PLATFORM_FEE_PERCENT / 100) * 100) / 100,
      totalAmount: Math.round(chaseTotal * 100) / 100,
      processingTime: PROCESSOR_FEES.CHASE.processingTime,
    },
    recommended,
    savings: Math.round(savings * 100) / 100,
    savingsDescription: savings > 0
      ? `Save $${savings.toFixed(2)} with ${recommended}`
      : 'Same cost with both processors',
  };
}

export default {
  PAYMENT_RULES,
  PROCESSOR_FEES,
  CANCELLATION_RULES,
  REFUND_RULES,
  SUPPLEMENT_RULES,
  SERVICE_FLOW,
  calculateProcessorFee,
  calculateCancellationFee,
  compareProcessorFees,
};
