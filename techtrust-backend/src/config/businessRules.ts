/**
 * ============================================
 * BUSINESS RULES - Regras de Negócio Centralizadas
 * ============================================
 * FONTE ÚNICA DE VERDADE — não duplicar em controllers.
 *
 * Last updated: 2025-07-17
 * Covers: Plans, Fees, Cancellation, Expiration, Provider Points,
 *         Review Weights, FDACS, Stripe, RFQ, Auto Parts Store,
 *         Commission Tiers, Service Balance, SOS Pricing
 * ============================================
 */

// ─── SUBSCRIPTION PLANS ─────────────────────────────────────────────────────

export const SUBSCRIPTION_PLANS = {
  FREE: {
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    maxVehicles: 2,
    maxRequestsPerMonth: 4,
    maxActiveSimultaneous: 2,
    features: {
      // Always available on ALL plans
      vinDecode: true,
      nhtsaRecalls: true,
      organicCatalog: true,
      fdacsCompliance: true,
      disputes: true,
      pdfReceipts: true,
      // Gated features
      multiLanguage: false,
      mileageTracker: false,
      quoteSharing: false,
      plateDecoder: false,
      ocrScan: false,
      scheduledMaintenance: false,
      warrantyStatus: false,
      marketValue: false,
      wallet: false,
      oemLookup: false,
      expenseReports: false,
      fleetDashboard: false,
      obd2Basic: false,
      obd2Advanced: false,
      supplementApproval: false,
      vehicleTransfer: false,
    },
    appServiceFee: 5.89,
    vehicleAddOnPrice: 6.99,
    requestExpiration: 'EXPIRES' as const,
    requestExpirationHours: 72,
    renewalFee: 0.99,
    renewalLimit: null,
    requestHighlight: false,
    specialOffers: false,
    prioritySupport: false,
    // SOS discount
    sosDiscountPercent: 0,
    sosPriority: false,
    sosFreePerMonth: 0,
    // Service discounts — earned over time (unlock 1 every 3 months, reset on plan renewal)
    serviceDiscounts: {
      oilChangesPerYear: 0,
      brakeInspectionsPerYear: 0,
      // No discounts on FREE plan
      discountSlots: [] as readonly { type: string; percent: number; unlockMonth: number }[],
    },
  },
  STARTER: {
    name: 'Starter',
    monthlyPrice: 9.99,
    annualPrice: 99.99,
    maxVehicles: 3,
    maxRequestsPerMonth: 10,
    maxActiveSimultaneous: 6,
    features: {
      vinDecode: true,
      nhtsaRecalls: true,
      organicCatalog: true,
      fdacsCompliance: true,
      disputes: true,
      pdfReceipts: true,
      multiLanguage: true,
      mileageTracker: true,
      quoteSharing: true,
      plateDecoder: false,
      ocrScan: false,
      scheduledMaintenance: true,
      warrantyStatus: false,
      marketValue: false,
      wallet: false,
      oemLookup: false,
      expenseReports: false,
      fleetDashboard: false,
      obd2Basic: false,
      obd2Advanced: false,
      supplementApproval: false,
      vehicleTransfer: false,
    },
    appServiceFee: 2.99,
    vehicleAddOnPrice: 5.99,
    requestExpiration: 'EXPIRES' as const,
    requestExpirationHours: 72,
    renewalFee: 0.99,
    renewalLimit: null,
    requestHighlight: false,
    specialOffers: false,
    prioritySupport: false,
    sosDiscountPercent: 10,
    sosPriority: false,
    sosFreePerMonth: 0,
    serviceDiscounts: {
      oilChangesPerYear: 1,
      brakeInspectionsPerYear: 0,
      // 1 discount unlocked every 3 months (max 2/year), resets on renewal
      discountSlots: [
        { type: 'SOS', percent: 10, unlockMonth: 3 },
        { type: 'SOS', percent: 10, unlockMonth: 6 },
      ] as readonly { type: string; percent: number; unlockMonth: number }[],
    },
  },
  PRO: {
    name: 'Pro',
    monthlyPrice: 19.99,
    annualPrice: 199.99,
    maxVehicles: 5,
    maxRequestsPerMonth: null,
    maxActiveSimultaneous: 10,
    features: {
      vinDecode: true,
      nhtsaRecalls: true,
      organicCatalog: true,
      fdacsCompliance: true,
      disputes: true,
      pdfReceipts: true,
      multiLanguage: true,
      mileageTracker: true,
      quoteSharing: true,
      plateDecoder: true,
      ocrScan: true,
      scheduledMaintenance: true,
      warrantyStatus: true,
      marketValue: true,
      wallet: true,
      oemLookup: true,
      expenseReports: true,
      fleetDashboard: false,
      obd2Basic: true,
      obd2Advanced: false,
      supplementApproval: true,
      vehicleTransfer: true,
    },
    appServiceFee: 0,
    vehicleAddOnPrice: 3.99,
    requestExpiration: 'NEVER' as const,
    requestExpirationHours: null,
    renewalFee: 0,
    renewalLimit: null,
    requestHighlight: true,
    specialOffers: true,
    prioritySupport: true,
    sosDiscountPercent: 20,
    sosPriority: true,
    sosFreePerMonth: 0,
    serviceDiscounts: {
      oilChangesPerYear: 2,
      brakeInspectionsPerYear: 1,
      // 1 discount unlocked every 3 months (max 4/year), resets on renewal
      discountSlots: [
        { type: 'AC', percent: 10, unlockMonth: 3 },
        { type: 'TIRE', percent: 5, unlockMonth: 6 },
        { type: 'BRAKE', percent: 10, unlockMonth: 9 },
        { type: 'SOS', percent: 20, unlockMonth: 12 },
      ] as readonly { type: string; percent: number; unlockMonth: number }[],
    },
  },
  ENTERPRISE: {
    name: 'Enterprise',
    monthlyPrice: 49.99,
    annualPrice: 499.99,
    maxVehicles: 14,
    maxRequestsPerMonth: null,
    maxActiveSimultaneous: null,
    features: {
      vinDecode: true,
      nhtsaRecalls: true,
      organicCatalog: true,
      fdacsCompliance: true,
      disputes: true,
      pdfReceipts: true,
      multiLanguage: true,
      mileageTracker: true,
      quoteSharing: true,
      plateDecoder: true,
      ocrScan: true,
      scheduledMaintenance: true,
      warrantyStatus: true,
      marketValue: true,
      wallet: true,
      oemLookup: true,
      expenseReports: true,
      fleetDashboard: true,
      obd2Basic: true,
      obd2Advanced: true,
      supplementApproval: true,
      vehicleTransfer: true,
    },
    appServiceFee: 0,
    vehicleAddOnPrice: 0, // Enterprise: custom pricing for 14+ vehicles
    requestExpiration: 'NEVER' as const,
    requestExpirationHours: null,
    renewalFee: 0,
    renewalLimit: null,
    requestHighlight: true,
    specialOffers: true,
    prioritySupport: true,
    sosDiscountPercent: 30,
    sosPriority: true,
    sosFreePerMonth: 2,
    serviceDiscounts: {
      oilChangesPerYear: 4,
      brakeInspectionsPerYear: -1, // -1 = unlimited
      // 1 discount unlocked every 3 months (max 4/year), resets on renewal
      discountSlots: [
        { type: 'AC', percent: 15, unlockMonth: 3 },
        { type: 'TIRE', percent: 10, unlockMonth: 3 },
        { type: 'BRAKE', percent: 15, unlockMonth: 6 },
        { type: 'SOS', percent: 30, unlockMonth: 6 },
      ] as readonly { type: string; percent: number; unlockMonth: number }[],
    },
  },
} as const;

