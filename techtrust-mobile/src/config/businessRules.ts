/**
 * TechTrust - Business Rules Configuration
 * 
 * Este arquivo centraliza todas as regras de negócio do aplicativo.
 * Facilita a manutenção e alteração de parâmetros sem mexer no código.
 * 
 * IMPORTANTE: Valores podem ser sobrescritos por configurações do backend.
 */

// ============================================
// 4. PEDIDOS (SERVICE REQUESTS)
// ============================================

export const REQUEST_RULES = {
  /**
   * 4.2 Tempo de Expiração do Pedido
   * Pedido expira se não receber nenhum orçamento
   */
  EXPIRATION_HOURS: 48, // horas (48h escolhido)
  
  /**
   * 4.3 Raio de Busca de Fornecedores
   * Em quilômetros
   */
  SEARCH_RADIUS: {
    INITIAL_KM: 50,      // Raio inicial: 50 km (ajustado)
    EXPANDED_KM: 75,     // Raio expandido: 75 km
    MAXIMUM_KM: 100,     // Raio máximo: 100 km (ajustado)
    MIN_PROVIDERS: 5,    // Mínimo de fornecedores desejados
  },
  
  /**
   * Conversão para milhas (se necessário)
   */
  SEARCH_RADIUS_MILES: {
    INITIAL: 31,   // ~50 km
    EXPANDED: 47,  // ~75 km
    MAXIMUM: 62,   // ~100 km
  },
};

// ============================================
// 5. ORÇAMENTOS (QUOTES)
// ============================================

export const QUOTE_RULES = {
  /**
   * 5.1 Tempo para Fornecedor Responder
   * Após esse tempo, pedido é oferecido para próximos fornecedores
   */
  RESPONSE_TIMEOUT_HOURS: 48, // horas (48h escolhido)
  
  /**
   * 5.2 Quantidade Máxima de Orçamentos
   * Cliente recebe até este número de orçamentos por pedido
   */
  MAX_QUOTES_PER_REQUEST: 5,
  
  /**
   * Cliente pode escolher receber menos
   */
  MIN_QUOTES_OPTION: 3,
  
  /**
   * 5.3 Validade do Orçamento
   * Após esse tempo, status muda para EXPIRED
   */
  VALIDITY_HOURS: 72, // horas (72h escolhido)
  
  /**
   * Fornecedor pode renovar orçamento (atualizar preço)
   */
  ALLOW_RENEWAL: true,
};

// ============================================
// 6. PAGAMENTOS (PAYMENTS)
// ============================================

export const PAYMENT_RULES = {
  /**
   * 6.1 Momento da Cobrança
   * Modelo de pré-autorização (hold no cartão)
   */
  PAYMENT_MODEL: 'PRE_AUTHORIZATION' as const, // 'PRE_AUTHORIZATION' | 'PRE_PAYMENT' | 'POST_PAYMENT'
  
  /**
   * 6.2 Prazo para Fornecedor Receber
   * Dias úteis após cliente aprovar
   */
  PROVIDER_PAYOUT_DAYS: 2, // dias úteis
  
  /**
   * Taxa da plataforma (%)
   */
  PLATFORM_FEE_PERCENT: 10,
  
  /**
   * Valor mínimo para saque
   */
  MIN_WITHDRAWAL_AMOUNT: 50.00,
};

// ============================================
// 7. CANCELAMENTOS (CANCELLATIONS)
// ============================================

export const CANCELLATION_RULES = {
  /**
   * 7.1 Política de Cancelamento
   */
  
  // Antes de aceitar orçamento: GRÁTIS
  BEFORE_ACCEPT_FEE_PERCENT: 0,
  
  // Após aceitar, MAS mais de 24h antes: 10% (escolhido)
  AFTER_ACCEPT_24H_PLUS_FEE_PERCENT: 10,
  
  // Menos de 24h do agendamento: 25% (escolhido)
  LESS_THAN_24H_FEE_PERCENT: 25,
  
  // Limite de horas para taxa reduzida
  REDUCED_FEE_HOURS_THRESHOLD: 24,
  
  // Serviço já iniciado: não pode cancelar
  ALLOW_CANCEL_AFTER_START: false,
  
  /**
   * Penalidade para fornecedor que cancela
   */
  PROVIDER_CANCEL_PENALTY_POINTS: 25,
};

// ============================================
// 9. SISTEMA DE PONTOS DO FORNECEDOR
// ============================================

