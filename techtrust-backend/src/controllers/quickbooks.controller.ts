/**
 * ============================================
 * QUICKBOOKS CONTROLLER
 * ============================================
 * Endpoints para integração QuickBooks Online:
 *  - OAuth 2.0 flow (connect / callback)
 *  - Test connection
 *  - Sync transaction manually
 *  - Get Sales Tax Liability Report (DR-15)
 */

import { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import * as qboService from "../services/quickbooks.service";

const QBO_AUTH_BASE = "https://appcenter.intuit.com/connect/oauth2";
const QBO_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

// ============================================
// GET /api/v1/quickbooks/auth
// Inicia OAuth flow (admin abre no browser)
// ============================================
export const startAuth = asyncHandler(async (_req: Request, res: Response) => {
  const clientId = process.env.QBO_CLIENT_ID;
  const redirectUri = process.env.QBO_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res.status(500).json({
      success: false,
      error: "QBO_CLIENT_ID or QBO_REDIRECT_URI not configured in .env",
    });
  }

  const state = Math.random().toString(36).substring(2, 15);
  const scope = "com.intuit.quickbooks.accounting";

  const authUrl = new URL(QBO_AUTH_BASE);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("state", state);

  // Redireciona direto para a Intuit
  return res.redirect(authUrl.toString());
});

// ============================================
// GET /api/v1/quickbooks/callback
// Callback OAuth - recebe code e realmId da Intuit
// ============================================
export const oauthCallback = asyncHandler(async (req: Request, res: Response) => {
  const { code, realmId, error } = req.query as Record<string, string>;

  if (error) {
    return res.status(400).send(`<h1>QuickBooks connection failed</h1><p>${error}</p>`);
  }

  if (!code || !realmId) {
    return res.status(400).send("<h1>Missing code or realmId from QuickBooks</h1>");
  }

  const clientId = process.env.QBO_CLIENT_ID!;
  const clientSecret = process.env.QBO_CLIENT_SECRET!;
  const redirectUri = process.env.QBO_REDIRECT_URI!;

  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const response = await fetch(QBO_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      logger.error("QBO token exchange failed", { status: response.status, body: text });
      return res.status(500).send(`<h1>Token exchange failed</h1><pre>${text}</pre>`);
    }

    const tokens = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      x_refresh_token_expires_in: number;
    };

    // Persiste tokens na tabela SystemConfig (upsert por key)
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

    const accessExp = new Date(Date.now() + tokens.expires_in * 1000);
    const refreshExp = new Date(Date.now() + tokens.x_refresh_token_expires_in * 1000);

    await prisma.$executeRawUnsafe(
      `INSERT INTO "QuickBooksConfig" (id, "realmId", "accessToken", "refreshToken", "accessTokenExpiresAt", "refreshTokenExpiresAt", "updatedAt")
       VALUES ('singleton', $1, $2, $3, $4, $5, NOW())
       ON CONFLICT (id) DO UPDATE SET
         "realmId" = EXCLUDED."realmId",
         "accessToken" = EXCLUDED."accessToken",
         "refreshToken" = EXCLUDED."refreshToken",
         "accessTokenExpiresAt" = EXCLUDED."accessTokenExpiresAt",
         "refreshTokenExpiresAt" = EXCLUDED."refreshTokenExpiresAt",
         "updatedAt" = NOW()`,
      realmId,
      tokens.access_token,
      tokens.refresh_token,
      accessExp,
      refreshExp,
    );

    // Também atualiza process.env para uso imediato
    process.env.QBO_REALM_ID = realmId;
    process.env.QBO_ACCESS_TOKEN = tokens.access_token;
    process.env.QBO_REFRESH_TOKEN = tokens.refresh_token;

    logger.info("QuickBooks connected successfully", { realmId });

    return res.send(`
      <html>
        <head><title>QuickBooks Connected</title></head>
        <body style="font-family: sans-serif; padding: 40px; max-width: 600px; margin: auto;">
          <h1 style="color: #2ca01c;">✓ QuickBooks connected successfully</h1>
          <p><strong>Realm ID:</strong> <code>${realmId}</code></p>
          <p>Os tokens foram salvos. Adicione ao seu <code>.env</code> de produção:</p>
          <pre style="background: #f5f5f5; padding: 16px; border-radius: 8px;">
QBO_REALM_ID=${realmId}
QBO_ACCESS_TOKEN=${tokens.access_token}
QBO_REFRESH_TOKEN=${tokens.refresh_token}
          </pre>
          <p style="color: #666; font-size: 14px;">
            O access token expira em ${tokens.expires_in}s mas será renovado automaticamente.
            O refresh token expira em ~100 dias (re-autorize antes disso).
          </p>
          <p>Você já pode fechar esta janela.</p>
        </body>
      </html>
    `);
  } catch (err: any) {
    logger.error("QuickBooks OAuth callback error", { error: err.message });
    return res.status(500).send(`<h1>OAuth error</h1><pre>${err.message}</pre>`);
  }
});

