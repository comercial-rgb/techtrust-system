/**
 * ============================================
 * TAX SERVICE - Sales Tax Calculation
 * ============================================
 * TechTrust is a Marketplace Facilitator in Florida.
 * Responsible for collecting and remitting sales tax.
 *
 * Florida rules:
 * - Base state rate: 6%
 * - County surtax: 0% to 2.5% (varies by county)
 * - PARTS / tangible goods → TAXABLE
 * - LABOR / services → EXEMPT (FL Statute 212.05)
 * - Travel fees, diagnostic fees → EXEMPT (service)
 * - Shop supplies → TAXABLE (tangible)
 * - Tire/battery environmental fees → EXEMPT (gov fee, not sales tax)
 *
 * Integration: Stripe Tax (preferred) or manual fallback
 */

import { logger } from "../config/logger";

// ============================================
// FLORIDA COUNTY SURTAX RATES (2025)
// Source: FL Dept. of Revenue DR-15DSS
// ============================================

const FL_BASE_RATE = 0.06; // 6% state

export const FL_COUNTY_SURTAX: Record<string, number> = {
  "alachua": 0.005,
  "baker": 0.01,
  "bay": 0.01,
  "bradford": 0.01,
  "brevard": 0.01,
  "broward": 0.01,
  "calhoun": 0.01,
  "charlotte": 0.005,
  "citrus": 0.005,
  "clay": 0.01,
  "collier": 0.005,
  "columbia": 0.01,
  "desoto": 0.015,
  "dixie": 0.01,
  "duval": 0.015,
  "escambia": 0.015,
  "flagler": 0.005,
  "franklin": 0.01,
  "gadsden": 0.015,
  "gilchrist": 0.01,
  "glades": 0.01,
  "gulf": 0.01,
  "hamilton": 0.015,
  "hardee": 0.02,
  "hendry": 0.015,
  "hernando": 0.005,
  "highlands": 0.015,
  "hillsborough": 0.025,
  "holmes": 0.01,
  "indian river": 0.005,
  "jackson": 0.015,
  "jefferson": 0.015,
  "lafayette": 0.01,
  "lake": 0.005,
  "lee": 0.005,
  "leon": 0.015,
  "levy": 0.01,
  "liberty": 0.015,
  "madison": 0.015,
  "manatee": 0.005,
  "marion": 0.005,
  "martin": 0.005,
  "miami-dade": 0.01,
  "monroe": 0.015,
  "nassau": 0.01,
  "okaloosa": 0.005,
  "okeechobee": 0.015,
  "orange": 0.005,
  "osceola": 0.015,
  "palm beach": 0.01,
  "pasco": 0.01,
  "pinellas": 0.01,
  "polk": 0.01,
  "putnam": 0.01,
  "santa rosa": 0.01,
  "sarasota": 0.01,
  "seminole": 0.01,
  "st. johns": 0.005,
  "st. lucie": 0.01,
  "sumter": 0.01,
  "suwannee": 0.01,
  "taylor": 0.01,
  "union": 0.01,
  "volusia": 0.005,
  "wakulla": 0.01,
  "walton": 0.005,
  "washington": 0.01,
};

// ============================================
// TAX CODE TYPES (Stripe Tax product_tax_code)
// ============================================

export const STRIPE_TAX_CODES = {
  /** Tangible personal property — taxable in FL */
  PARTS: "txcd_99999999",
  /** General services — exempt in FL */
  LABOR: "txcd_20060000",
  /** Shop supplies (tangible) — taxable */
  SHOP_SUPPLIES: "txcd_99999999",
};

// ============================================
// INTERFACES
// ============================================

export interface TaxCalculationInput {
  /** Total cost of parts/tangible goods (taxable in FL) */
  partsAmount: number;
  /** Shop supplies fee (taxable in FL) */
  shopSuppliesFee?: number;
  /** Customer's county (for surtax lookup) */
  customerCounty?: string;
  /** Customer's state (default: FL) */
  customerState?: string;
  /** Customer's zip code (for Stripe Tax) */
  customerZipCode?: string;
}

export interface TaxCalculationResult {
  /** Total sales tax amount to collect */
  salesTaxAmount: number;
  /** Combined tax rate (state + county surtax) */
  salesTaxRate: number;
  /** State base rate */
  stateRate: number;
  /** County surtax rate */
  countySurtaxRate: number;
  /** Taxable base amount (parts + shop supplies) */
  taxableAmount: number;
  /** County name (normalized) */
  county: string;
  /** State code */
  state: string;
  /** Whether Stripe Tax was used (vs manual fallback) */
  calculatedViaStripeTax: boolean;
  /** Stripe Tax calculation ID (for audit/filing) */
  stripeTaxCalculationId?: string;
}

// ============================================
// MAIN CALCULATION
// ============================================

/**
 * Calculate sales tax for a transaction.
 *
 * Uses Stripe Tax API if available, with manual FL county table as fallback.
 * In FL: only parts and shop supplies are taxable. Labor is exempt.
 */