export type PlanKey = keyof typeof SUBSCRIPTION_PLANS;

// ─── TRIAL PERIOD ───────────────────────────────────────────────────────────

export const TRIAL_POLICY = {
  /** Number of free trial days for paid plans */
  TRIAL_DAYS: 7,
  /** Whether to require payment method before starting trial */
  REQUIRE_PAYMENT_METHOD: true,
  /** Plans eligible for free trial (exclude FREE plan) */
  ELIGIBLE_PLANS: ['STARTER', 'PRO', 'ENTERPRISE'] as const,
} as const;

// ─── VEHICLE ADD-ON ─────────────────────────────────────────────────────────

export const VEHICLE_ADD_ON = {
  /** Price per additional vehicle per month — varies by plan */
  PRICE_BY_PLAN: {
    FREE: 6.99,
    STARTER: 5.99,
    PRO: 3.99,
    ENTERPRISE: 0, // Custom pricing for 14+ vehicles
  } as Record<string, number>,
  /** All plans can add vehicles */
  AVAILABLE_PLANS: ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'] as const,
};

// ─── PROVIDER COMMISSION TIERS ──────────────────────────────────────────────

export const PROVIDER_COMMISSION = {
  /** Commission tiers based on completed orders and account tenure */
  TIERS: {
    ENTRY: {
      name: 'Entry',
      commissionPercent: 15,
      minOrders: 0,
      minMonths: 0,
    },
    INTERMEDIATE: {
      name: 'Intermediate',
      commissionPercent: 12,
      minOrders: 30,
      minMonths: 0,
    },
    ADVANCED: {
      name: 'Advanced',
      commissionPercent: 10,
      minOrders: 100,
      minMonths: 6, // OR condition: 100 orders OR 6 months
    },
    PREMIUM_TIER: {
      name: 'Premium',
      commissionPercent: 8,
      minOrders: 250,
      minMonths: 12, // OR condition: 250 orders OR 12 months
    },
  } as const,

  /** SOS services always 12% commission regardless of tier */
  SOS_COMMISSION_PERCENT: 12,

  /** Parts fee: percentage-based tiered by provider level with floor/ceiling */
  PARTS_FEE: {
    PERCENT_BY_LEVEL: {
      ENTRY: 11,
      INTERMEDIATE: 10,
      ADVANCED: 9,
      PREMIUM_TIER: 8,
    } as Record<string, number>,
    FLOOR: 2.00,
    CEILING_BY_LEVEL: {
      ENTRY: 10.00,
      INTERMEDIATE: 12.00,
      ADVANCED: 13.00,
      PREMIUM_TIER: 15.00,
    } as Record<string, number>,
  },

  /** Marketplace listing fee for providers (auto parts & car wash) */
  LISTING_PLANS: {
    BASIC: {
      name: 'Basic',
      monthlyPrice: 29.99,
      annualPrice: 299.99,
      features: {
        /** Standard listing in search results */
        standardListing: true,
        /** Business profile page with photos, hours, description */
        businessProfile: true,
        /** Receive service requests from nearby customers */
        receiveRequests: true,
        /** Basic analytics: views, clicks, request count */
        basicAnalytics: true,
        /** Reply to customer reviews */
        reviewReplies: true,
        /** Maximum photos in listing */
        maxPhotos: 5,
        /** Search result boost (1x = no boost) */
        searchBoost: 1,
        /** Radius of ad visibility in miles */
        adReachMiles: 15,
        /** Featured/highlighted listing in search */
        featuredListing: false,
        /** Priority placement in search results */
        prioritySearch: false,
        /** Advanced analytics: conversion rate, competitor insights */
        advancedAnalytics: false,
        /** Promotional offers & coupons creation */
        promotionalOffers: false,
        /** Badge "Verified Business" in listing */
        verifiedBadge: false,
        /** Social media integration */
        socialIntegration: false,
        /** Dedicated account support */
        dedicatedSupport: false,
      },
    },
    BEST: {
      name: 'Best',
      monthlyPrice: 39.99,
      annualPrice: 399.99,
      features: {
        standardListing: true,
        businessProfile: true,
        receiveRequests: true,
        basicAnalytics: true,
        reviewReplies: true,
        maxPhotos: 20,
        searchBoost: 3, // 3x higher ranking in search results
        adReachMiles: 50,
        featuredListing: true, // Highlighted with badge in search
        prioritySearch: true, // Shown first in search results
        advancedAnalytics: true, // Conversion rates, competitor insights, trends
        promotionalOffers: true, // Create coupons & special offers
        verifiedBadge: true, // "Verified Business" trust badge
        socialIntegration: true, // Share listings to social media
        dedicatedSupport: true, // Priority customer support
      },
    },
  },
} as const;