export const PROVIDER_POINTS_SYSTEM = {
  /**
   * 9.3 Penalidades para Fornecedor
   * Sistema de Pontos (similar Uber)
   */
  
  // Ações Negativas
  NEGATIVE_ACTIONS: {
    NOT_RESPOND_2H: -10,           // Não responder pedido (2h)
    CANCEL_AFTER_ACCEPT: -25,      // Cancelar após aceitar
    LATE_30MIN: -15,               // Chegar atrasado (>30min)
    RATING_BELOW_3: -20,           // Avaliação < 3 estrelas
    CUSTOMER_COMPLAINT: -50,       // Reclamação cliente
  },
  
  // Ações Positivas
  POSITIVE_ACTIONS: {
    COMPLETE_SERVICE: 10,          // Concluir serviço
    RATING_5_STARS: 20,            // Avaliação 5 estrelas
    FAST_RESPONSE_30MIN: 5,        // Responder rápido (<30min)
    EXCELLENT_REVIEW: 25,          // Cliente avaliar como "excelente"
  },
  
  // Consequências
  CONSEQUENCES: {
    WARNING_THRESHOLD: 50,         // < 50 pontos: Aviso
    SUSPENSION_7_DAYS_THRESHOLD: 0, // < 0 pontos: Suspensão 7 dias
    SUSPENSION_30_DAYS: 'REINCIDENCE', // Reincidência: 30 dias
    BAN: 'MULTIPLE_REINCIDENCES',  // Múltiplas reincidências: Banimento
  },
  
  // Pontos iniciais
  INITIAL_POINTS: 100,
};

// ============================================
// 10. AVALIAÇÕES (REVIEWS)
// ============================================

export const REVIEW_RULES = {
  /**
   * 10.1 Obrigatoriedade
   */
  IS_MANDATORY: true,
  
  /**
   * Prazo para avaliar (dias)
   */
  REVIEW_DEADLINE_DAYS: 7,
  
  /**
   * Bloquear novo pedido se não avaliar
   */
  BLOCK_NEW_REQUEST_IF_NOT_REVIEWED: true,
  
  /**
   * 10.2 Visibilidade da Avaliação
   * Fornecedor só vê avaliação após avaliar cliente também
   */
  DOUBLE_BLIND_REVIEW: true,
  
  /**
   * 10.3 Resposta do Fornecedor
   */
  ALLOW_PROVIDER_RESPONSE: true,
  RESPONSE_DEADLINE_DAYS: 30,
  MAX_RESPONSES: 1, // Apenas 1 resposta (não vira debate)
  
  /**
   * Escala de avaliação
   */
  MIN_RATING: 1,
  MAX_RATING: 5,
};

// ============================================
// 11. DISPUTAS E REEMBOLSOS
// ============================================

export const DISPUTE_RULES = {
  /**
   * 11.1 Janela para Contestação
   * Horas após conclusão
   */
  DISPUTE_WINDOW_HOURS: 48, // 48h escolhido
  
  /**
   * 11.2 Processo de Disputa
   */
  PROVIDER_RESPONSE_HOURS: 24, // 24h para fornecedor responder
  ADMIN_DECISION_DAYS: 5, // 5 dias úteis para decisão
  
  /**
   * 11.3 Política de Reembolso
   * Opções disponíveis
   */
  REFUND_OPTIONS: {
    ALLOW_CASH_REFUND: true,      // Reembolso em dinheiro
    ALLOW_CREDIT_REFUND: true,    // Crédito na plataforma
    CREDIT_BONUS_PERCENT: 10,     // Bônus para escolher crédito (110%)
  },
  
  /**
   * Tempo para reembolso em dinheiro (dias)
   */
  CASH_REFUND_DAYS: '5-10',
};

// ============================================
// 12. SOS / GUINCHO (ROADSIDE ASSISTANCE)
// ============================================

export const SOS_RULES = {
  /**
   * 12.1 Precificação
   */
  PRICING: {
    BASE_FEE: 65.00,             // Taxa base ($)
    PER_MILE: 2.50,              // Por milha ($)
    NIGHT_SURCHARGE_PERCENT: 30, // 22h-6h: +30%
    HOLIDAY_SURCHARGE_PERCENT: 50, // Feriado: +50% (ajustado)
    WEEKEND_SURCHARGE_PERCENT: 19, // Fim de semana: +19%
  },
  
  /**
   * Horário noturno
   */
  NIGHT_START_HOUR: 22, // 22:00
  NIGHT_END_HOUR: 6,    // 06:00
  
  /**
   * 12.2 Tempo Máximo de Espera
   */
  MAX_ARRIVAL_MINUTES: 60,
  
  /**
   * Desconto por atraso
   */
  LATE_DISCOUNTS: {
    15: 10,  // 15min atraso = 10% desconto
    30: 20,  // 30min atraso = 20% desconto
    45: 30,  // 45min atraso = 30% desconto
  },
  
  /**
   * Após 60min, cliente pode cancelar sem taxa
   */
  FREE_CANCEL_AFTER_MINUTES: 60,
  
  /**
   * Permitir tracking em tempo real
   */
  ALLOW_REAL_TIME_TRACKING: true,
};

// ============================================
// 13. NOTIFICAÇÕES
// ============================================

