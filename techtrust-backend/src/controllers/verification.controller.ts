/**
 * Verification & Risk Acceptance Controller
 * Admin verification actions + customer disclaimer acceptance
 */

import { Request, Response } from 'express';
import { PrismaClient, VerificationEntityType } from '@prisma/client';

const prisma = new PrismaClient();

const DISCLAIMER_VERSION = '1.0';
const DISCLAIMER_TEXT = `This provider does not have verified insurance coverage on file for this service. By proceeding, you acknowledge that the platform does not provide insurance and is not responsible for damages, loss, or liability arising from services performed by the provider.`;

// ============================================
// POST /verification/verify
// Admin: Verify a compliance item, insurance policy, or technician cert
// ============================================
export const verifyEntity = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { entityType, entityId, newStatus, notes } = req.body;

    if (!entityType || !entityId || !newStatus) {
      return res.status(400).json({ success: false, message: 'entityType, entityId, and newStatus are required' });
    }

    let previousStatus = '';

    if (entityType === 'COMPLIANCE_ITEM') {
      const item = await prisma.complianceItem.findUnique({ where: { id: entityId } });
      if (!item) return res.status(404).json({ success: false, message: 'Compliance item not found' });
      previousStatus = item.status;

      await prisma.complianceItem.update({
        where: { id: entityId },
        data: {
          status: newStatus,
          lastVerifiedAt: new Date(),
          verifiedByUserId: user.userId,
          verificationMethod: 'MANUAL_REVIEW',
          verificationNotes: notes || null,
        },
      });
    } else if (entityType === 'INSURANCE_POLICY') {
      const policy = await prisma.insurancePolicy.findUnique({ where: { id: entityId } });
      if (!policy) return res.status(404).json({ success: false, message: 'Insurance policy not found' });
      previousStatus = policy.status;

      await prisma.insurancePolicy.update({
        where: { id: entityId },
        data: {
          status: newStatus,
          lastVerifiedAt: new Date(),
          verifiedByUserId: user.userId,
          verificationNotes: notes || null,
        },
      });
    } else if (entityType === 'TECHNICIAN_CERT') {
      const tech = await prisma.technician.findUnique({ where: { id: entityId } });
      if (!tech) return res.status(404).json({ success: false, message: 'Technician not found' });
      previousStatus = tech.epa609Status;

      await prisma.technician.update({
        where: { id: entityId },
        data: { epa609Status: newStatus },
      });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid entityType' });
    }

    // Create verification log
    await prisma.verificationLog.create({
      data: {
        entityType: entityType as VerificationEntityType,
        entityId,
        previousStatus,
        newStatus,
        verifiedByUserId: user.userId,
        notes: notes || null,
      },
    });

    // Re-evaluate provider public status after verification change
    await recalculateProviderStatus(entityType, entityId);

    res.json({ success: true, message: 'Verification updated', data: { previousStatus, newStatus } });
  } catch (error: any) {
    console.error('Error verifying entity:', error);
    res.status(500).json({ success: false, message: 'Failed to verify entity' });
  }
};

// ============================================
// GET /verification/logs/:entityId
// Get verification history for an entity
// ============================================
export const getVerificationLogs = async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;

    const logs = await prisma.verificationLog.findMany({
      where: { entityId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: { logs } });
  } catch (error: any) {
    console.error('Error fetching verification logs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch verification logs' });
  }
};

// ============================================
// POST /verification/risk-acceptance
// Customer: Accept risk disclaimer for uninsured provider
// ============================================
export const acceptRiskDisclaimer = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const { providerId, serviceType } = req.body;

    if (!providerId || !serviceType) {
      return res.status(400).json({ success: false, message: 'providerId and serviceType are required' });
    }

    const log = await prisma.userRiskAcceptanceLog.create({
      data: {
        userId: user.userId,
        providerId,
        serviceType,
        disclaimerVersion: DISCLAIMER_VERSION,
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.ip || null,
        userAgent: req.headers['user-agent'] || null,
        deviceInfo: req.body.deviceInfo || null,
        disclaimerTextShown: DISCLAIMER_TEXT,
      },
    });

    res.json({ success: true, data: { logId: log.id, disclaimerVersion: DISCLAIMER_VERSION } });
  } catch (error: any) {
    console.error('Error recording risk acceptance:', error);
    res.status(500).json({ success: false, message: 'Failed to record risk acceptance' });
  }
};