// ─── SOS / ROADSIDE PRICING ────────────────────────────────────────────────

export const SOS_PRICING = {
  BASE_FEE: 65.00,
  PER_MILE: 2.50,
  NIGHT_SURCHARGE_PERCENT: 30,    // 22h-6h: +30%
  HOLIDAY_SURCHARGE_PERCENT: 50,  // Holidays: +50%
  WEEKEND_SURCHARGE_PERCENT: 19,  // Weekends: +19%
  NIGHT_START_HOUR: 22,
  NIGHT_END_HOUR: 6,
  MAX_ARRIVAL_MINUTES: 60,
  LATE_DISCOUNTS: {
    15: 10,
    30: 20,
    45: 30,
  } as Record<number, number>,
  FREE_CANCEL_AFTER_MINUTES: 60,

  /**
   * Fleet / Rental Car pricing — reduced fixed-price structure.
   * When client is ENTERPRISE or a Rental Car company, they set a MAX_PRICE.
   * Provider sees the max price and can offer equal or lower.
   * This incentivizes competitive pricing for high-volume clients.
   */
  FLEET_PRICING: {
    /** Whether fleet pricing is enabled */
    ENABLED: true,
    /** Client types that qualify for fleet pricing */
    QUALIFYING_TYPES: ['RENTAL_CAR', 'BIG_ENTERPRISE'] as readonly string[],
    /** Fixed max prices by service type (provider can offer less but not more) */
    MAX_PRICES: {
      TOWING: 85.00,         // Max tow price for fleet clients
      JUMP_START: 45.00,
      TIRE_CHANGE: 55.00,
      LOCKOUT: 50.00,
      FUEL_DELIVERY: 40.00,
      GENERAL: 70.00,        // Fallback for other SOS types
    } as Record<string, number>,
    /** Reduced per-mile rate for fleet clients */
    PER_MILE: 1.50,          // vs $2.50 standard
    /** No surcharges for fleet clients (they pay flat rate) */
    SURCHARGES_APPLY: false,
    /** Platform commission on fleet SOS (lower to attract volume) */
    COMMISSION_PERCENT: 10,  // vs 12% standard SOS
  },
} as const;

