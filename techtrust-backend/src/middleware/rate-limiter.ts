/**
 * ============================================
 * RATE LIMITER MIDDLEWARE
 * ============================================
 * Protege contra abuso da API
 */

import type { Request } from "express";
import rateLimit from "express-rate-limit";

/** Rotas autenticadas de pagamento / service-flow — limite por usuário (após authenticate). */
export const paymentFlowRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number.parseInt(process.env.PAYMENT_FLOW_RATE_LIMIT_MAX || "80", 10),
  message: {
    success: false,
    error: "PAYMENT_FLOW_RATE_LIMIT",
    message:
      "Limite de operações de pagamento atingido. Aguarde alguns minutos e tente novamente.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const uid = (req as Request & { user?: { id: string } }).user?.id;
    return uid ? `payment_flow:${uid}` : `payment_flow:${req.ip}`;
  },
});

export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 100 requests
  message: {
    success: false,
    error: 'TOO_MANY_REQUESTS',
    message: 'Muitas requisições. Tente novamente em alguns minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter mais restritivo para autenticação
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas
  message: {
    success: false,
    error: 'TOO_MANY_AUTH_ATTEMPTS',
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  },
  skipSuccessfulRequests: true,
});