// ============================================
// GET /api/v1/quickbooks/status
// Testa conexão (admin only)
// ============================================
export const getStatus = asyncHandler(async (_req: Request, res: Response) => {
  try {
    const hasCredentials = !!(
      process.env.QBO_CLIENT_ID &&
      process.env.QBO_CLIENT_SECRET
    );

    if (!hasCredentials) {
      return res.json({
        success: true,
        data: {
          connected: false,
          configured: false,
          message: "QuickBooks not yet connected. Visit /api/v1/quickbooks/auth to authorize.",
        },
      });
    }

    const result = await qboService.testConnection();
    return res.json({
      success: true,
      data: {
        connected: result.connected,
        configured: true,
        companyName: result.companyName,
        environment: process.env.QBO_ENVIRONMENT || "sandbox",
        realmId: result.realmId || process.env.QBO_REALM_ID,
      },
    });
  } catch (err: any) {
    return res.json({
      success: true,
      data: {
        connected: false,
        configured: true,
        error: err.message,
      },
    });
  }
});

// ============================================
// POST /api/v1/quickbooks/sync-payment/:paymentId
// Sincroniza um pagamento manualmente (admin only)
// ============================================
export const syncPayment = asyncHandler(async (req: Request, res: Response) => {
  const { paymentId } = req.params;

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      customer: true,
      workOrder: {
        include: { quote: true },
      },
    },
  });

  if (!payment) {
    return res.status(404).json({ success: false, error: "Payment not found" });
  }

  if (payment.status !== "CAPTURED") {
    return res.status(400).json({
      success: false,
      error: `Payment status is ${payment.status}. Only captured payments can be synced.`,
    });
  }

  try {
    const result = await qboService.syncCapturedPaymentToQuickBooks(payment.id);

    return res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error("QBO sync payment failed", { paymentId, error: err.message });
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// GET /api/v1/quickbooks/tax-report?start=YYYY-MM-DD&end=YYYY-MM-DD
// Sales Tax Liability Report (DR-15 data)
// ============================================
export const getTaxReport = asyncHandler(async (req: Request, res: Response) => {
  const { start, end } = req.query as Record<string, string>;

  if (!start || !end) {
    return res.status(400).json({
      success: false,
      error: "Query params 'start' and 'end' required (YYYY-MM-DD)",
    });
  }

  try {
    // Dados do QBO
    const qboReport = await qboService.getSalesTaxLiabilityReport(start, end);

    // Dados locais do DB (cross-check)
    const payments = await prisma.payment.findMany({
      where: {
        status: "CAPTURED",
        updatedAt: {
          gte: new Date(start),
          lte: new Date(end + "T23:59:59"),
        },
      },
      select: {
        id: true,
        salesTaxAmount: true,
        salesTaxableAmount: true,
        salesTaxCounty: true,
        salesTaxState: true,
        updatedAt: true,
      },
    });

    const localTotals = payments.reduce(
      (acc, p) => ({
        taxCollected: acc.taxCollected + Number(p.salesTaxAmount || 0),
        taxableSales: acc.taxableSales + Number(p.salesTaxableAmount || 0),
        transactionCount: acc.transactionCount + 1,
      }),
      { taxCollected: 0, taxableSales: 0, transactionCount: 0 },
    );

    return res.json({
      success: true,
      data: {
        period: { start, end },
        local: localTotals,
        quickbooks: qboReport,
        byCounty: groupByCounty(payments),
      },
    });
  } catch (err: any) {
    logger.error("Tax report error", { error: err.message });
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// GET /api/v1/quickbooks/disconnect
// Requerido pela Intuit para apps de produção
// ============================================
export const disconnect = asyncHandler(async (_req: Request, res: Response) => {
  return res.send(`
    <html>
      <head><title>QuickBooks Disconnected</title></head>
      <body style="font-family: sans-serif; padding: 40px; max-width: 600px; margin: auto;">
        <h1>QuickBooks Disconnected</h1>
        <p>The connection between TechTrust AutoSolutions and QuickBooks has been removed.</p>
        <p>To reconnect, visit <a href="/api/v1/quickbooks/auth">Reconnect QuickBooks</a>.</p>
      </body>
    </html>
  `);
});

function groupByCounty(payments: any[]) {
  const map = new Map<string, { tax: number; taxable: number; count: number }>();
  for (const p of payments) {
    const county = p.salesTaxCounty || "Unknown";
    const existing = map.get(county) || { tax: 0, taxable: 0, count: 0 };
    existing.tax += Number(p.salesTaxAmount || 0);
    existing.taxable += Number(p.salesTaxableAmount || 0);
    existing.count += 1;
    map.set(county, existing);
  }
  return Array.from(map.entries()).map(([county, data]) => ({ county, ...data }));
}
