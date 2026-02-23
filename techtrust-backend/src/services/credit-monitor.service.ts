/**
 * ============================================
 * CREDIT MONITOR SERVICE
 * ============================================
 * Monitora o consumo de créditos de APIs pagas.
 *
 * ATUALMENTE: VehicleDatabases.com (Camada 1)
 *   Starter Plan: $100/mês = 500 créditos
 *   Cada chamada: 1 crédito
 *
 * CIRCUIT BREAKER: Desliga automaticamente quando créditos ficam baixos.
 *   - 30% restante → ALERTA (log + notificação admin)
 *   - 15% restante → THROTTLE (só premium, 1 req/min)
 *   - 5% restante → HALT (bloqueia chamadas, usa fallback gratuito)
 *
 * CUSTO: $0 — lógica interna de monitoramento.
 * API PAGA: VehicleDatabases.com $100/mês (quando ativada).
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════
// Configuração
// ═══════════════════════════════════════════════

interface PlanConfig {
  provider: string;
  planName: string;
  creditsTotal: number;
  monthlyCost: number;
  resetDay: number; // dia do mês que os créditos resetam
}

const API_PLANS: Record<string, PlanConfig> = {
  vehicledatabases: {
    provider: 'VehicleDatabases',
    planName: 'Starter',
    creditsTotal: 500,
    monthlyCost: 100,
    resetDay: 1,
  },
};

// Circuit breaker thresholds
const THRESHOLDS = {
  ALERT: 0.30,    // 30% restante → alerta
  THROTTLE: 0.15, // 15% restante → throttle
  HALT: 0.05,     // 5% restante → halt
};

// ═══════════════════════════════════════════════
// Estado em memória (cache)
// ═══════════════════════════════════════════════

interface CreditState {
  provider: string;
  creditsLeft: number;
  creditsTotal: number;
  percentLeft: number;
  status: 'NORMAL' | 'ALERT' | 'THROTTLE' | 'HALT';
  lastCheck: Date;
  dailyAverage: number;
  daysRemaining: number;
  lastThrottleTime: number; // timestamp para rate limit
}

const creditStates = new Map<string, CreditState>();

// ═══════════════════════════════════════════════
// Core Functions
// ═══════════════════════════════════════════════

/**
 * Verifica se uma chamada à API pode ser feita.
 * Central check — todas as chamadas a APIs pagas passam por aqui.
 *
 * @returns true se pode prosseguir, false se bloqueado
 */
export function canMakeApiCall(provider: string): {
  allowed: boolean;
  reason?: string;
  status: string;
} {
  const state = creditStates.get(provider);

  if (!state) {
    // Sem estado → permitir (primeira chamada)
    return { allowed: true, status: 'UNKNOWN' };
  }

  switch (state.status) {
    case 'HALT':
      return {
        allowed: false,
        reason: `API credits critically low (${state.percentLeft.toFixed(1)}%). Using free fallback.`,
        status: 'HALT',
      };

    case 'THROTTLE': {
      // Rate limit: 1 chamada por minuto
      const now = Date.now();
      const elapsed = now - state.lastThrottleTime;
      if (elapsed < 60_000) {
        return {
          allowed: false,
          reason: `API throttled. Wait ${Math.ceil((60_000 - elapsed) / 1000)}s.`,
          status: 'THROTTLE',
        };
      }
      // Atualizar timestamp
      state.lastThrottleTime = now;
      return { allowed: true, status: 'THROTTLE' };
    }

    case 'ALERT':
      return { allowed: true, status: 'ALERT' };

    default:
      return { allowed: true, status: 'NORMAL' };
  }
}

/**
 * Registra consumo de 1 crédito.
 * Atualiza estado e verifica thresholds.
 */
export async function recordCreditUsage(
  provider: string,
  creditsUsed: number = 1,
): Promise<void> {
  const state = creditStates.get(provider);
  if (!state) return;

  state.creditsLeft = Math.max(0, state.creditsLeft - creditsUsed);
  state.percentLeft = state.creditsLeft / state.creditsTotal;

  // Recalcular status
  const previousStatus = state.status;
  if (state.percentLeft <= THRESHOLDS.HALT) {
    state.status = 'HALT';
  } else if (state.percentLeft <= THRESHOLDS.THROTTLE) {
    state.status = 'THROTTLE';
  } else if (state.percentLeft <= THRESHOLDS.ALERT) {
    state.status = 'ALERT';
  } else {
    state.status = 'NORMAL';
  }

  // Se mudou de status, notificar admin
  if (state.status !== previousStatus && state.status !== 'NORMAL') {
    await notifyAdminCreditStatus(provider, state);
  }
}

/**
 * Atualiza o estado de créditos de um provider.
 * Chamado periodicamente ou manualmente.
 */
