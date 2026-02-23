/**
 * ============================================
 * BUSINESS RULES - Regras de Negócio Centralizadas
 * ============================================
 * FONTE ÚNICA DE VERDADE — não duplicar em controllers.
 *
 * Last updated: 2025-02-22
 * Covers: Plans, Fees, Cancellation, Expiration, Provider Points,
 *         Review Weights, FDACS, Stripe, RFQ, Auto Parts Store
 * ============================================
 */

// ─── SUBSCRIPTION PLANS ─────────────────────────────────────────────────────

export const SUBSCRIPTION_PLANS = {
  FREE: {
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    maxVehicles: 1,
    maxRequestsPerMonth: 3,
    maxActiveSimultaneous: 2,
    features: {
      vinDecode: true,
      nhtsaRecalls: true,
      organicCatalog: true,
      plateDecoder: false,
      ocrScan: false,
      scheduledMaintenance: false,
      warrantyStatus: false,
      marketValue: false,
    },
    appServiceFee: 9.89,
    platformFeeMaxCap: null,   // No cap — full 10% always
    requestExpiration: 'EXPIRES' as const,
    requestExpirationHours: 72,
    renewalFee: 0.99,
    renewalLimit: null,
    requestHighlight: false,
    specialOffers: false,
    prioritySupport: false,
  },
  BASIC: {
    name: 'Basic',
    monthlyPrice: 9.99,
    annualPrice: 99.99,
    maxVehicles: 3,
    maxRequestsPerMonth: 10,
    maxActiveSimultaneous: 6,
    features: {
      vinDecode: true,
      nhtsaRecalls: true,
      organicCatalog: true,
      plateDecoder: false,
      ocrScan: false,
      scheduledMaintenance: true,
      warrantyStatus: false,
      marketValue: false,
    },
    appServiceFee: 4.99,
    platformFeeMaxCap: 300,    // Max $300 platform fee
    requestExpiration: 'EXPIRES' as const,
    requestExpirationHours: 72,
    renewalFee: 0.99,
    renewalLimit: null,
    requestHighlight: false,
    specialOffers: false,
    prioritySupport: false,
  },
  PREMIUM: {
    name: 'Premium (Membership)',
    monthlyPrice: 19.99,
    annualPrice: 199.99,
    maxVehicles: 10,
    maxRequestsPerMonth: null,
    maxActiveSimultaneous: 10,
    features: {
      vinDecode: true,
      nhtsaRecalls: true,
      organicCatalog: true,
      plateDecoder: true,
      ocrScan: true,
      scheduledMaintenance: true,
      warrantyStatus: true,
      marketValue: true,
    },
    appServiceFee: 0,
    platformFeeMaxCap: 150,     // Max $150 platform fee
    requestExpiration: 'NEVER' as const,
    requestExpirationHours: null,
    renewalFee: 0,
    renewalLimit: null,
    requestHighlight: true,
    specialOffers: true,
    prioritySupport: true,
  },
  ENTERPRISE: {
    name: 'Enterprise',
    monthlyPrice: null,
    annualPrice: null,
    maxVehicles: null,
    maxRequestsPerMonth: null,
    maxActiveSimultaneous: null,
    features: {
      vinDecode: true,
      nhtsaRecalls: true,
      organicCatalog: true,
      plateDecoder: true,
      ocrScan: true,
      scheduledMaintenance: true,
      warrantyStatus: true,
      marketValue: true,
    },
    appServiceFee: 0,
    platformFeeMaxCap: 150,
    requestExpiration: 'NEVER' as const,
    requestExpirationHours: null,
    renewalFee: 0,
    renewalLimit: null,
    requestHighlight: true,
    specialOffers: true,
    prioritySupport: true,
  },
} as const;

export type PlanKey = keyof typeof SUBSCRIPTION_PLANS;

// ─── PAYMENT RULES ──────────────────────────────────────────────────────────

export const PAYMENT_RULES = {
  /** Modelo de pagamento: pré-autorização (hold no cartão) */
  PAYMENT_MODEL: 'PRE_AUTHORIZATION' as const,

  /** Taxa da plataforma em percentual — SEMPRE 10%, sem exceção */
  PLATFORM_FEE_PERCENT: 10,

  /**
   * App Service Fee — cobrado do CLIENTE, varia por plano:
   * FREE=$9.89, BASIC=$4.99, PREMIUM/ENTERPRISE=$0.00
   */
  APP_SERVICE_FEE_FREE: 9.89,
  APP_SERVICE_FEE_BASIC: 4.99,
  APP_SERVICE_FEE_PREMIUM: 0.00,

  /** Dias para payout ao fornecedor */
  PROVIDER_PAYOUT_DAYS: 2,

  /** Moeda padrão */
  CURRENCY: 'usd' as const,

  /** Stripe: hold expira em 7 dias por padrão */
  HOLD_EXPIRY_DAYS: 7,

  /**
   * Hold expirado: renova automaticamente sem avisar o cliente
   * (evitar brecha para fraudes)
   */
  HOLD_SILENT_RENEWAL: true,
};

