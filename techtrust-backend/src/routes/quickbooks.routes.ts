/**
 * ============================================
 * QUICKBOOKS ROUTES
 * ============================================
 * /auth            → OAuth 2.0 start (public — admin-only in production via proxy)
 * /callback        → OAuth callback (public — called by Intuit)
 * /status          → Connection test (ADMIN)
 * /sync-payment/:id → Manual payment sync (ADMIN)
 * /tax-report      → Sales Tax Liability report for DR-15 (ADMIN)
 */

import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import * as qboController from "../controllers/quickbooks.controller";

const router = Router();

// OAuth flow — públicas para permitir redirect externo da Intuit
// (protegidas em produção por IP allowlist ou header secreto se necessário)
router.get("/auth", qboController.startAuth);
router.get("/callback", qboController.oauthCallback);

// Admin endpoints
router.get("/status", authenticate, authorize("ADMIN"), qboController.getStatus);
router.post("/sync-payment/:paymentId", authenticate, authorize("ADMIN"), qboController.syncPayment);
router.get("/tax-report", authenticate, authorize("ADMIN"), qboController.getTaxReport);

export default router;