/**
 * Calculate SOS price with plan discount applied.
 * For fleet/rental clients, returns the fixed max price (provider can offer less).
 */
export function calculateSOSPrice(
  distanceMiles: number,
  isNight: boolean,
  isHoliday: boolean,
  isWeekend: boolean,
  clientPlan: string = 'FREE',
  freeUsesRemaining: number = 0,
  options?: { clientType?: string; serviceType?: string },
): { price: number; discount: number; isFreeUse: boolean; isFleetPricing: boolean; maxPrice?: number } {
  // Enterprise free uses
  if (freeUsesRemaining > 0) {
    return { price: 0, discount: 100, isFreeUse: true, isFleetPricing: false };
  }

  // Fleet / Rental Car pricing — fixed max price, no surcharges
  const fleet = SOS_PRICING.FLEET_PRICING;
  if (fleet.ENABLED && options?.clientType && fleet.QUALIFYING_TYPES.includes(options.clientType)) {
    const serviceKey = options?.serviceType ?? 'GENERAL';
    const maxPrice = fleet.MAX_PRICES[serviceKey] ?? fleet.MAX_PRICES.GENERAL;
    // Calculate distance-based price with reduced per-mile
    const fleetPrice = Math.min(
      maxPrice,
      SOS_PRICING.BASE_FEE + (distanceMiles * fleet.PER_MILE),
    );
    return {
      price: Math.round(fleetPrice * 100) / 100,
      discount: 0,
      isFreeUse: false,
      isFleetPricing: true,
      maxPrice,
    };
  }

  // Standard pricing
  let price = SOS_PRICING.BASE_FEE + (distanceMiles * SOS_PRICING.PER_MILE);

  if (isNight) {
    price *= 1 + (SOS_PRICING.NIGHT_SURCHARGE_PERCENT / 100);
  }
  if (isHoliday) {
    price *= 1 + (SOS_PRICING.HOLIDAY_SURCHARGE_PERCENT / 100);
  } else if (isWeekend) {
    price *= 1 + (SOS_PRICING.WEEKEND_SURCHARGE_PERCENT / 100);
  }

  const planConfig = SUBSCRIPTION_PLANS[clientPlan as PlanKey];
  const discountPercent = planConfig?.sosDiscountPercent ?? 0;
  const discount = (price * discountPercent) / 100;
  price = price - discount;

  return {
    price: Math.round(price * 100) / 100,
    discount: discountPercent,
    isFreeUse: false,
    isFleetPricing: false,
  };
}

// ─── PAYMENT RULES ──────────────────────────────────────────────────────────