// ─── PROCESSOR FEES ──────────────────────────────────────────────────────────

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

// ─── DIAGNOSTIC FEE ─────────────────────────────────────────────────────────

export const DIAGNOSTIC_FEE_RULES = {
  /** Faixa sugerida ($0-$200), porém NÃO limitar se provider precisar cobrar mais */
  MIN: 0,
  SUGGESTED_MAX: 200,
  DEFAULT: 0,
  /** 100% do diagnostic fee vai para o provider — 0% para plataforma */
  PLATFORM_CUT_PERCENT: 0,
};

// ─── TRAVEL FEE ─────────────────────────────────────────────────────────────

export const TRAVEL_FEE_RULES = {
  /**
   * Provider define seus próprios raios e taxas (override global).
   * Os valores abaixo são DEFAULTS caso provider não configure.
   * UNIDADES: MILHAS (não km).
   * 0% para plataforma — 100% vai pro provider.
   */
  DEFAULT_FREE_MILES: 10,
  DEFAULT_EXTRA_FEE_PER_MILE: 1.50,
  DEFAULT_MAX_FEE: 50.00,
  /** Usar integração com mapas para calcular distância real em milhas */
  USE_MAP_INTEGRATION: true,
};

// ─── REFERRAL FEE ───────────────────────────────────────────────────────────

export const REFERRAL_FEE_RULES = {
  /** DESABILITADO por enquanto conforme definição do usuário */
  ENABLED: false,
  FIXED_FEE_AMOUNT: 20.00,
  MIN_DIAGNOSTIC_FEE_FOR_REFERRAL: 10.00,
  DESCRIPTION: 'Diagnostic referral fee — original provider compensation (DISABLED)',
};

// ─── QUOTE VALIDITY ─────────────────────────────────────────────────────────

export const QUOTE_VALIDITY = {
  /** Validade de quote DIRECT (Florida FDACS: obrigação legal) */
  DIRECT_DAYS: 15,
  /** Validade de quote DIAGNOSTIC */
  DIAGNOSTIC_DAYS: 15,
  /** Validade de quote competitiva (via RFQ) — FDACS Legal */
  COMPETING_DAYS: 15,
  /**
   * Tempo que ServiceRequest aguarda quotes antes de expirar
   * conforme plano: FREE/BASIC=72h renewable, PREMIUM=never
   */
  SERVICE_REQUEST_HOURS_FREE: 72,
  SERVICE_REQUEST_HOURS_BASIC: 72,
  SERVICE_REQUEST_HOURS_PREMIUM: null as number | null,  // Never expires
  /** Prazo para provider submeter quote (48h da criação do request) */
  PROVIDER_SUBMIT_HOURS: 48,
  /** Validade de EstimateShare (RFQ aberto) */
  ESTIMATE_SHARE_DAYS: 30,
  /** Número máximo de quotes por service request */
  MAX_QUOTES_PER_REQUEST: 8,
};

// ─── SERVICE REQUEST RENEWAL ────────────────────────────────────────────────

export const RENEWAL_RULES = {
  /** Taxa de renovação por solicitação (Free/Basic) */
  FEE: 0.99,
  /** Como a taxa é cobrada: junto na próxima fatura do plano */
  BILLING_METHOD: 'NEXT_INVOICE' as const,
  /** Limite de renovações: sem limite */
  MAX_RENEWALS: null as number | null,
};