export async function calculateSalesTax(
  input: TaxCalculationInput,
): Promise<TaxCalculationResult> {
  const state = (input.customerState || "FL").toUpperCase();
  const county = (input.customerCounty || "").toLowerCase().trim();

  // Taxable amount: parts + shop supplies only
  const taxableAmount = (input.partsAmount || 0) + (input.shopSuppliesFee || 0);

  // If no taxable items, return zero
  if (taxableAmount <= 0) {
    return {
      salesTaxAmount: 0,
      salesTaxRate: 0,
      stateRate: FL_BASE_RATE,
      countySurtaxRate: 0,
      taxableAmount: 0,
      county: county || "unknown",
      state,
      calculatedViaStripeTax: false,
    };
  }

  // Try Stripe Tax first (if configured)
  if (process.env.STRIPE_TAX_ENABLED === "true" && input.customerZipCode) {
    try {
      return await calculateViaStripeTax(input, taxableAmount);
    } catch (err: any) {
      logger.warn(`Stripe Tax calculation failed, using manual fallback: ${err.message}`);
    }
  }

  // Manual fallback: FL county surtax table
  return calculateManualFlorida(taxableAmount, county, state);
}

/**
 * Calculate tax using Stripe Tax API.
 * This creates a Stripe Tax Calculation object.
 */
async function calculateViaStripeTax(
  input: TaxCalculationInput,
  taxableAmount: number,
): Promise<TaxCalculationResult> {
  // Dynamic import to avoid circular dependency with stripe.service
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-12-18.acacia" as any,
  });

  const calculation = await stripe.tax.calculations.create({
    currency: "usd",
    customer_details: {
      address: {
        postal_code: input.customerZipCode!,
        state: input.customerState || "FL",
        country: "US",
      },
      address_source: "billing",
    },
    line_items: [
      {
        amount: Math.round(taxableAmount * 100), // cents
        reference: "parts_and_supplies",
        tax_code: STRIPE_TAX_CODES.PARTS,
      },
    ],
  });

  const taxAmountCents = calculation.tax_amount_exclusive;
  const salesTaxAmount = taxAmountCents / 100;

  // Extract rate from breakdown
  const totalRate = taxableAmount > 0 ? salesTaxAmount / taxableAmount : 0;
  const county = (input.customerCounty || "").toLowerCase().trim();

  logger.info(
    `Stripe Tax calculated: $${salesTaxAmount.toFixed(2)} (${(totalRate * 100).toFixed(2)}%) ` +
    `on $${taxableAmount.toFixed(2)} taxable [calc: ${calculation.id}]`,
  );

  return {
    salesTaxAmount: Math.round(salesTaxAmount * 100) / 100,
    salesTaxRate: Math.round(totalRate * 10000) / 10000,
    stateRate: FL_BASE_RATE,
    countySurtaxRate: Math.round((totalRate - FL_BASE_RATE) * 10000) / 10000,
    taxableAmount,
    county: county || "unknown",
    state: input.customerState || "FL",
    calculatedViaStripeTax: true,
    stripeTaxCalculationId: calculation.id ?? undefined,
  };
}

/**
 * Manual FL sales tax calculation using county surtax table.
 * Fallback when Stripe Tax is not available.
 */
function calculateManualFlorida(
  taxableAmount: number,
  county: string,
  state: string,
): TaxCalculationResult {
  const countySurtax = FL_COUNTY_SURTAX[county] ?? 0;
  const totalRate = FL_BASE_RATE + countySurtax;
  const salesTaxAmount = Math.round(taxableAmount * totalRate * 100) / 100;

  logger.info(
    `Manual tax calculated: $${salesTaxAmount.toFixed(2)} ` +
    `(${FL_BASE_RATE * 100}% + ${countySurtax * 100}% surtax = ${totalRate * 100}%) ` +
    `on $${taxableAmount.toFixed(2)} taxable, county: ${county || "unknown"}`,
  );

  return {
    salesTaxAmount,
    salesTaxRate: totalRate,
    stateRate: FL_BASE_RATE,
    countySurtaxRate: countySurtax,
    taxableAmount,
    county: county || "unknown",
    state,
    calculatedViaStripeTax: false,
  };
}

// ============================================
// HELPERS
// ============================================

/**
 * Get county name from coordinates (reverse geocode).
 * Used when customer county is not directly available.
 */
export async function getCountyFromCoordinates(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  try {
    // Use free Nominatim API (OSM) for reverse geocoding
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`;
    const response = await fetch(url, {
      headers: { "User-Agent": "TechTrust-AutoSolutions/1.0" },
    });
    const data = (await response.json()) as {
      address?: { county?: string };
    };

    const county = data?.address?.county;
    if (county) {
      // Normalize: "St. Lucie County" → "st. lucie"
      return county.toLowerCase().replace(/\s*county$/i, "").trim();
    }
    return null;
  } catch (err: any) {
    logger.warn(`Reverse geocode failed for ${latitude},${longitude}: ${err.message}`);
    return null;
  }
}

/**
 * Get the FL base rate + surtax for a given county.
 * Useful for displaying estimated tax before payment.
 */
export function getTaxRateForCounty(county: string): {
  stateRate: number;
  countySurtax: number;
  totalRate: number;
} {
  const normalized = county.toLowerCase().trim();
  const countySurtax = FL_COUNTY_SURTAX[normalized] ?? 0;
  return {
    stateRate: FL_BASE_RATE,
    countySurtax,
    totalRate: FL_BASE_RATE + countySurtax,
  };
}

/**
 * Determine if a line item is taxable in Florida.
 */
export function isTaxableInFL(itemType: "PART" | "LABOR" | "SHOP_SUPPLIES" | "TRAVEL" | "DIAGNOSTIC" | "TIRE_FEE" | "BATTERY_FEE"): boolean {
  switch (itemType) {
    case "PART":
    case "SHOP_SUPPLIES":
      return true;
    case "LABOR":
    case "TRAVEL":
    case "DIAGNOSTIC":
    case "TIRE_FEE":
    case "BATTERY_FEE":
      return false;
  }
}