export const PAYMENT_RULES = {
  /** Modelo de pagamento: pré-autorização (hold no cartão) */
  PAYMENT_MODEL: 'PRE_AUTHORIZATION' as const,

  /**
   * Platform Commission — tiered, based on PROVIDER level (replaces old flat 10%).
   * Applied to labor/service amount. Parts have a separate fee (PARTS_FEE).
   * The provider's tier determines the rate: ENTRY=15%, INTERMEDIATE=12%, ADVANCED=10%, PREMIUM=8%.
   * For SOS services, always 12% regardless of tier.
   * This is deducted from the provider's payout; the client pays the quote price + appServiceFee + processorFee.
   */
  COMMISSION_USE_PROVIDER_TIER: true,

  /**
   * App Service Fee — cobrado do CLIENTE por transação, varia por plano:
   * FREE=$5.89, STARTER=$2.99, PRO/ENTERPRISE=$0.00
   * Incentiva upgrade de plano.
   */
  APP_SERVICE_FEE_FREE: 5.89,
  APP_SERVICE_FEE_STARTER: 2.99,
  APP_SERVICE_FEE_PRO: 0.00,

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
  /**
   * Platform cut on diagnostic fee:
   * - ON_PLATFORM: client converts diagnostic to quote with SAME provider = 5% platform
   * - OFF_PLATFORM: client converts to quote with OTHER provider or leaves = 8% platform
   * Provider may offer discount when client converts diagnostic → quote with them.
   */
  ON_PLATFORM_CUT_PERCENT: 5,
  OFF_PLATFORM_CUT_PERCENT: 8,
  /** Provider can offer discount if diagnostic converts to quote with them */
  ALLOW_CONVERSION_DISCOUNT: true,
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
   * conforme plano: FREE/STARTER=72h renewable, PRO/ENTERPRISE=never
   */
  SERVICE_REQUEST_HOURS_FREE: 72,
  SERVICE_REQUEST_HOURS_STARTER: 72,
  SERVICE_REQUEST_HOURS_PRO: null as number | null,  // Never expires
  /** Prazo para provider submeter quote (48h da criação do request) */
  PROVIDER_SUBMIT_HOURS: 48,
  /** Validade de EstimateShare (RFQ aberto) */
  ESTIMATE_SHARE_DAYS: 30,
  /** Número máximo de quotes por service request */
  MAX_QUOTES_PER_REQUEST: 8,
};

// ─── SERVICE REQUEST RENEWAL ────────────────────────────────────────────────

export const RENEWAL_RULES = {
  /** Taxa de renovação por solicitação (Free/Starter) */
  FEE: 0.99,
  /** Como a taxa é cobrada: Stripe imediato antes de reabrir a solicitação */
  BILLING_METHOD: 'IMMEDIATE_STRIPE' as const,
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
  LAYER_1: { source: 'VehicleDatabases.com', cost: 100, access: 'PRO_ENTERPRISE', credits: 500 },
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
    case 'PRO':
    case 'ENTERPRISE':
      return PAYMENT_RULES.APP_SERVICE_FEE_PRO;
    case 'STARTER':
      return PAYMENT_RULES.APP_SERVICE_FEE_STARTER;
    case 'FREE':
    default:
      return PAYMENT_RULES.APP_SERVICE_FEE_FREE;
  }
}

/**
 * Get the platform fee cap based on the client's subscription plan.
 * Returns null if no cap (Free plan).
 * @deprecated Platform fee is now tiered by provider level, not capped by client plan.
 */
export function getPlatformFeeCap(_plan: string): number | null {
  return null; // Caps removed — commission is now tiered by provider level
}

/**
 * @deprecated Use calculateServiceCommission() instead.
 * Kept for backward compatibility — returns 10% flat fee.
 */
export function calculatePlatformFee(serviceAmount: number, _plan: string): number {
  // Fallback: returns 10% (ENTRY-level midpoint) — should NOT be used in new flows
  const rawFee = (serviceAmount * 10) / 100;
  return parseFloat(rawFee.toFixed(2));
}

/**
 * Calculate the platform commission on labor/service based on provider tier.
 * This is the SINGLE commission that replaces both old platformFee and providerCommission.
 * Applied to labor + additionalFees (NOT parts — parts have their own fee).
 */