export const NOTIFICATION_RULES = {
  /**
   * 13.1 Quando Notificar
   */
  
  // Push Notifications (instantânea)
  PUSH_NOTIFICATIONS: {
    NEW_QUOTE: true,
    QUOTE_ACCEPTED: true,
    SERVICE_STARTED: true,
    SERVICE_COMPLETED: true,
    PAYMENT_PROCESSED: true,
    SOS_ACCEPTED: true,
    NEW_MESSAGE: true,
  },
  
  // Email (resumo/lembretes)
  EMAIL_NOTIFICATIONS: {
    NEW_REQUEST_PROVIDER: true,   // Imediato
    REVIEW_REMINDER_DAYS: 1,      // Lembrete após 1 dia
    WEEKLY_SUMMARY_DAY: 'SUNDAY', // Domingo 9am
    WEEKLY_SUMMARY_HOUR: 9,
    MAINTENANCE_REMINDER_DAYS: 7, // 1 semana antes
  },
  
  // SMS (urgente apenas)
  SMS_NOTIFICATIONS: {
    SOS_ACCEPTED: true,
    OTP_VERIFICATION: true,
    MARKETING: false, // NUNCA marketing por SMS
  },
  
  /**
   * 13.2 Preferências do Usuário
   * Configurações granulares permitidas
   */
  ALLOW_USER_PREFERENCES: true,
  
  USER_CAN_DISABLE: {
    PUSH_ALL: true,
    PUSH_BY_TYPE: true,
    EMAIL_ALL: true,
    EMAIL_BY_TYPE: true,
    SMS_MARKETING: true,
    SMS_OTP: false, // OTP sempre ativo
  },
};

// ============================================
// HELPERS / UTILITIES
// ============================================

/**
 * Calcula taxa de cancelamento baseado no cenário
 */
export function calculateCancellationFee(
  totalAmount: number,
  hoursBeforeService: number,
  serviceStarted: boolean
): { canCancel: boolean; feePercent: number; feeAmount: number } {
  // Serviço já iniciado
  if (serviceStarted) {
    return { canCancel: false, feePercent: 0, feeAmount: 0 };
  }
  
  // Menos de 24h antes
  if (hoursBeforeService < CANCELLATION_RULES.REDUCED_FEE_HOURS_THRESHOLD) {
    const feePercent = CANCELLATION_RULES.LESS_THAN_24H_FEE_PERCENT;
    return {
      canCancel: true,
      feePercent,
      feeAmount: totalAmount * (feePercent / 100),
    };
  }
  
  // Mais de 24h antes
  const feePercent = CANCELLATION_RULES.AFTER_ACCEPT_24H_PLUS_FEE_PERCENT;
  return {
    canCancel: true,
    feePercent,
    feeAmount: totalAmount * (feePercent / 100),
  };
}

/**
 * Calcula preço do SOS/Guincho
 */
export function calculateSOSPrice(
  distanceMiles: number,
  isNight: boolean,
  isHoliday: boolean,
  isWeekend: boolean
): number {
  let price = SOS_RULES.PRICING.BASE_FEE + (distanceMiles * SOS_RULES.PRICING.PER_MILE);
  
  if (isNight) {
    price *= 1 + (SOS_RULES.PRICING.NIGHT_SURCHARGE_PERCENT / 100);
  }
  
  if (isHoliday) {
    price *= 1 + (SOS_RULES.PRICING.HOLIDAY_SURCHARGE_PERCENT / 100);
  } else if (isWeekend) {
    price *= 1 + (SOS_RULES.PRICING.WEEKEND_SURCHARGE_PERCENT / 100);
  }
  
  return Math.round(price * 100) / 100; // Arredondar para 2 casas decimais
}

/**
 * Calcula desconto por atraso do guincho
 */
export function calculateLateDiscount(minutesLate: number): number {
  const thresholds = Object.keys(SOS_RULES.LATE_DISCOUNTS)
    .map(Number)
    .sort((a, b) => b - a);
  
  for (const threshold of thresholds) {
    if (minutesLate >= threshold) {
      return SOS_RULES.LATE_DISCOUNTS[threshold as keyof typeof SOS_RULES.LATE_DISCOUNTS];
    }
  }
  
  return 0;
}

/**
 * Verifica se orçamento ainda é válido
 */
export function isQuoteValid(createdAt: Date): boolean {
  const now = new Date();
  const diffHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  return diffHours <= QUOTE_RULES.VALIDITY_HOURS;
}

/**
 * Verifica se pedido expirou
 */
export function isRequestExpired(createdAt: Date, quotesCount: number): boolean {
  if (quotesCount > 0) return false; // Tem orçamentos, não expira
  
  const now = new Date();
  const diffHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  return diffHours >= REQUEST_RULES.EXPIRATION_HOURS;
}

/**
 * Verifica se está na janela de disputa
 */
export function canOpenDispute(completedAt: Date): boolean {
  const now = new Date();
  const diffHours = (now.getTime() - completedAt.getTime()) / (1000 * 60 * 60);
  return diffHours <= DISPUTE_RULES.DISPUTE_WINDOW_HOURS;
}

/**
 * Calcula bônus de crédito para reembolso
 */
export function calculateCreditRefundBonus(refundAmount: number): number {
  return refundAmount * (1 + DISPUTE_RULES.REFUND_OPTIONS.CREDIT_BONUS_PERCENT / 100);
}

// Export default para facilitar importação
export default {
  REQUEST_RULES,
  QUOTE_RULES,
  PAYMENT_RULES,
  CANCELLATION_RULES,
  PROVIDER_POINTS_SYSTEM,
  REVIEW_RULES,
  DISPUTE_RULES,
  SOS_RULES,
  NOTIFICATION_RULES,
};
