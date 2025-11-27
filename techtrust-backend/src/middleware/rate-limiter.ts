/**
 * ============================================
 * RATE LIMITER MIDDLEWARE
 * ============================================
 * Protege contra abuso da API
 */

import rateLimit from 'express-rate-limit';

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
