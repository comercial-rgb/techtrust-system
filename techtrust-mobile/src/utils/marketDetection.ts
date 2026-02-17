/**
 * Market Detection Utility
 * Auto-detects US vs BR market and provides locale-aware formatting rules.
 * Decision tree: app language → country phone → address → defaults
 */

export type Market = "US" | "BR";

export interface MarketConfig {
  market: Market;
  // Date & Time
  dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY";
  dateSeparator: string;
  timeFormat: "12h" | "24h";
  dateLocale: string; // for toLocaleDateString
  // Distance & Speed
  distanceUnit: "mi" | "km";
  distanceLabel: string; // "miles" | "km"
  speedUnit: "mph" | "km/h";
  // Currency
  currency: "USD" | "BRL";
  currencySymbol: string;
  currencyLocale: string;
  // Tax / ID
  taxIdType: "EIN" | "CNPJ";
  taxIdLabel: string;
  taxIdMask: string;
  personalIdType: "SSN" | "CPF";
  personalIdLabel: string;
  personalIdMask: string;
  personalIdLastDigits: number; // How many last digits to show
  // Phone
  phoneFormat: string;
  phoneCountryCode: string;
  // Payment
  showPix: boolean;
  // Address
  addressOrder: "number-street" | "street-number"; // US: 123 Main St | BR: Rua Principal, 123
  stateMaxLength: number; // 2 for US states, 2 for BR states
  zipLabel: string;
  zipMaxLength: number;
  zipKeyboardType: "numeric" | "default";
}

const US_CONFIG: MarketConfig = {
  market: "US",
  dateFormat: "MM/DD/YYYY",
  dateSeparator: "/",
  timeFormat: "12h",
  dateLocale: "en-US",
  distanceUnit: "mi",
  distanceLabel: "miles",
  speedUnit: "mph",
  currency: "USD",
  currencySymbol: "$",
  currencyLocale: "en-US",
  taxIdType: "EIN",
  taxIdLabel: "EIN",
  taxIdMask: "XX-XXXXXXX",
  personalIdType: "SSN",
  personalIdLabel: "SSN",
  personalIdMask: "XXX-XX-XXXX",
  personalIdLastDigits: 4,
  phoneFormat: "(XXX) XXX-XXXX",
  phoneCountryCode: "+1",
  showPix: false,
  addressOrder: "number-street",
  stateMaxLength: 2,
  zipLabel: "ZIP Code",
  zipMaxLength: 10,
  zipKeyboardType: "numeric",
};

const BR_CONFIG: MarketConfig = {
  market: "BR",
  dateFormat: "DD/MM/YYYY",
  dateSeparator: "/",
  timeFormat: "24h",
  dateLocale: "pt-BR",
  distanceUnit: "km",
  distanceLabel: "km",
  speedUnit: "km/h",
  currency: "BRL",
  currencySymbol: "R$",
  currencyLocale: "pt-BR",
  taxIdType: "CNPJ",
  taxIdLabel: "CNPJ",
  taxIdMask: "XX.XXX.XXX/XXXX-XX",
  personalIdType: "CPF",
  personalIdLabel: "CPF",
  personalIdMask: "XXX.XXX.XXX-XX",
  personalIdLastDigits: 2,
  phoneFormat: "(XX) XXXXX-XXXX",
  phoneCountryCode: "+55",
  showPix: true,
  addressOrder: "street-number",
  stateMaxLength: 2,
  zipLabel: "CEP",
  zipMaxLength: 9,
  zipKeyboardType: "numeric",
};

/**
 * Get market config based on app language.
 * Portuguese → BR market, everything else → US market.
 */
export function getMarketConfig(language: string): MarketConfig {
  if (language === "pt") {
    return BR_CONFIG;
  }
  return US_CONFIG;
}

/**
 * Detect market from language code
 */
export function detectMarket(language: string): Market {
  return language === "pt" ? "BR" : "US";
}

/**
 * Format a distance value with correct unit
 */
export function formatMarketDistance(
  valueKm: number,
  language: string,
): string {
  const config = getMarketConfig(language);
  if (config.distanceUnit === "mi") {
    const miles = valueKm * 0.621371;
    return `${miles.toFixed(1)} ${config.distanceLabel}`;
  }
  return `${valueKm.toFixed(1)} ${config.distanceLabel}`;
}

/**
 * Format currency with correct locale
 */
export function formatMarketCurrency(
  amount: number,
  language: string,
): string {
  const config = getMarketConfig(language);
  if (config.currency === "BRL") {
    return `${config.currencySymbol} ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${config.currencySymbol}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format date according to market
 */
export function formatMarketDate(
  date: Date | string,
  language: string,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const config = getMarketConfig(language);
  return d.toLocaleDateString(config.dateLocale);
}

/**
 * Format time according to market (12h vs 24h)
 */
export function formatMarketTime(
  date: Date | string,
  language: string,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const config = getMarketConfig(language);
  if (config.timeFormat === "12h") {
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }
  return d.toLocaleTimeString(config.dateLocale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Mask the personal ID showing only last N digits
 */
export function maskPersonalId(
  id: string,
  language: string,
): string {
  const config = getMarketConfig(language);
  const digits = id.replace(/\D/g, "");
  const lastN = config.personalIdLastDigits;
  if (digits.length <= lastN) return digits;
  const visible = digits.slice(-lastN);
  const masked = "•".repeat(digits.length - lastN);
  return `${masked}${visible}`;
}

/**
 * Convert km to market distance unit
 */
export function kmToMarketUnit(km: number, language: string): number {
  const config = getMarketConfig(language);
  return config.distanceUnit === "mi" ? km * 0.621371 : km;
}

/**
 * Get the distance unit label
 */
export function getDistanceLabel(language: string): string {
  return getMarketConfig(language).distanceLabel;
}

export default {
  getMarketConfig,
  detectMarket,
  formatMarketDistance,
  formatMarketCurrency,
  formatMarketDate,
  formatMarketTime,
  maskPersonalId,
  kmToMarketUnit,
  getDistanceLabel,
};