export function calculateServiceCommission(
  laborAmount: number,
  providerLevel: ProviderLevelKey,
  isSOS: boolean = false,
): { commissionAmount: number; commissionPercent: number } {
  const commissionPercent = isSOS
    ? PROVIDER_COMMISSION.SOS_COMMISSION_PERCENT
    : PROVIDER_COMMISSION.TIERS[providerLevel].commissionPercent;
  const commissionAmount = Math.round((laborAmount * commissionPercent) / 100 * 100) / 100;
  return { commissionAmount, commissionPercent };
}

/**
 * Calculate the full fee breakdown for a service transaction.
 * This is the SINGLE SOURCE OF TRUTH for all fee calculations.
 *
 * Commission model:
 * - Service commission: 8-15% of labor (tiered by provider level)
 * - Parts fee: 8% of parts ($2 floor, $10-$15 ceiling by provider level)
 * - App service fee: $0-$5.89 (by client plan, charged to client)
 * - Processing fee: Stripe 2.9% + $0.30 (charged to client)
 *
 * Client pays: quoteTotal + salesTax + appServiceFee + processorFee
 * Provider receives: quoteTotal - serviceCommission - partsFee
 * Platform receives: serviceCommission + partsFee + appServiceFee
 * Sales tax: collected by TechTrust as Marketplace Facilitator, remitted to FL DOR
 */
export function calculateFullFeeBreakdown(input: {
  laborAmount: number;
  partsAmount: number;
  additionalFees?: number;
  travelFee?: number;
  diagnosticFee?: number;
  shopSuppliesFee?: number;
  tireFee?: number;
  batteryFee?: number;
  taxAmount?: number;
  quoteTotal: number;
  clientPlan: string;
  providerLevel: ProviderLevelKey;
  isSOS?: boolean;
  processor?: 'STRIPE' | 'CHASE';
  cardType?: 'credit' | 'debit';
  // Sales tax (calculated by tax.service.ts — Marketplace Facilitator)
  salesTaxAmount?: number;
  salesTaxRate?: number;
  salesTaxableAmount?: number;
  salesTaxCounty?: string;
}): FullFeeBreakdown {
  const {
    laborAmount, partsAmount, additionalFees = 0,
    travelFee = 0, diagnosticFee = 0, shopSuppliesFee = 0,
    tireFee = 0, batteryFee = 0, taxAmount = 0,
    quoteTotal, clientPlan, providerLevel,
    isSOS = false, processor = 'STRIPE', cardType = 'credit',
    salesTaxAmount = 0, salesTaxRate = 0, salesTaxableAmount = 0, salesTaxCounty = '',
  } = input;

  // 1. Service commission (8-15% of labor + additionalFees)
  const commissionBase = laborAmount + additionalFees;
  const { commissionAmount: serviceCommission, commissionPercent: serviceCommissionPercent } =
    calculateServiceCommission(commissionBase, providerLevel, isSOS);

  // 2. Parts fee (8%, with floor/ceiling)
  const partsFee = calculatePartsFee(partsAmount, providerLevel);

  // 3. Total platform commission (what platform takes from provider)
  const totalPlatformCommission = serviceCommission + partsFee;

  // 4. App service fee (by client plan, charged ON TOP to client)
  const appServiceFee = getAppServiceFee(clientPlan);

  // 5. Processing fee (on the total the client pays, including sales tax)
  const clientSubtotal = quoteTotal + salesTaxAmount + appServiceFee;
  const processorFee = calculateProcessorFee(clientSubtotal, processor, cardType);

  // 6. Total client pays (includes sales tax collected as Marketplace Facilitator)
  const totalClientPays = parseFloat((clientSubtotal + processorFee.feeAmount).toFixed(2));

  // 7. Provider receives (quoteTotal minus platform commission — tax NOT deducted from provider)
  const providerReceives = parseFloat((quoteTotal - totalPlatformCommission).toFixed(2));

  // 8. Platform receives (commission + appServiceFee; sales tax is held separately for remittance)
  const platformReceives = parseFloat((totalPlatformCommission + appServiceFee).toFixed(2));

  return {
    // Quote breakdown
    laborAmount,
    partsAmount,
    additionalFees,
    travelFee,
    diagnosticFee,
    shopSuppliesFee,
    tireFee,
    batteryFee,
    taxAmount,
    quoteTotal,
    // Sales tax (Marketplace Facilitator — collected from client, remitted to FL DOR)
    salesTaxAmount,
    salesTaxRate,
    salesTaxableAmount,
    salesTaxCounty,
    // Commission
    serviceCommissionPercent,
    serviceCommission,
    partsFeePercent: partsAmount > 0 ? (PROVIDER_COMMISSION.PARTS_FEE.PERCENT_BY_LEVEL[providerLevel] ?? 11) : 0,
    partsFee,
    totalPlatformCommission,
    providerLevel,
    // Client fees
    appServiceFee,
    clientPlan,
    processorFee: processorFee.feeAmount,
    processorFeePercent: processorFee.feePercent,
    // Totals
    totalClientPays,
    providerReceives,
    platformReceives,
    // Stripe Connect amounts (in cents)
    stripeChargeAmountCents: Math.round(totalClientPays * 100),
    stripeApplicationFeeCents: Math.round((totalPlatformCommission + appServiceFee + processorFee.feeAmount) * 100),
    stripeSalesTaxAmountCents: Math.round(salesTaxAmount * 100),
  };
}