// ============================================
// GET /verification/risk-acceptance/check
// Check if user has accepted risk for a specific provider/service
// ============================================
export const checkRiskAcceptance = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    const { providerId, serviceType } = req.query;

    if (!providerId || !serviceType) {
      return res.status(400).json({ success: false, message: 'providerId and serviceType are required' });
    }

    // Check for recent acceptance (within last 24 hours)
    const recentAcceptance = await prisma.userRiskAcceptanceLog.findFirst({
      where: {
        userId: user.userId,
        providerId: providerId as string,
        serviceType: serviceType as string,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: {
        accepted: !!recentAcceptance,
        lastAcceptedAt: recentAcceptance?.createdAt || null,
        disclaimerVersion: DISCLAIMER_VERSION,
        disclaimerText: !recentAcceptance ? DISCLAIMER_TEXT : undefined,
      },
    });
  } catch (error: any) {
    console.error('Error checking risk acceptance:', error);
    res.status(500).json({ success: false, message: 'Failed to check risk acceptance' });
  }
};

// ============================================
// GET /verification/pending
// Admin: Get all entities pending verification
// ============================================
export const getPendingVerifications = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const [complianceItems, insurancePolicies, technicians] = await Promise.all([
      prisma.complianceItem.findMany({
        where: { status: 'PROVIDED_UNVERIFIED' },
        include: { providerProfile: { select: { businessName: true, userId: true } } },
        orderBy: { updatedAt: 'asc' },
      }),
      prisma.insurancePolicy.findMany({
        where: { status: 'INS_PROVIDED_UNVERIFIED' },
        include: { providerProfile: { select: { businessName: true, userId: true } } },
        orderBy: { updatedAt: 'asc' },
      }),
      prisma.technician.findMany({
        where: { epa609Status: 'PROVIDED_UNVERIFIED' },
        include: { providerProfile: { select: { businessName: true, userId: true } } },
        orderBy: { updatedAt: 'asc' },
      }),
    ]);

    res.json({
      success: true,
      data: {
        complianceItems,
        insurancePolicies,
        technicians,
        totalPending: complianceItems.length + insurancePolicies.length + technicians.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching pending verifications:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pending verifications' });
  }
};

// ============================================
// Helper: Recalculate provider public status after verification changes
// ============================================
async function recalculateProviderStatus(entityType: string, entityId: string) {
  try {
    let providerProfileId: string | null = null;

    if (entityType === 'COMPLIANCE_ITEM') {
      const item = await prisma.complianceItem.findUnique({ where: { id: entityId } });
      providerProfileId = item?.providerProfileId || null;
    } else if (entityType === 'INSURANCE_POLICY') {
      const policy = await prisma.insurancePolicy.findUnique({ where: { id: entityId } });
      providerProfileId = policy?.providerProfileId || null;
    } else if (entityType === 'TECHNICIAN_CERT') {
      const tech = await prisma.technician.findUnique({ where: { id: entityId } });
      providerProfileId = tech?.providerProfileId || null;
    }

    if (!providerProfileId) return;

    const profile = await prisma.providerProfile.findUnique({
      where: { id: providerProfileId },
      include: {
        complianceItems: true,
        insurancePolicies: true,
        technicians: true,
      },
    });

    if (!profile) return;

    const fdacs = profile.complianceItems.find(c => c.type === 'FDACS_MOTOR_VEHICLE_REPAIR');
    const hasVerifiedFdacs = fdacs?.status === 'VERIFIED';
    const hasExpired = profile.complianceItems.some(c => c.status === 'EXPIRED') ||
                       profile.insurancePolicies.some(p => p.status === 'INS_EXPIRED');

    const servicesOffered = (profile.servicesOffered as string[]) || [];
    const offersAC = servicesOffered.includes('AC_SERVICE');
    const offersTowing = servicesOffered.includes('TOWING');

    // Check service gating restrictions
    let hasRestrictions = false;
    if (offersAC) {
      const verifiedEPATechs = profile.technicians.filter(t => t.epa609Status === 'VERIFIED' && t.isActive);
      if (verifiedEPATechs.length === 0) hasRestrictions = true;
    }
    if (offersTowing) {
      const comAuto = profile.insurancePolicies.find(p => p.type === 'COMMERCIAL_AUTO');
      const onHook = profile.insurancePolicies.find(p => p.type === 'ON_HOOK');
      if (comAuto?.status !== 'INS_VERIFIED' || onHook?.status !== 'INS_VERIFIED') hasRestrictions = true;
    }

    let newStatus: 'VERIFIED' | 'PENDING' | 'RESTRICTED' | 'NOT_ELIGIBLE' = 'PENDING';
    if (hasExpired) {
      newStatus = 'RESTRICTED';
    } else if (hasRestrictions) {
      newStatus = 'RESTRICTED';
    } else if (hasVerifiedFdacs) {
      newStatus = 'VERIFIED';
    }

    await prisma.providerProfile.update({
      where: { id: providerProfileId },
      data: { providerPublicStatus: newStatus },
    });
  } catch (error) {
    console.error('Error recalculating provider status:', error);
  }
}