export const CANCELLATION_RULES = {
  // ── CUSTOMER CANCELLATION ──
  /** Antes de aceitar quote: sem taxa */
  BEFORE_ACCEPTANCE_FEE_PERCENT: 0,
  /** Após aceitar, mais de 24h antes do serviço: 10% */
  AFTER_ACCEPTANCE_OVER_24H_FEE_PERCENT: 10,
  /** Após aceitar, menos de 24h antes do serviço: 25% */
  AFTER_ACCEPTANCE_UNDER_24H_FEE_PERCENT: 25,
  /** Após serviço iniciado: requer disputa */
  AFTER_SERVICE_START: 'REQUIRES_DISPUTE' as const,
  /** Tempo para provider validar cancelamento (horas) */
  PROVIDER_VALIDATION_TIMEOUT_HOURS: 24,

  // ── PROVIDER CANCELLATION ──
  PROVIDER_CANCEL: {
    /** Provider cancela ANTES de iniciar o serviço */
    BEFORE_START: {
      CLIENT_REFUND_PERCENT: 100,
      PROVIDER_POINTS_PENALTY: -15,
      OFFER_REOPEN: true,
    },
    /** Provider cancela DEPOIS de iniciar o serviço */
    AFTER_START: {
      REQUIRES_COST_CONFIRMATION: true,
      MAX_COST_PERCENT_OF_QUOTE: 30,
      REQUIRES_EVIDENCE_PHOTOS: true,
      PROVIDER_POINTS_PENALTY: -25,
    },
    /** Provider No-Show */
    NO_SHOW: {
      PROVIDER_POINTS_PENALTY: -50,
      REQUIRES_REASON: true,
      HOLD_HOURS_FIRST_OFFENSE: 24,
      HOLD_INCREMENT_HOURS: 24,
    },
    NOTIFY_CLIENT_WITH_REASON: true,
    OFFER_REOPEN_TO_CLIENT: true,
  },
};

// ─── PROVIDER POINTS SYSTEM ────────────────────────────────────────────────

export const PROVIDER_POINTS = {
  CANCEL_BEFORE_START: -15,
  CANCEL_AFTER_START: -25,
  NO_SHOW: -50,
  SERVICE_COMPLETED: 10,
  FIVE_STAR_REVIEW: 5,
  GOOD_REVIEW: 3,
  AUTO_SUSPENSION_THRESHOLD: -100,
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
  /** Novo hold deve ser criado para o suplemento */
  REQUIRES_NEW_HOLD: true,
  /** Suplemento deve ser destacado no invoice/repair como aceito pelo cliente */
  HIGHLIGHT_IN_INVOICE: true,
};

export const SERVICE_FLOW = {
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
  MIN_COMPLETION_PHOTOS: 3,

  /**
   * Botão "Iniciar Serviço" — antes de começar qualquer trabalho,
   * provider DEVE inserir fotos do veículo (before photos) para resguardar de danos.
   * Se provider não quiser fotografar, marca checkbox assumindo risco.
   */
  REQUIRE_BEFORE_PHOTOS_ON_START: true,
  PROVIDER_CAN_SKIP_BEFORE_PHOTOS: true,
  BEFORE_PHOTOS_WAIVER_TEXT: 'I acknowledge that by skipping the vehicle condition photos, I assume full responsibility for any damage claims.',

  /**
   * RoadAssist / Towing: fluxo especial
   * - Marcar se cliente está no local
   * - Cliente consente remoção do veículo (obrigatório)
   * - Indicar guinchos cadastrados na plataforma
   */
  ROADASSIST_REQUIRES_CLIENT_LOCATION: true,
  ROADASSIST_REQUIRES_TOWING_CONSENT: true,
  ROADASSIST_SUGGEST_TOWING_PROVIDERS: true,

  /** Termos legais que o cliente precisa aceitar */
  LEGAL_TERMS: {
    SERVICE_ACCEPTANCE: 'service_acceptance',
    FRAUD_DISCLAIMER: 'fraud_disclaimer',
    CANCELLATION_POLICY: 'cancellation_policy',
  } as const,

  /** Garantia de peças e serviços: responsabilidade do PROVIDER, não da plataforma */
  WARRANTY_RESPONSIBILITY: 'PROVIDER' as const,
  WARRANTY_DISCLAIMER: 'Parts and service warranties are the sole responsibility of the service provider. TechTrust AutoSolutions LLC acts as a marketplace facilitator and does not provide any warranties on parts or services.',
};

// ─── FDACS COMPLIANCE ───────────────────────────────────────────────────────

