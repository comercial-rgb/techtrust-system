/**
 * ============================================
 * MILEAGE REMINDER SERVICE
 * ============================================
 * 3 triggers para lembrar o cliente de atualizar a quilometragem:
 *
 * TRIGGER 1 — Pós-Manutenção (automático)
 *   → Após serviço completado, captura mileage da work order
 *   → Cria MileageLog com source='SERVICE_COMPLETION'
 *
 * TRIGGER 2 — Cron (3 dias sem update)
 *   → Se lastMileageUpdate > 3 dias, envia push notification
 *   → Respeita mileageReminderOptOut do User
 *
 * TRIGGER 3 — App Open Banner
 *   → Quando user abre o app, retorna shouldShowMileageBanner
 *   → Banner discreto no topo da Home
 *
 * CUSTO: $0 — lógica interna
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════
// Configuração
// ═══════════════════════════════════════════════

const REMINDER_CONFIG = {
  /** Dias sem update antes de enviar reminder */
  STALE_DAYS: 3,
  /** Máximo de reminders por semana para não incomodar */
  MAX_REMINDERS_PER_WEEK: 2,
  /** Intervalo mínimo entre reminders (horas) */
  MIN_INTERVAL_HOURS: 48,
};

// ═══════════════════════════════════════════════
// Interfaces
// ═══════════════════════════════════════════════

export interface MileageBannerResult {
  shouldShow: boolean;
  vehicles: Array<{
    vehicleId: string;
    make: string;
    model: string;
    year: number;
    currentMileage: number | null;
    daysSinceUpdate: number | null;
  }>;
}

export interface MileageUpdateResult {
  success: boolean;
  vehicleId: string;
  previousMileage: number | null;
  newMileage: number;
  logId: string;
}

// ═══════════════════════════════════════════════
// TRIGGER 1 — Pós-Manutenção (automático)
// ═══════════════════════════════════════════════

/**
 * Chamado após serviço completado (dentro de approveServiceAndProcessPayment).
 * Atualiza a mileagem do veículo a partir da Work Order.
 *
 * Falha silenciosa — não bloqueia o pagamento.
 */
export async function captureMileageFromService(params: {
  vehicleId: string;
  userId: string;
  mileage: number;
  sourceId: string;
  source: 'SERVICE_COMPLETION' | 'WORK_ORDER';
}): Promise<void> {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.vehicleId },
      select: { currentMileage: true },
    });

    if (!vehicle) return;

    // Só atualizar se nova mileagem é maior que a atual
    if (vehicle.currentMileage && params.mileage <= vehicle.currentMileage) {
      return;
    }

    // Atualizar veículo
    await prisma.vehicle.update({
      where: { id: params.vehicleId },
      data: {
        currentMileage: params.mileage,
        lastMileageUpdate: new Date(),
      },
    });

    // Registrar log
    await prisma.mileageLog.create({
      data: {
        vehicleId: params.vehicleId,
        userId: params.userId,
        mileage: params.mileage,
        source: params.source,
        sourceId: params.sourceId,
        previousMileage: vehicle.currentMileage,
      },
    });

    console.log(
      `[MILEAGE] Auto-captured ${params.mileage} mi for vehicle ${params.vehicleId} from ${params.source}`,
    );
  } catch (err) {
    console.error('[MILEAGE] captureMileageFromService error:', err);
    // Falha silenciosa
  }
}

// ═══════════════════════════════════════════════
// TRIGGER 2 — Cron Check (3 dias sem update)
// ═══════════════════════════════════════════════

/**
 * Roda via setInterval (sem node-cron).
 * Envia push notification para usuários com mileagem antiga.
 */
export async function checkStaleMileageAndNotify(): Promise<{
  checked: number;
  notified: number;
}> {
  const result = { checked: 0, notified: 0 };

  try {
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - REMINDER_CONFIG.STALE_DAYS);

    const minInterval = new Date();
    minInterval.setHours(
      minInterval.getHours() - REMINDER_CONFIG.MIN_INTERVAL_HOURS,
    );

    // Buscar veículos com mileagem antiga
    const staleVehicles = await prisma.vehicle.findMany({
      where: {
        isActive: true,
        currentMileage: { not: null },
        OR: [
          { lastMileageUpdate: { lt: staleDate } },
          { lastMileageUpdate: null },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            mileageReminderOptOut: true,
            fcmToken: true,
          },
        },
      },
      take: 100, // Processar em batches
    });

    result.checked = staleVehicles.length;

    for (const vehicle of staleVehicles) {
      // Respeitar opt-out
      if (vehicle.user.mileageReminderOptOut) continue;

      // Verificar intervalo mínimo
      if (
        vehicle.mileageReminderLastSentAt &&
        vehicle.mileageReminderLastSentAt > minInterval
      ) {
        continue;
      }

      // Criar notificação in-app
      await prisma.notification.create({
        data: {
          userId: vehicle.user.id,
          type: 'SYSTEM_ALERT',
          title: 'Update Your Mileage',
          message: `Keep your ${vehicle.year} ${vehicle.make} ${vehicle.model} maintenance schedule accurate. Tap to update your current mileage.`,
          data: JSON.stringify({
            action: 'UPDATE_MILEAGE',
            vehicleId: vehicle.id,
          }),
        },
      });

      // Atualizar timestamp do último reminder
      await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: {
          mileageReminderLastSentAt: new Date(),
          mileageReminderStreak: { increment: 1 },
        },
      });

      result.notified++;
    }

    if (result.notified > 0) {
      console.log(
        `[MILEAGE] Stale check: ${result.checked} vehicles checked, ${result.notified} notified`,
      );
    }
  } catch (err) {
    console.error('[MILEAGE] checkStaleMileageAndNotify error:', err);
  }

  return result;
}