export async function updateCreditState(
  provider: string,
  creditsLeft: number,
): Promise<CreditState> {
  const plan = API_PLANS[provider.toLowerCase()];
  if (!plan) {
    throw new Error(`Unknown API provider: ${provider}`);
  }

  const percentLeft = creditsLeft / plan.creditsTotal;

  // Calcular média diária e dias restantes
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysElapsed = Math.max(1, dayOfMonth - plan.resetDay + 1);
  const creditsUsed = plan.creditsTotal - creditsLeft;
  const dailyAverage = creditsUsed / daysElapsed;
  const daysRemaining = dailyAverage > 0
    ? Math.floor(creditsLeft / dailyAverage)
    : 999;

  let status: CreditState['status'] = 'NORMAL';
  if (percentLeft <= THRESHOLDS.HALT) {
    status = 'HALT';
  } else if (percentLeft <= THRESHOLDS.THROTTLE) {
    status = 'THROTTLE';
  } else if (percentLeft <= THRESHOLDS.ALERT) {
    status = 'ALERT';
  }

  const state: CreditState = {
    provider,
    creditsLeft,
    creditsTotal: plan.creditsTotal,
    percentLeft,
    status,
    lastCheck: now,
    dailyAverage: parseFloat(dailyAverage.toFixed(1)),
    daysRemaining,
    lastThrottleTime: 0,
  };

  creditStates.set(provider.toLowerCase(), state);

  // Persistir log
  await prisma.apiCreditLog.create({
    data: {
      provider,
      planName: plan.planName,
      creditsTotal: plan.creditsTotal,
      creditsLeft,
      percentLeft: parseFloat((percentLeft * 100).toFixed(1)),
      dailyAverage: parseFloat(dailyAverage.toFixed(1)),
      daysRemaining,
    },
  });

  console.log(
    `[CREDIT] ${provider}: ${creditsLeft}/${plan.creditsTotal} (${(percentLeft * 100).toFixed(1)}%) — Status: ${status}`,
  );

  return state;
}

// ═══════════════════════════════════════════════
// Admin Notifications
// ═══════════════════════════════════════════════

/**
 * Notifica admins quando créditos atingem threshold.
 */
async function notifyAdminCreditStatus(
  provider: string,
  state: CreditState,
): Promise<void> {
  try {
    // Buscar admins
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });

    const severity = state.status === 'HALT' ? '🔴 CRITICAL'
      : state.status === 'THROTTLE' ? '🟠 WARNING'
      : '🟡 ALERT';

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'SYSTEM_ALERT',
          title: `${severity} — API Credits Low`,
          message: `${provider}: ${state.creditsLeft}/${state.creditsTotal} credits remaining (${(state.percentLeft * 100).toFixed(1)}%). ` +
            `Status: ${state.status}. Est. ${state.daysRemaining} days remaining at current rate.`,
          data: JSON.stringify({
            action: 'API_CREDIT_ALERT',
            provider,
            status: state.status,
            creditsLeft: state.creditsLeft,
            percentLeft: state.percentLeft,
          }),
        },
      });
    }

    console.log(
      `[CREDIT] Admin notified: ${provider} status changed to ${state.status}`,
    );
  } catch (err) {
    console.error('[CREDIT] notifyAdminCreditStatus error:', err);
  }
}

// ═══════════════════════════════════════════════
// Dashboard / Reporting
// ═══════════════════════════════════════════════

/**
 * Retorna o estado atual de todos os providers monitorados.
 * Usado pelo admin dashboard.
 */
export function getAllCreditStates(): CreditState[] {
  return Array.from(creditStates.values());
}

/**
 * Retorna o estado de um provider específico.
 */
export function getCreditState(provider: string): CreditState | null {
  return creditStates.get(provider.toLowerCase()) || null;
}

/**
 * Retorna histórico de consumo de créditos.
 */
export async function getCreditHistory(params: {
  provider?: string;
  days?: number;
  limit?: number;
}): Promise<any[]> {
  const where: any = {};

  if (params.provider) {
    where.provider = params.provider;
  }

  if (params.days) {
    const since = new Date();
    since.setDate(since.getDate() - params.days);
    where.createdAt = { gte: since };
  }

  return prisma.apiCreditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: params.limit || 30,
  });
}

// ═══════════════════════════════════════════════
// Inicialização
// ═══════════════════════════════════════════════

let creditMonitorInterval: NodeJS.Timeout | null = null;

/**
 * Inicia o monitoramento periódico.
 * Check a cada 6 horas.
 *
 * NOTA: VehicleDatabases ainda não ativado.
 * Quando for ativado, chamar updateCreditState() aqui
 * com os dados da API de billing deles.
 */
export function startCreditMonitor(): void {
  if (creditMonitorInterval) return;

  const SIX_HOURS = 6 * 60 * 60 * 1000;

  creditMonitorInterval = setInterval(async () => {
    // TODO: Quando VehicleDatabases for ativado:
    // const billing = await fetchVDBBilling();
    // await updateCreditState('vehicledatabases', billing.creditsLeft);
    console.log('[CREDIT] Monitor check — no active paid APIs yet');
  }, SIX_HOURS);

  console.log('[CREDIT] Monitor started (every 6h)');
}

/**
 * Para o monitor (para testes).
 */
export function stopCreditMonitor(): void {
  if (creditMonitorInterval) {
    clearInterval(creditMonitorInterval);
    creditMonitorInterval = null;
    console.log('[CREDIT] Monitor stopped');
  }
}