export const FDACS_RULES = {
  /** Tire disposal fee: $1.00 per new tire (FS 403.718) */
  TIRE_FEE_PER_UNIT: 1.00,
  TIRE_FEE_STATUTE: 'FDACS FS 403.718',
  /** Battery fee: $1.50 per new/reconditioned battery (FS 403.7185) */
  BATTERY_FEE_PER_UNIT: 1.50,
  BATTERY_FEE_STATUTE: 'FDACS FS 403.7185',
  /** Written Estimate obrigatório */
  WRITTEN_ESTIMATE_REQUIRED: true,
  /** Leitura do hodômetro: obrigatório em diagnósticos */
  ODOMETER_REQUIRED_DIAGNOSTIC: true,
  ODOMETER_REQUIRED_DIRECT: false,
  /** Data prevista de conclusão */
  COMPLETION_DATE_REQUIRED: true,
  /** Garantia com tempo E milhagem */
  WARRANTY_TIME_AND_MILEAGE_REQUIRED: true,
  /** Mostrar FDACS fees claramente ao cliente E fornecedor */
  DISPLAY_FEES_TO_CLIENT: true,
  DISPLAY_FEES_TO_PROVIDER: true,
};

// ─── EXPIRATION RULES ───────────────────────────────────────────────────────

export const EXPIRATION_RULES = {
  QUOTE_DIRECT_DAYS: 15,
  QUOTE_DIAGNOSTIC_DAYS: 15,
  QUOTE_COMPETING_DAYS: 15,
  PROVIDER_QUOTE_DEADLINE_HOURS: 48,
  ESTIMATE_SHARE_DAYS: 30,
  PAYMENT_HOLD_DAYS: 7,
  SUPPLEMENT_RESPONSE_HOURS: 24,
  AUTO_CHECK_INTERVAL_MINUTES: 60,
  COMPLIANCE_CHECK_INTERVAL_HOURS: 6,
};

// ─── ESTIMATE SHARE / RFQ ───────────────────────────────────────────────────

export const ESTIMATE_SHARE_RULES = {
  VALIDITY_DAYS: 30,
  TYPES: ['PUBLIC', 'SPECIFIC'] as const,
  MAX_QUOTES_PER_PROVIDER: 1,
  BLOCK_SELF_QUOTE: true,
  SHOW_ORIGINAL_AS_BASELINE: true,
  ALLOW_REDACT_PROVIDER_NAME: true,
  REFERRAL_FEE_ENABLED: false,
  REFERRAL_FEE_AMOUNT: 20.00,
  REFERRAL_MIN_DIAGNOSTIC_FEE: 10.00,
};

// ─── REVIEW & RATING ────────────────────────────────────────────────────────

export const REVIEW_RULES = {
  DIMENSIONS: ['quality', 'timeliness', 'communication', 'value'] as const,
  /**
   * Pesos para o overallRating:
   * quality=30%, timeliness=25%, communication=25%, value=20%
   */
  WEIGHTS: {
    quality: 0.30,
    timeliness: 0.25,
    communication: 0.25,
    value: 0.20,
  },
  MAX_PER_WORK_ORDER: 1,
  MAX_PROVIDER_RESPONSES: 1,
  DENORMALIZE_IN_PROFILE: true,
  ALLOW_DIAGNOSTIC_REVIEW: true,
  SEPARATE_DIAGNOSTIC_SERVICE_REVIEW: true,
};

// ─── WALLET & TIPS ──────────────────────────────────────────────────────────

export const WALLET_RULES = {
  TOP_UP_MIN: 10,
  TOP_UP_MAX: 1000,
  METHODS: ['CARD', 'TRANSFER', 'PIX'] as const,
  AUTO_CREATE: true,
  INSTANT_METHODS_ONLY_FOR_SERVICES: ['CARD', 'WALLET_BALANCE'] as const,
};

export const TIP_RULES = {
  PRESET_PERCENTAGES: [5, 10, 15, 20] as const,
  ALLOW_CUSTOM_AMOUNT: true,
  MAX_PER_WORK_ORDER: 1,
  METHODS: ['CARD', 'WALLET'] as const,
  PLATFORM_CUT: 0,
  NOTIFY_REALTIME: true,
};

// ─── AUTO PARTS STORE ───────────────────────────────────────────────────────

export const AUTO_PARTS_STORE_RULES = {
  SEARCH_RADIUS_MIN_MILES: 25,
  SEARCH_RADIUS_MAX_MILES: 35,
  MAX_PRODUCTS_PER_STORE: 150,
  RESERVATION_HOLD_HOURS: 24,
  MAX_RESERVATIONS_PER_USER_PER_PRODUCT: 5,
  ADMIN_APPROVAL_REQUIRED: true,
  CATEGORIES_COUNT: 16,
  CONDITIONS: ['NEW', 'USED', 'REFURBISHED', 'REMANUFACTURED'] as const,
  METRICS_WINDOW_DAYS: 30,
  STOCK_LEVELS: ['LOW', 'MEDIUM', 'HIGH'] as const,
  STOCK_CHECK_INTERVAL_HOURS: 4,
  RESERVATION_CONFIRM_TIMEOUT_HOURS: 3,
  SPECIAL_OFFERS_ENABLED: true,
};