// ═══════════════════════════════════════════════
// TRIGGER 3 — App Open Banner
// ═══════════════════════════════════════════════

/**
 * Chamado quando o app abre (ou na Home screen).
 * Retorna se deve exibir o banner de mileagem + quais veículos.
 */
export async function getMileageBannerData(
  userId: string,
): Promise<MileageBannerResult> {
  // Verifica se user optou por não receber
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mileageReminderOptOut: true },
  });

  if (user?.mileageReminderOptOut) {
    return { shouldShow: false, vehicles: [] };
  }

  const staleDate = new Date();
  staleDate.setDate(staleDate.getDate() - REMINDER_CONFIG.STALE_DAYS);

  const vehicles = await prisma.vehicle.findMany({
    where: {
      userId,
      isActive: true,
      OR: [
        { lastMileageUpdate: { lt: staleDate } },
        { lastMileageUpdate: null, currentMileage: { not: null } },
      ],
    },
    select: {
      id: true,
      make: true,
      model: true,
      year: true,
      currentMileage: true,
      lastMileageUpdate: true,
    },
  });

  if (vehicles.length === 0) {
    return { shouldShow: false, vehicles: [] };
  }

  const now = new Date();
  return {
    shouldShow: true,
    vehicles: vehicles.map((v) => ({
      vehicleId: v.id,
      make: v.make,
      model: v.model,
      year: v.year,
      currentMileage: v.currentMileage,
      daysSinceUpdate: v.lastMileageUpdate
        ? Math.floor(
            (now.getTime() - v.lastMileageUpdate.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : null,
    })),
  };
}

// ═══════════════════════════════════════════════
// Manual Mileage Update
// ═══════════════════════════════════════════════

/**
 * Atualização manual de mileagem pelo cliente.
 * Valida que novo valor é >= atual.
 */
export async function updateMileageManual(params: {
  userId: string;
  vehicleId: string;
  mileage: number;
}): Promise<MileageUpdateResult> {
  const vehicle = await prisma.vehicle.findFirst({
    where: {
      id: params.vehicleId,
      userId: params.userId,
      isActive: true,
    },
    select: { currentMileage: true },
  });

  if (!vehicle) {
    throw new Error('Vehicle not found');
  }

  if (vehicle.currentMileage && params.mileage < vehicle.currentMileage) {
    throw new Error(
      `New mileage (${params.mileage}) cannot be less than current (${vehicle.currentMileage})`,
    );
  }

  // Atualizar veículo
  await prisma.vehicle.update({
    where: { id: params.vehicleId },
    data: {
      currentMileage: params.mileage,
      lastMileageUpdate: new Date(),
      mileageReminderStreak: 0, // Reset streak on manual update
    },
  });

  // Registrar log
  const log = await prisma.mileageLog.create({
    data: {
      vehicleId: params.vehicleId,
      userId: params.userId,
      mileage: params.mileage,
      source: 'MANUAL',
      previousMileage: vehicle.currentMileage,
    },
  });

  console.log(
    `[MILEAGE] Manual update: ${vehicle.currentMileage} → ${params.mileage} for vehicle ${params.vehicleId}`,
  );

  return {
    success: true,
    vehicleId: params.vehicleId,
    previousMileage: vehicle.currentMileage,
    newMileage: params.mileage,
    logId: log.id,
  };
}

// ═══════════════════════════════════════════════
// Opt-out
// ═══════════════════════════════════════════════

/**
 * Permite o user desabilitar lembretes de mileagem.
 */
export async function setMileageReminderOptOut(
  userId: string,
  optOut: boolean,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { mileageReminderOptOut: optOut },
  });
}

// ═══════════════════════════════════════════════
// Mileage History
// ═══════════════════════════════════════════════

/**
 * Retorna o histórico de mileagens para um veículo.
 */
export async function getMileageHistory(params: {
  userId: string;
  vehicleId: string;
  limit?: number;
}): Promise<any[]> {
  return prisma.mileageLog.findMany({
    where: {
      vehicleId: params.vehicleId,
      userId: params.userId,
    },
    orderBy: { createdAt: 'desc' },
    take: params.limit || 20,
  });
}

// ═══════════════════════════════════════════════
// Inicializar cron (via setInterval)
// ═══════════════════════════════════════════════

let mileageCronInterval: NodeJS.Timeout | null = null;

/**
 * Inicia o check periódico de mileagem stale.
 * Roda a cada 12 horas.
 */
export function startMileageReminderCron(): void {
  if (mileageCronInterval) return; // Já rodando

  const TWELVE_HOURS = 12 * 60 * 60 * 1000;

  // Rodar imediatamente na inicialização (com delay de 30s)
  setTimeout(() => {
    checkStaleMileageAndNotify().catch(console.error);
  }, 30_000);

  // Depois a cada 12h
  mileageCronInterval = setInterval(() => {
    checkStaleMileageAndNotify().catch(console.error);
  }, TWELVE_HOURS);

  console.log('[MILEAGE] Reminder cron started (every 12h)');
}

/**
 * Para o cron (para testes).
 */
export function stopMileageReminderCron(): void {
  if (mileageCronInterval) {
    clearInterval(mileageCronInterval);
    mileageCronInterval = null;
    console.log('[MILEAGE] Reminder cron stopped');
  }
}
