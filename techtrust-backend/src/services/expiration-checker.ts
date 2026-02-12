/**
 * Compliance & Insurance Expiration Checker
 * Runs periodically to update statuses and send expiration alerts
 * D-30, D-15, D-7, Expired
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ExpirationAlert {
  providerProfileId: string;
  providerName: string;
  providerId: string;
  entityType: 'COMPLIANCE' | 'INSURANCE';
  entityId: string;
  itemType: string;
  expirationDate: Date;
  daysUntilExpiry: number;
  alertLevel: 'D30' | 'D15' | 'D7' | 'EXPIRED';
}

/**
 * Check all compliance items and insurance policies for upcoming/past expirations
 */
export async function checkExpirations(): Promise<ExpirationAlert[]> {
  const now = new Date();
  const alerts: ExpirationAlert[] = [];

  // Check compliance items with expiration dates
  const complianceItems = await prisma.complianceItem.findMany({
    where: {
      expirationDate: { not: null },
      status: { in: ['VERIFIED', 'PROVIDED_UNVERIFIED'] },
    },
    include: {
      providerProfile: { select: { id: true, businessName: true, userId: true } },
    },
  });

  for (const item of complianceItems) {
    if (!item.expirationDate) continue;
    const daysUntilExpiry = Math.ceil((item.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const alertLevel = getAlertLevel(daysUntilExpiry);

    if (alertLevel) {
      alerts.push({
        providerProfileId: item.providerProfileId,
        providerName: item.providerProfile.businessName,
        providerId: item.providerProfile.userId,
        entityType: 'COMPLIANCE',
        entityId: item.id,
        itemType: item.type,
        expirationDate: item.expirationDate,
        daysUntilExpiry,
        alertLevel,
      });

      // Auto-expire if past due
      if (daysUntilExpiry <= 0) {
        await prisma.complianceItem.update({
          where: { id: item.id },
          data: { status: 'EXPIRED' },
        });
      }
    }
  }

  // Check insurance policies with expiration dates
  const insurancePolicies = await prisma.insurancePolicy.findMany({
    where: {
      expirationDate: { not: null },
      hasCoverage: true,
      status: { in: ['INS_VERIFIED', 'INS_PROVIDED_UNVERIFIED'] },
    },
    include: {
      providerProfile: { select: { id: true, businessName: true, userId: true } },
    },
  });

  for (const policy of insurancePolicies) {
    if (!policy.expirationDate) continue;
    const daysUntilExpiry = Math.ceil((policy.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const alertLevel = getAlertLevel(daysUntilExpiry);

    if (alertLevel) {
      alerts.push({
        providerProfileId: policy.providerProfileId,
        providerName: policy.providerProfile.businessName,
        providerId: policy.providerProfile.userId,
        entityType: 'INSURANCE',
        entityId: policy.id,
        itemType: policy.type,
        expirationDate: policy.expirationDate,
        daysUntilExpiry,
        alertLevel,
      });

      // Auto-expire if past due
      if (daysUntilExpiry <= 0) {
        await prisma.insurancePolicy.update({
          where: { id: policy.id },
          data: { status: 'INS_EXPIRED' },
        });

        // Recalculate provider status
        await recalculateProviderStatusOnExpiration(policy.providerProfileId);
      }
    }
  }

  return alerts;
}

function getAlertLevel(daysUntilExpiry: number): 'D30' | 'D15' | 'D7' | 'EXPIRED' | null {
  if (daysUntilExpiry <= 0) return 'EXPIRED';
  if (daysUntilExpiry <= 7) return 'D7';
  if (daysUntilExpiry <= 15) return 'D15';
  if (daysUntilExpiry <= 30) return 'D30';
  return null;
}

async function recalculateProviderStatusOnExpiration(providerProfileId: string) {
  try {
    const hasExpired = await prisma.complianceItem.findFirst({
      where: { providerProfileId, status: 'EXPIRED' },
    }) || await prisma.insurancePolicy.findFirst({
      where: { providerProfileId, status: 'INS_EXPIRED' },
    });

    if (hasExpired) {
      await prisma.providerProfile.update({
        where: { id: providerProfileId },
        data: { providerPublicStatus: 'RESTRICTED' },
      });
    }
  } catch (error) {
    console.error('Error recalculating provider status on expiration:', error);
  }
}

/**
 * Schedule expiration check - call this from server startup
 * Runs every 6 hours
 */
export function scheduleExpirationCheck() {
  const SIX_HOURS = 6 * 60 * 60 * 1000;

  // Run immediately on startup
  checkExpirations()
    .then(alerts => {
      if (alerts.length > 0) {
        console.log(`[ExpirationCheck] Found ${alerts.length} expiration alerts`);
        alerts.forEach(a => {
          console.log(`  - ${a.providerName}: ${a.entityType}/${a.itemType} → ${a.alertLevel} (${a.daysUntilExpiry} days)`);
        });
      } else {
        console.log('[ExpirationCheck] No expiration alerts');
      }
    })
    .catch(err => console.error('[ExpirationCheck] Error:', err));

  // Schedule recurring checks
  setInterval(async () => {
    try {
      const alerts = await checkExpirations();
      if (alerts.length > 0) {
        console.log(`[ExpirationCheck] Found ${alerts.length} expiration alerts`);
        // TODO: Send push notifications / emails to providers with upcoming expirations
      }
    } catch (err) {
      console.error('[ExpirationCheck] Error:', err);
    }
  }, SIX_HOURS);

  console.log('[ExpirationCheck] Scheduled every 6 hours');
}
