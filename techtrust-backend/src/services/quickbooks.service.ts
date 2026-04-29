/**
 * ============================================
 * QUICKBOOKS SERVICE - QuickBooks Online Integration
 * ============================================
 * Syncs transactions to QuickBooks Online for:
 * - Sales tax tracking and DR-15 filing
 * - Revenue recognition
 * - Automated bookkeeping
 *
 * Auth: OAuth 2.0 with refresh tokens
 * API: QuickBooks Online Accounting API v3
 *
 * Required env vars:
 *   QBO_CLIENT_ID, QBO_CLIENT_SECRET, QBO_REDIRECT_URI,
 *   QBO_REALM_ID, QBO_ACCESS_TOKEN, QBO_REFRESH_TOKEN,
 *   QBO_ENVIRONMENT (sandbox | production)
 */

import { logger } from "../config/logger";
import { prisma } from "../config/database";

// ============================================
// CONFIG
// ============================================

const QBO_BASE_URL = process.env.QBO_ENVIRONMENT === "production"
  ? "https://quickbooks.api.intuit.com"
  : "https://sandbox-quickbooks.api.intuit.com";

const QBO_AUTH_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

interface QBOConfig {
  clientId: string;
  clientSecret: string;
  realmId: string;
  accessToken: string;
  refreshToken: string;
  source: "env" | "database";
}

async function getStoredQuickBooksConfig(): Promise<Partial<QBOConfig> | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{
      realmId: string;
      accessToken: string;
      refreshToken: string;
    }>>(
      `SELECT "realmId", "accessToken", "refreshToken"
       FROM "QuickBooksConfig"
       WHERE id = 'singleton'
       LIMIT 1`,
    );

    const row = rows[0];
    if (!row) return null;

    return {
      realmId: row.realmId,
      accessToken: row.accessToken,
      refreshToken: row.refreshToken,
      source: "database",
    };
  } catch {
    return null;
  }
}

async function persistTokens(config: QBOConfig, data: {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  x_refresh_token_expires_in?: number;
}) {
  const refreshToken = data.refresh_token || config.refreshToken;
  const accessExp = new Date(Date.now() + data.expires_in * 1000);
  const refreshExp = new Date(
    Date.now() + (data.x_refresh_token_expires_in || 100 * 24 * 60 * 60) * 1000,
  );

  process.env.QBO_ACCESS_TOKEN = data.access_token;
  process.env.QBO_REFRESH_TOKEN = refreshToken;

  if (config.source !== "database") return;

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "QuickBooksConfig" (
      "id" TEXT PRIMARY KEY DEFAULT 'singleton',
      "realmId" TEXT NOT NULL,
      "accessToken" TEXT NOT NULL,
      "refreshToken" TEXT NOT NULL,
      "accessTokenExpiresAt" TIMESTAMP NOT NULL,
      "refreshTokenExpiresAt" TIMESTAMP NOT NULL,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await prisma.$executeRawUnsafe(
    `INSERT INTO "QuickBooksConfig" (id, "realmId", "accessToken", "refreshToken", "accessTokenExpiresAt", "refreshTokenExpiresAt", "updatedAt")
     VALUES ('singleton', $1, $2, $3, $4, $5, NOW())
     ON CONFLICT (id) DO UPDATE SET
       "accessToken" = EXCLUDED."accessToken",
       "refreshToken" = EXCLUDED."refreshToken",
       "accessTokenExpiresAt" = EXCLUDED."accessTokenExpiresAt",
       "refreshTokenExpiresAt" = EXCLUDED."refreshTokenExpiresAt",
       "updatedAt" = NOW()`,
    config.realmId,
    data.access_token,
    refreshToken,
    accessExp,
    refreshExp,
  );
}

async function getConfig(): Promise<QBOConfig> {
  const stored = await getStoredQuickBooksConfig();
  const clientId = process.env.QBO_CLIENT_ID;
  const clientSecret = process.env.QBO_CLIENT_SECRET;
  const realmId = stored?.realmId || process.env.QBO_REALM_ID;
  const accessToken = stored?.accessToken || process.env.QBO_ACCESS_TOKEN;
  const refreshToken = stored?.refreshToken || process.env.QBO_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !realmId || !accessToken || !refreshToken) {
    throw new Error(
      "QuickBooks config missing. Set QBO_CLIENT_ID/QBO_CLIENT_SECRET and connect QuickBooks via /api/v1/quickbooks/auth.",
    );
  }

  return {
    clientId,
    clientSecret,
    realmId,
    accessToken,
    refreshToken,
    source: stored ? "database" : "env",
  };
}