// ─── CAR WASH ───────────────────────────────────────────────────────────────

export const CAR_WASH_RULES = {
  SEARCH_RADIUS_MIN_MILES: 15,
  SEARCH_RADIUS_MAX_MILES: 35,
  REVIEW_MIN_RATING: 1,
  REVIEW_MAX_RATING: 5,
  LOW_RATING_REQUIRES_REASON: true,
  LOW_RATING_THRESHOLD: 3,
  MAX_REVIEWS_PER_USER: 1,
  OPEN_NOW_CHECK: true,
};

// ─── MILEAGE REMINDERS ──────────────────────────────────────────────────────

export const MILEAGE_REMINDER_RULES = {
  POST_SERVICE_TRIGGER: true,
  CRON_INTERVAL_HOURS: 12,
  STALE_THRESHOLD_DAYS: 3,
  MIN_NOTIFICATION_INTERVAL_HOURS: 48,
  APP_OPEN_BANNER: true,
};

// ─── NOTIFICATIONS ──────────────────────────────────────────────────────────

export const NOTIFICATION_RULES = {
  CHANNELS: ['IN_APP', 'PUSH', 'EMAIL'] as const,
  IN_APP_ALWAYS: true,
  PUSH_REQUIRES_OPT_IN: true,
  EMAIL_REQUIRES_OPT_IN: true,
};

// ─── SUPPORT TICKETS ────────────────────────────────────────────────────────