export interface FullFeeBreakdown {
  laborAmount: number;
  partsAmount: number;
  additionalFees: number;
  travelFee: number;
  diagnosticFee: number;
  shopSuppliesFee: number;
  tireFee: number;
  batteryFee: number;
  taxAmount: number;
  quoteTotal: number;
  // Sales tax (Marketplace Facilitator)
  salesTaxAmount: number;
  salesTaxRate: number;
  salesTaxableAmount: number;
  salesTaxCounty: string;
  // Commission
  serviceCommissionPercent: number;
  serviceCommission: number;
  partsFeePercent: number;
  partsFee: number;
  totalPlatformCommission: number;
  providerLevel: string;
  appServiceFee: number;
  clientPlan: string;
  processorFee: number;
  processorFeePercent: number;
  totalClientPays: number;
  providerReceives: number;
  platformReceives: number;
  stripeChargeAmountCents: number;
  stripeApplicationFeeCents: number;
  stripeSalesTaxAmountCents: number;
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
  scheduledFor?: Date | null,
): { feePercent: number; feeAmount: number } {
  if (!quoteAcceptedAt) {
    return { feePercent: 0, feeAmount: 0 };
  }

  if (serviceStarted) {
    return { feePercent: -1, feeAmount: -1 }; // -1 = requires dispute/admin review
  }

  const hoursUntilService = scheduledFor
    ? (scheduledFor.getTime() - Date.now()) / (1000 * 60 * 60)
    : null;
  const useLowerFee = hoursUntilService !== null
    ? hoursUntilService > 24
    : (Date.now() - quoteAcceptedAt.getTime()) / (1000 * 60 * 60) > 24;

  if (useLowerFee) {
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

  const platformFee = (amount * 10) / 100; // Legacy: flat 10% estimate for comparison
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
 * - App Service Fee = varia por plano (FREE=$9.89, STARTER=$4.99, PRO/ENT=$0)
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

  // 3. Platform fee (legacy: 10% flat — new flows use calculateFullFeeBreakdown)
  const platformFeePercent = 10;
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

// ─── PROVIDER COMMISSION FUNCTIONS ──────────────────────────────────────────

export type ProviderLevelKey = 'ENTRY' | 'INTERMEDIATE' | 'ADVANCED' | 'PREMIUM_TIER';

/**
 * Determine provider level based on completed orders and account age in months.
 * Tiers upgrade by EITHER orders OR tenure (whichever qualifies first).
 */
export function calculateProviderLevel(
  completedOrders: number,
  accountAgeMonths: number,
): { level: ProviderLevelKey; commissionPercent: number } {
  const tiers = PROVIDER_COMMISSION.TIERS;

  // Check from highest to lowest
  if (completedOrders >= tiers.PREMIUM_TIER.minOrders || accountAgeMonths >= tiers.PREMIUM_TIER.minMonths) {
    return { level: 'PREMIUM_TIER', commissionPercent: tiers.PREMIUM_TIER.commissionPercent };
  }
  if (completedOrders >= tiers.ADVANCED.minOrders || accountAgeMonths >= tiers.ADVANCED.minMonths) {
    return { level: 'ADVANCED', commissionPercent: tiers.ADVANCED.commissionPercent };
  }
  if (completedOrders >= tiers.INTERMEDIATE.minOrders) {
    return { level: 'INTERMEDIATE', commissionPercent: tiers.INTERMEDIATE.commissionPercent };
  }
  return { level: 'ENTRY', commissionPercent: tiers.ENTRY.commissionPercent };
}

/**
 * Calculate the commission amount for a service (labor portion).
 * SOS services always pay 12% regardless of provider level.
 */
export function calculateProviderCommission(
  laborAmount: number,
  providerLevel: ProviderLevelKey,
  isSOS: boolean = false,
): number {
  const rate = isSOS
    ? PROVIDER_COMMISSION.SOS_COMMISSION_PERCENT
    : PROVIDER_COMMISSION.TIERS[providerLevel].commissionPercent;
  return Math.round((laborAmount * rate) / 100 * 100) / 100;
}

/**
 * Calculate the parts fee for a transaction.
 * Tiered: ENTRY=11%, INTERMEDIATE=10%, ADVANCED=9%, PREMIUM=8%
 * With floor ($2) and level-based ceiling ($10-$15).
 */
export function calculatePartsFee(
  partsAmount: number,
  providerLevel: ProviderLevelKey,
): number {
  if (partsAmount <= 0) return 0;

  const percent = PROVIDER_COMMISSION.PARTS_FEE.PERCENT_BY_LEVEL[providerLevel] ?? 11;
  const rawFee = (partsAmount * percent) / 100;
  const floor = PROVIDER_COMMISSION.PARTS_FEE.FLOOR;
  const ceiling = PROVIDER_COMMISSION.PARTS_FEE.CEILING_BY_LEVEL[providerLevel] ?? 10;

  return Math.round(Math.max(floor, Math.min(rawFee, ceiling)) * 100) / 100;
}

/**
 * Calculate diagnostic fee split between provider and platform.
 * ON_PLATFORM (5%): client converts diagnostic to quote with SAME provider.
 * OFF_PLATFORM (8%): client goes to another provider or leaves.
 */
export function calculateDiagnosticFeeSplit(
  diagnosticFee: number,
  convertedToSameProvider: boolean,
): { providerReceives: number; platformReceives: number; platformPercent: number } {
  if (diagnosticFee <= 0) return { providerReceives: 0, platformReceives: 0, platformPercent: 0 };

  const platformPercent = convertedToSameProvider
    ? DIAGNOSTIC_FEE_RULES.ON_PLATFORM_CUT_PERCENT
    : DIAGNOSTIC_FEE_RULES.OFF_PLATFORM_CUT_PERCENT;

  const platformReceives = Math.round((diagnosticFee * platformPercent) / 100 * 100) / 100;
  const providerReceives = Math.round((diagnosticFee - platformReceives) * 100) / 100;

  return { providerReceives, platformReceives, platformPercent };
}

/**
 * Get available (unlocked) service discounts for a client based on their
 * plan and how many months they've been subscribed in the current cycle.
 * Discounts unlock progressively: 1 per 3 months. Reset on plan renewal.
 */
export function getUnlockedDiscounts(
  plan: string,
  monthsInCurrentCycle: number,
): { type: string; percent: number }[] {
  const planConfig = SUBSCRIPTION_PLANS[plan as PlanKey];
  if (!planConfig) return [];

  const slots = planConfig.serviceDiscounts?.discountSlots;
  if (!slots) return [];

  return slots
    .filter(slot => monthsInCurrentCycle >= slot.unlockMonth)
    .map(slot => ({ type: slot.type, percent: slot.percent }));
}

/**
 * Check if a feature is available for a given plan.
 */
export function isFeatureAvailable(plan: string, feature: string): boolean {
  const planConfig = SUBSCRIPTION_PLANS[plan as PlanKey];
  if (!planConfig) return false;
  return (planConfig.features as Record<string, boolean>)[feature] === true;
}

// ─── DEFAULT EXPORT ─────────────────────────────────────────────────────────

export default {
  SUBSCRIPTION_PLANS,
  VEHICLE_ADD_ON,
  PROVIDER_COMMISSION,
  SOS_PRICING,
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
  calculateSOSPrice,
  calculateProviderLevel,
  calculateProviderCommission,
  calculateServiceCommission,
  calculateFullFeeBreakdown,
  calculatePartsFee,
  calculateDiagnosticFeeSplit,
  getUnlockedDiscounts,
  isFeatureAvailable,
};