// ============================================
// TOKEN MANAGEMENT
// ============================================

let cachedAccessToken: string | null = null;
let tokenExpiresAt: number = 0;

/**
 * Get a valid access token, refreshing if needed.
 */
async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < tokenExpiresAt) {
    return cachedAccessToken;
  }

  const config = await getConfig();
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");

  const response = await fetch(QBO_AUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: config.refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`QBO token refresh failed: ${response.status} ${error}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    x_refresh_token_expires_in?: number;
  };
  cachedAccessToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000; // Refresh 60s early

  await persistTokens(config, data);

  logger.info("QuickBooks access token refreshed");
  return cachedAccessToken!;
}

// ============================================
// API HELPERS
// ============================================

async function qboRequest(method: string, endpoint: string, body?: any): Promise<any> {
  const config = await getConfig();
  const token = await getAccessToken();
  const url = `${QBO_BASE_URL}/v3/company/${config.realmId}/${endpoint}`;

  const response = await fetch(url, {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`QBO API error ${response.status}: ${error}`);
  }

  return response.json();
}

export function isQuickBooksConfigured(): boolean {
  return Boolean(process.env.QBO_CLIENT_ID && process.env.QBO_CLIENT_SECRET);
}

// ============================================
// SALES RECEIPT (for completed service payments)
// ============================================

export interface QBOSalesReceiptLine {
  description: string;
  amount: number;
  /** QBO Item reference ID — must be pre-configured in QBO */
  itemRefId?: string;
  /** Whether this line is taxable */
  taxable: boolean;
}

export interface CreateSalesReceiptParams {
  paymentNumber: string;
  customerName: string;
  customerEmail: string;
  transactionDate: string; // YYYY-MM-DD
  // Line items
  partsAmount: number;
  laborAmount: number;
  appServiceFee: number;
  processingFee: number;
  travelFee?: number;
  shopSuppliesFee?: number;
  // Sales tax
  salesTaxAmount: number;
  salesTaxRate: number;
  salesTaxCounty?: string;
  // Total
  totalAmount: number;
  // Reference
  stripePaymentIntentId?: string;
  memo?: string;
}

/**
 * Create a Sales Receipt in QuickBooks Online.
 *
 * Maps TechTrust transaction to QBO with proper tax coding:
 * - Parts → Taxable (Sales Tax item)
 * - Shop Supplies → Taxable
 * - Labor → Non-Taxable
 * - Travel Fee → Non-Taxable
 * - App Service Fee → Non-Taxable (platform fee)
 * - Processing Fee → Non-Taxable
 */
export async function createSalesReceipt(params: CreateSalesReceiptParams): Promise<{
  qboReceiptId: string;
  docNumber: string;
}> {
  if (!process.env.QBO_CLIENT_ID) {
    logger.warn("QuickBooks not configured, skipping sales receipt sync");
    return { qboReceiptId: "not_configured", docNumber: params.paymentNumber };
  }

  const lines: any[] = [];
  let lineNum = 1;

  // Parts (taxable)
  if (params.partsAmount > 0) {
    lines.push({
      LineNum: lineNum++,
      Amount: params.partsAmount,
      DetailType: "SalesItemLineDetail",
      Description: "Auto Parts & Materials",
      SalesItemLineDetail: {
        ItemRef: { value: process.env.QBO_ITEM_PARTS || "1", name: "Parts" },
        Qty: 1,
        UnitPrice: params.partsAmount,
        TaxCodeRef: { value: "TAX" }, // Taxable
      },
    });
  }

  // Shop Supplies (taxable)
  if (params.shopSuppliesFee && params.shopSuppliesFee > 0) {
    lines.push({
      LineNum: lineNum++,
      Amount: params.shopSuppliesFee,
      DetailType: "SalesItemLineDetail",
      Description: "Shop Supplies",
      SalesItemLineDetail: {
        ItemRef: { value: process.env.QBO_ITEM_SUPPLIES || "2", name: "Shop Supplies" },
        Qty: 1,
        UnitPrice: params.shopSuppliesFee,
        TaxCodeRef: { value: "TAX" }, // Taxable
      },
    });
  }

  // Labor (NON-taxable in FL)
  if (params.laborAmount > 0) {
    lines.push({
      LineNum: lineNum++,
      Amount: params.laborAmount,
      DetailType: "SalesItemLineDetail",
      Description: "Labor / Service",
      SalesItemLineDetail: {
        ItemRef: { value: process.env.QBO_ITEM_LABOR || "3", name: "Labor" },
        Qty: 1,
        UnitPrice: params.laborAmount,
        TaxCodeRef: { value: "NON" }, // Non-taxable
      },
    });
  }

  // Travel Fee (NON-taxable)
  if (params.travelFee && params.travelFee > 0) {
    lines.push({
      LineNum: lineNum++,
      Amount: params.travelFee,
      DetailType: "SalesItemLineDetail",
      Description: "Travel / Displacement Fee",
      SalesItemLineDetail: {
        ItemRef: { value: process.env.QBO_ITEM_TRAVEL || "4", name: "Travel Fee" },
        Qty: 1,
        UnitPrice: params.travelFee,
        TaxCodeRef: { value: "NON" },
      },
    });
  }

  // App Service Fee (NON-taxable platform fee)
  if (params.appServiceFee > 0) {
    lines.push({
      LineNum: lineNum++,
      Amount: params.appServiceFee,
      DetailType: "SalesItemLineDetail",
      Description: "TechTrust App Service Fee",
      SalesItemLineDetail: {
        ItemRef: { value: process.env.QBO_ITEM_APP_FEE || "5", name: "App Service Fee" },
        Qty: 1,
        UnitPrice: params.appServiceFee,
        TaxCodeRef: { value: "NON" },
      },
    });
  }

  const salesReceipt: any = {
    DocNumber: params.paymentNumber,
    TxnDate: params.transactionDate,
    PrivateNote: params.memo || `Stripe: ${params.stripePaymentIntentId || "N/A"}`,
    CustomerMemo: { value: `TechTrust Service - ${params.paymentNumber}` },
    Line: lines,
    // Tax detail (FL Sales Tax)
    TxnTaxDetail: {
      TotalTax: params.salesTaxAmount,
    },
  };

  // Set customer ref if we can find/create them
  // For now, use display name
  salesReceipt.CustomerRef = {
    value: "1", // Default customer — should be looked up/created
    name: params.customerName,
  };

  try {
    const result = await qboRequest("POST", "salesreceipt", salesReceipt);
    const receipt = result.SalesReceipt;

    logger.info(
      `QBO Sales Receipt created: ${receipt.Id} (DocNumber: ${receipt.DocNumber}) ` +
      `for ${params.paymentNumber}, tax: $${params.salesTaxAmount.toFixed(2)}`,
    );

    return {
      qboReceiptId: receipt.Id,
      docNumber: receipt.DocNumber,
    };
  } catch (err: any) {
    logger.error(`Failed to create QBO sales receipt: ${err.message}`);
    throw err;
  }
}

export async function syncCapturedPaymentToQuickBooks(paymentId: string): Promise<{
  qboReceiptId: string;
  docNumber: string;
} | null> {
  if (!isQuickBooksConfigured()) {
    logger.warn("QuickBooks not configured, skipping captured payment sync");
    return null;
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      customer: true,
      workOrder: {
        include: { quote: true },
      },
    },
  });

  if (!payment) throw new Error("Payment not found");
  if (payment.status !== "CAPTURED") {
    throw new Error(`Payment status is ${payment.status}. Only captured payments can be synced.`);
  }

  const quote = payment.workOrder?.quote;
  const txnDate = (payment.capturedAt || payment.updatedAt || payment.createdAt)
    .toISOString()
    .slice(0, 10);

  return createSalesReceipt({
    paymentNumber: payment.paymentNumber,
    customerName: payment.customer?.fullName || "TechTrust Customer",
    customerEmail: payment.customer?.email || "customer@techtrustautosolutions.com",
    transactionDate: txnDate,
    partsAmount: Number(quote?.partsCost || 0),
    laborAmount: Number(quote?.laborCost || 0),
    travelFee: Number(quote?.travelFee || 0),
    shopSuppliesFee: Number(quote?.shopSuppliesFee || 0),
    appServiceFee: Number(payment.appServiceFee || 0),
    processingFee: Number(payment.processingFee || 0),
    salesTaxAmount: Number(payment.salesTaxAmount || 0),
    salesTaxRate: Number(payment.salesTaxRate || 0),
    salesTaxCounty: payment.salesTaxCounty || undefined,
    totalAmount: Number(payment.totalAmount || 0),
    stripePaymentIntentId: payment.stripePaymentIntentId || undefined,
    memo: `TechTrust Marketplace — Payment ${payment.paymentNumber}`,
  });
}

// ============================================
// TAX REPORTING
// ============================================

/**
 * Query QuickBooks for Sales Tax Liability Report.
 * Used to generate data for FL DR-15 filing.
 */
export async function getSalesTaxLiabilityReport(
  startDate: string, // YYYY-MM-DD
  endDate: string,
): Promise<any> {
  if (!process.env.QBO_CLIENT_ID) {
    logger.warn("QuickBooks not configured");
    return null;
  }

  const result = await qboRequest(
    "GET",
    `reports/TaxSummary?start_date=${startDate}&end_date=${endDate}`,
  );

  logger.info(`QBO Tax Summary Report fetched: ${startDate} to ${endDate}`);
  return result;
}

/**
 * Get all sales transactions with tax details for a period.
 * Useful for DR-15 line-item verification.
 */
export async function getTaxableTransactions(
  startDate: string,
  endDate: string,
): Promise<any> {
  if (!process.env.QBO_CLIENT_ID) {
    logger.warn("QuickBooks not configured");
    return null;
  }

  const query = encodeURIComponent(
    `SELECT * FROM SalesReceipt WHERE TxnDate >= '${startDate}' AND TxnDate <= '${endDate}' ORDERBY TxnDate`,
  );

  const result = await qboRequest("GET", `query?query=${query}`);
  return result;
}

// ============================================
// HEALTH CHECK
// ============================================

/**
 * Test QuickBooks connection.
 */
export async function testConnection(): Promise<{ connected: boolean; companyName?: string; realmId?: string }> {
  try {
    if (!process.env.QBO_CLIENT_ID || !process.env.QBO_CLIENT_SECRET) {
      return { connected: false };
    }

    const config = await getConfig();
    const result = await qboRequest("GET", "companyinfo/" + config.realmId);
    return {
      connected: true,
      companyName: result.CompanyInfo?.CompanyName,
      realmId: config.realmId,
    };
  } catch (err: any) {
    logger.error(`QBO connection test failed: ${err.message}`);
    return { connected: false };
  }
}