export const SUPPORT_RULES = {
  NUMBER_PREFIX: 'SUP',
  AUTO_INCREMENT: true,
  STATUSES: ['OPEN', 'WAITING_ADMIN', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED'] as const,
  CLOSED_REJECTS_MESSAGES: true,
  TRACK_SENDER_ROLE: true,
};

// ─── DATA LAYERS ────────────────────────────────────────────────────────────

export const VEHICLE_DATA_LAYERS = {
  LAYER_0: { source: 'NHTSA vPIC', cost: 0, access: 'ALL', variables: 144 },
  LAYER_1: { source: 'VehicleDatabases.com', cost: 100, access: 'PREMIUM_ENTERPRISE', credits: 500 },
  LAYER_2: { source: 'PartsTech (B2B)', cost: 0, access: 'PROVIDERS_ONLY' },
  LAYER_3: { source: 'Organic Catalog', cost: 0, access: 'ALL' },
};

export const CREDIT_MONITOR_THRESHOLDS = {
  NORMAL: { minPercent: 30, action: 'All calls proceed normally' },
  ALERT: { minPercent: 15, action: 'Notify admins, continue functioning' },
  THROTTLE: { minPercent: 5, action: 'Premium only, 1 req/min' },
  HALT: { minPercent: 0, action: 'Block all, use free fallback' },
};

// ─── INSURANCE ──────────────────────────────────────────────────────────────

export const INSURANCE_RULES = {
  PROVIDER_TYPES: [
    'GENERAL_LIABILITY',
    'GARAGE_LIABILITY',
    'GARAGEKEEPERS',
    'COMMERCIAL_AUTO',
    'ON_HOOK',
    'WORKERS_COMP',
    'UMBRELLA',
  ] as const,
  TOWING_REQUIRED: ['COMMERCIAL_AUTO', 'ON_HOOK'] as const,
  NEVER_BLOCK_PROVIDER: true,
  CLIENT_RISK_ACCEPTANCE: true,
  RISK_DISCLAIMER_VALIDITY_HOURS: 24,
};

// ─── AUTH & SESSIONS ────────────────────────────────────────────────────────

export const AUTH_RULES = {
  OTP_EXPIRATION_MINUTES: 10,
  RESET_TOKEN_EXPIRATION_HOURS: 1,
  TWILIO_PRIMARY: true,
  EMAIL_FALLBACK: true,
  DUAL_VERIFICATION: true,
  BIOMETRIC_LOGIN: true,
};

// ─── UPLOAD ─────────────────────────────────────────────────────────────────

export const UPLOAD_RULES = {
  STORAGE_PRIMARY: 'CLOUDINARY' as const,
  STORAGE_FALLBACK: 'LOCAL_DISK' as const,
  ACCEPTED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'] as const,
  MAX_SIZE_MB: 10,
  FILENAME_PATTERN: '{timestamp}-{random}.{ext}',
};

// ═══════════════════════════════════════════════════════════════════════════
// CALCULATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the App Service Fee based on the client's subscription plan.
 */
export function getAppServiceFee(plan: string): number {
  switch (plan) {
    case 'PREMIUM':
    case 'ENTERPRISE':
      return PAYMENT_RULES.APP_SERVICE_FEE_PREMIUM;
    case 'BASIC':
      return PAYMENT_RULES.APP_SERVICE_FEE_BASIC;
    case 'FREE':
    default:
      return PAYMENT_RULES.APP_SERVICE_FEE_FREE;
  }
}

/**
 * Get the platform fee cap based on the client's subscription plan.
 * Returns null if no cap (Free plan).
 */
export function getPlatformFeeCap(plan: string): number | null {
  const planConfig = SUBSCRIPTION_PLANS[plan as PlanKey];
  return planConfig?.platformFeeMaxCap ?? null;
}

/**
 * Calculate platform fee with plan-based cap applied.
 */
export function calculatePlatformFee(serviceAmount: number, plan: string): number {
  const rawFee = (serviceAmount * PAYMENT_RULES.PLATFORM_FEE_PERCENT) / 100;
  const cap = getPlatformFeeCap(plan);
  if (cap !== null && rawFee > cap) {
    return cap;
  }
  return parseFloat(rawFee.toFixed(2));
}

/**
 * Calcula a taxa do processador para o valor dado.
 * CLIENTE paga — mostrar claramente ao aceitar orçamento.
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

  const feePercent = cardType === 'debit'
    ? PROCESSOR_FEES.CHASE.PERCENTAGE_DEBIT
    : PROCESSOR_FEES.CHASE.PERCENTAGE_CREDIT;
  const feeFixed = PROCESSOR_FEES.CHASE.FIXED_CENTS / 100;
  const feeAmount = (amount * feePercent) / 100 + feeFixed;
  return { feeAmount: Math.round(feeAmount * 100) / 100, feePercent, feeFixed };
}

/**
 * Calcula a taxa de cancelamento baseada no estado do serviço.
 */
export function calculateCancellationFee(
  totalAmount: number,
  serviceStarted: boolean,
  quoteAcceptedAt: Date | null,
): { feePercent: number; feeAmount: number } {
  if (!quoteAcceptedAt) {
    return { feePercent: 0, feeAmount: 0 };
  }

  if (serviceStarted) {
    return { feePercent: -1, feeAmount: -1 }; // -1 = requires dispute/admin review
  }

  const hoursSinceAcceptance = (Date.now() - quoteAcceptedAt.getTime()) / (1000 * 60 * 60);

  if (hoursSinceAcceptance > 24) {
    const feePercent = CANCELLATION_RULES.AFTER_ACCEPTANCE_OVER_24H_FEE_PERCENT;
    return { feePercent, feeAmount: parseFloat(((totalAmount * feePercent) / 100).toFixed(2)) };
  }

  const feePercent = CANCELLATION_RULES.AFTER_ACCEPTANCE_UNDER_24H_FEE_PERCENT;
  return { feePercent, feeAmount: parseFloat(((totalAmount * feePercent) / 100).toFixed(2)) };
}

/**
 * Compara as taxas dos processadores para um determinado valor.
 */
export function compareProcessorFees(amount: number, cardType: 'credit' | 'debit' = 'credit') {
  const stripeFee = calculateProcessorFee(amount, 'STRIPE', cardType);
  const chaseFee = calculateProcessorFee(amount, 'CHASE', cardType);

  const platformFee = (amount * PAYMENT_RULES.PLATFORM_FEE_PERCENT) / 100;
  const stripeTotal = amount + platformFee + stripeFee.feeAmount;
  const chaseTotal = amount + platformFee + chaseFee.feeAmount;

  const recommended = stripeTotal <= chaseTotal ? 'STRIPE' : 'CHASE';
  const savings = Math.abs(stripeTotal - chaseTotal);

  return {
    stripe: {
      processingFee: stripeFee.feeAmount,
      platformFee: Math.round(platformFee * 100) / 100,
      totalAmount: Math.round(stripeTotal * 100) / 100,
      processingTime: PROCESSOR_FEES.STRIPE.processingTime,
    },
    chase: {
      processingFee: chaseFee.feeAmount,
      platformFee: Math.round(platformFee * 100) / 100,
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

// ─── FEE CALCULATION TYPES ──────────────────────────────────────────────────

export interface FeeCalculationInput {
  serviceAmount: number;
  diagnosticFee: number;
  diagnosticFeeWaivedIfServiceDone: boolean;
  travelFee: number;
  isServiceCompletedWithOriginalProvider: boolean;
  clientPlan: string;
  shopSuppliesFee?: number;
  tireFee?: number;
  batteryFee?: number;
  taxAmount?: number;
}

export interface FeeBreakdown {
  serviceAmount: number;
  diagnosticFee: number;
  diagnosticFeeWaived: boolean;
  travelFee: number;
  shopSuppliesFee: number;
  tireFee: number;
  batteryFee: number;
  taxAmount: number;
  appServiceFee: number;
  platformFeePercent: number;
  platformFeeAmount: number;
  platformFeeCap: number | null;
  platformFeeCapped: boolean;
  stripeFee: number;
  totalClientPays: number;
  providerReceives: number;
  platformReceives: number;
}

/**
 * Calcula o breakdown completo de taxas para uma transação.
 *
 * REGRAS:
 * - Platform Fee = 10% do serviceAmount (sem imposto), capped por plano
 * - App Service Fee = varia por plano (FREE=$9.89, BASIC=$4.99, PREMIUM/ENT=$0)
 * - Diagnostic Fee = 0% para plataforma, 100% provider
 * - Travel Fee = 0% para plataforma, 100% provider
 * - Stripe Fee = 2.9% + $0.30 — CLIENTE paga
 * - FDACS: Tire $1/pneu, Battery $1.50/bateria — CLIENTE paga
 */
export function calculateFees(input: FeeCalculationInput): FeeBreakdown {
  const {
    serviceAmount,
    diagnosticFee,
    diagnosticFeeWaivedIfServiceDone,
    travelFee,
    isServiceCompletedWithOriginalProvider,
    clientPlan,
    shopSuppliesFee = 0,
    tireFee = 0,
    batteryFee = 0,
    taxAmount = 0,
  } = input;

  // 1. Diagnostic fee waiver
  const diagnosticFeeWaived =
    diagnosticFeeWaivedIfServiceDone && isServiceCompletedWithOriginalProvider;
  const effectiveDiagnosticFee = diagnosticFeeWaived ? 0 : diagnosticFee;

  // 2. App service fee by plan
  const appServiceFee = getAppServiceFee(clientPlan);

  // 3. Platform fee with cap
  const platformFeePercent = PAYMENT_RULES.PLATFORM_FEE_PERCENT;
  const platformFeeAmount = calculatePlatformFee(serviceAmount, clientPlan);
  const rawPlatformFee = (serviceAmount * platformFeePercent) / 100;
  const platformFeeCap = getPlatformFeeCap(clientPlan);
  const platformFeeCapped = platformFeeCap !== null && rawPlatformFee > platformFeeCap;

  // 4. Total que o cliente paga
  const totalClientPays = parseFloat(
    (serviceAmount + effectiveDiagnosticFee + travelFee + shopSuppliesFee
      + tireFee + batteryFee + taxAmount + appServiceFee).toFixed(2)
  );

  // 5. Stripe fee (sobre o total do cliente)
  const stripeFee = parseFloat(
    ((totalClientPays * PROCESSOR_FEES.STRIPE.PERCENTAGE) / 100
      + PROCESSOR_FEES.STRIPE.FIXED_CENTS / 100).toFixed(2)
  );

  // 6. Provider recebe: serviceAmount - platformFee + diagnosticFee + travelFee + shopSupplies
  const providerReceives = parseFloat(
    (serviceAmount - platformFeeAmount + effectiveDiagnosticFee + travelFee + shopSuppliesFee).toFixed(2)
  );

  // 7. Plataforma recebe: platformFee + appServiceFee
  const platformReceives = parseFloat(
    (platformFeeAmount + appServiceFee).toFixed(2)
  );

  return {
    serviceAmount,
    diagnosticFee: effectiveDiagnosticFee,
    diagnosticFeeWaived,
    travelFee,
    shopSuppliesFee,
    tireFee,
    batteryFee,
    taxAmount,
    appServiceFee,
    platformFeePercent,
    platformFeeAmount,
    platformFeeCap,
    platformFeeCapped,
    stripeFee,
    totalClientPays,
    providerReceives,
    platformReceives,
  };
}

/**
 * Calculate travel fee using provider settings (miles, not km).
 * Falls back to global defaults if provider has no custom settings.
 */
export function calculateTravelFee(
  distanceMiles: number,
  providerFreeMiles?: number,
  providerFeePerMile?: number,
  providerMaxFee?: number,
): number {
  const freeMiles = providerFreeMiles ?? TRAVEL_FEE_RULES.DEFAULT_FREE_MILES;
  const feePerMile = providerFeePerMile ?? TRAVEL_FEE_RULES.DEFAULT_EXTRA_FEE_PER_MILE;
  const maxFee = providerMaxFee ?? TRAVEL_FEE_RULES.DEFAULT_MAX_FEE;

  if (distanceMiles <= freeMiles) return 0;
  const fee = (distanceMiles - freeMiles) * feePerMile;
  return Math.min(parseFloat(fee.toFixed(2)), maxFee);
}

/**
 * Check if referral fee should be paid. Currently DISABLED.
 */
export function shouldPayReferralFee(originalDiagnosticFee: number): boolean {
  return (
    REFERRAL_FEE_RULES.ENABLED &&
    originalDiagnosticFee >= REFERRAL_FEE_RULES.MIN_DIAGNOSTIC_FEE_FOR_REFERRAL
  );
}

/**
 * Calculate weighted overall rating from dimension scores.
 */
export function calculateWeightedRating(scores: {
  quality: number;
  timeliness: number;
  communication: number;
  value: number;
}): number {
  const { quality, timeliness, communication, value } = scores;
  const w = REVIEW_RULES.WEIGHTS;
  const weighted = quality * w.quality + timeliness * w.timeliness
    + communication * w.communication + value * w.value;
  return parseFloat(weighted.toFixed(2));
}

/**
 * Generate a human-readable provider reputation summary.
 */
export function getProviderReputationSummary(scores: {
  quality: number;
  timeliness: number;
  communication: number;
  value: number;
}): string[] {
  const insights: string[] = [];
  if (scores.quality >= 4.5) insights.push('Excellent service quality');
  if (scores.quality < 3.5) insights.push('Service quality could be improved');
  if (scores.timeliness >= 4.5) insights.push('Fast execution');
  if (scores.timeliness < 3.5) insights.push('May take longer than expected');
  if (scores.communication >= 4.5) insights.push('Great communicator');
  if (scores.communication < 3.5) insights.push('Communication could improve');
  if (scores.value >= 4.5) insights.push('Great value for money');
  if (scores.value < 3.5) insights.push('Pricing may be above average');
  if (scores.value < 3.5 && scores.quality >= 4.0) {
    insights.push('Higher pricing but delivers quality work');
  }
  if (scores.value >= 4.0 && scores.timeliness < 3.5) {
    insights.push('Good pricing but may take longer');
  }
  return insights;
}

/**
 * Get the service request expiration hours based on the client's plan.
 * Returns null for plans that never expire.
 */
export function getServiceRequestExpirationHours(plan: string): number | null {
  const planConfig = SUBSCRIPTION_PLANS[plan as PlanKey];
  return planConfig?.requestExpirationHours ?? QUOTE_VALIDITY.SERVICE_REQUEST_HOURS_FREE;
}

// ─── DEFAULT EXPORT ─────────────────────────────────────────────────────────

export default {
  SUBSCRIPTION_PLANS,
  PAYMENT_RULES,
  PROCESSOR_FEES,
  CANCELLATION_RULES,
  PROVIDER_POINTS,
  REFUND_RULES,
  SUPPLEMENT_RULES,
  DIAGNOSTIC_FEE_RULES,
  TRAVEL_FEE_RULES,
  REFERRAL_FEE_RULES,
  QUOTE_VALIDITY,
  RENEWAL_RULES,
  SERVICE_FLOW,
  FDACS_RULES,
  EXPIRATION_RULES,
  ESTIMATE_SHARE_RULES,
  REVIEW_RULES,
  WALLET_RULES,
  TIP_RULES,
  AUTO_PARTS_STORE_RULES,
  CAR_WASH_RULES,
  MILEAGE_REMINDER_RULES,
  NOTIFICATION_RULES,
  SUPPORT_RULES,
  VEHICLE_DATA_LAYERS,
  CREDIT_MONITOR_THRESHOLDS,
  INSURANCE_RULES,
  AUTH_RULES,
  UPLOAD_RULES,
  // Functions
  getAppServiceFee,
  getPlatformFeeCap,
  calculatePlatformFee,
  calculateProcessorFee,
  calculateCancellationFee,
  compareProcessorFees,
  calculateFees,
  calculateTravelFee,
  shouldPayReferralFee,
  calculateWeightedRating,
  getProviderReputationSummary,
  getServiceRequestExpirationHours,
};
