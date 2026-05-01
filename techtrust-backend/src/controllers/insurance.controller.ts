/**
 * Insurance Policy Controller
 * Manage provider insurance coverage
 */

import { Request, Response } from "express";
import {
  PrismaClient,
  InsurancePolicyType,
  InsurancePolicyStatus,
} from "@prisma/client";
import { buildInsuranceRequirementChecklist } from "../utils/insurance-requirements";
import { logger } from "../config/logger";

const prisma = new PrismaClient();

async function resolveProviderProfileId(req: Request): Promise<string | null> {
  const user = (req as any).user;
  const requestedId = req.params.providerProfileId;
  if (requestedId) return requestedId;

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.userId || user.id },
    select: { id: true },
  });
  return profile?.id || null;
}

// ============================================
// GET /insurance/:providerProfileId
// List all insurance policies for a provider
// ============================================
export const getInsurancePolicies = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const providerProfileId = await resolveProviderProfileId(req);

    if (!providerProfileId) {
      return res.status(404).json({ success: false, message: "Provider profile not found" });
    }

    const policies = await prisma.insurancePolicy.findMany({
      where: { providerProfileId },
      orderBy: { type: "asc" },
    });

    res.json({ success: true, data: { policies } });
  } catch (error: any) {
    logger.error(
      `Error fetching insurance policies: ${error instanceof Error ? error.message : error}`,
    );
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch insurance policies" });
  }
};

// ============================================
// POST /insurance/:providerProfileId
// Create or update an insurance policy
// ============================================
export const upsertInsurancePolicy = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const providerProfileId = await resolveProviderProfileId(req);
    const user = (req as any).user;
    const {
      type,
      hasCoverage,
      carrierName,
      policyNumber,
      effectiveDate,
      expirationDate,
      coverageLimit,
      deductible,
      coiUploads,
    } = req.body;

    if (!type) {
      return res
        .status(400)
        .json({ success: false, message: "Insurance type is required" });
    }

    if (!providerProfileId) {
      return res.status(404).json({ success: false, message: "Provider profile not found" });
    }

    // Verify ownership
    const profile = await prisma.providerProfile.findUnique({
      where: { id: providerProfileId },
    });
    if (!profile)
      return res
        .status(404)
        .json({ success: false, message: "Provider profile not found" });
    if (profile.userId !== (user.userId || user.id) && user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    // Determine status
    let status: InsurancePolicyStatus = "INS_NOT_PROVIDED";
    if (hasCoverage) {
      const hasCoi = Array.isArray(coiUploads) && coiUploads.length > 0;
      // A COI upload can be reviewed by ops even when the provider has not typed all details yet.
      if (!hasCoi && (!carrierName || !policyNumber || !expirationDate)) {
        return res.status(400).json({
          success: false,
          message:
            "When coverage is declared, provide carrier/policy/expiration or upload a Certificate of Insurance (COI)",
        });
      }
      status = "INS_PROVIDED_UNVERIFIED";
    }

    const existingPolicy = await prisma.insurancePolicy.findUnique({
      where: {
        providerProfileId_type: {
          providerProfileId,
          type: type as InsurancePolicyType,
        },
      },
    });

    const policy = await prisma.insurancePolicy.upsert({
      where: {
        providerProfileId_type: {
          providerProfileId,
          type: type as InsurancePolicyType,
        },
      },
      update: {
        hasCoverage: hasCoverage ?? false,
        status,
        carrierName: hasCoverage ? carrierName || existingPolicy?.carrierName || null : null,
        policyNumber: hasCoverage ? policyNumber || existingPolicy?.policyNumber || null : null,
        effectiveDate:
          hasCoverage && effectiveDate ? new Date(effectiveDate) : existingPolicy?.effectiveDate || null,
        expirationDate:
          hasCoverage && expirationDate ? new Date(expirationDate) : existingPolicy?.expirationDate || null,
        coverageLimit: hasCoverage ? coverageLimit || existingPolicy?.coverageLimit || null : null,
        deductible: hasCoverage ? deductible || existingPolicy?.deductible || null : null,
        coiUploads: hasCoverage ? coiUploads || existingPolicy?.coiUploads || [] : [],
      },
      create: {
        providerProfileId,
        type: type as InsurancePolicyType,
        hasCoverage: hasCoverage ?? false,
        status,
        carrierName: hasCoverage ? carrierName : null,
        policyNumber: hasCoverage ? policyNumber : null,
        effectiveDate:
          hasCoverage && effectiveDate ? new Date(effectiveDate) : null,
        expirationDate:
          hasCoverage && expirationDate ? new Date(expirationDate) : null,
        coverageLimit: hasCoverage ? coverageLimit : null,
        deductible: hasCoverage ? deductible : null,
        coiUploads: hasCoverage ? coiUploads || [] : [],
      },
    });

    res.json({ success: true, data: { policy } });
  } catch (error: any) {
    logger.error(
      `Error upserting insurance policy: ${error instanceof Error ? error.message : error}`,
    );
    res
      .status(500)
      .json({ success: false, message: "Failed to save insurance policy" });
  }
};

// ============================================
// POST /insurance/:providerProfileId/batch
// Batch update multiple insurance policies at once (onboarding)
// ============================================
export const batchUpsertInsurance = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const providerProfileId = await resolveProviderProfileId(req);
    const user = (req as any).user;
    const { policies } = req.body;

    if (!providerProfileId) {
      return res.status(404).json({ success: false, message: "Provider profile not found" });
    }

    const profile = await prisma.providerProfile.findUnique({
      where: { id: providerProfileId },
    });
    if (!profile)
      return res
        .status(404)
        .json({ success: false, message: "Provider profile not found" });
    if (profile.userId !== (user.userId || user.id) && user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    if (!Array.isArray(policies)) {
      return res
        .status(400)
        .json({ success: false, message: "policies must be an array" });
    }

    const results = [];
    for (const p of policies) {
      let status: InsurancePolicyStatus = "INS_NOT_PROVIDED";
      if (p.hasCoverage && p.carrierName && p.policyNumber) {
        status = "INS_PROVIDED_UNVERIFIED";
      }

      const policy = await prisma.insurancePolicy.upsert({
        where: {
          providerProfileId_type: {
            providerProfileId,
            type: p.type as InsurancePolicyType,
          },
        },
        update: {
          hasCoverage: p.hasCoverage ?? false,
          status,
          carrierName: p.hasCoverage ? p.carrierName : null,
          policyNumber: p.hasCoverage ? p.policyNumber : null,
          effectiveDate: p.effectiveDate ? new Date(p.effectiveDate) : null,
          expirationDate: p.expirationDate ? new Date(p.expirationDate) : null,
          coverageLimit: p.coverageLimit || null,
          deductible: p.deductible || null,
          coiUploads: p.coiUploads || [],
        },
        create: {
          providerProfileId,
          type: p.type as InsurancePolicyType,
          hasCoverage: p.hasCoverage ?? false,
          status,
          carrierName: p.hasCoverage ? p.carrierName : null,
          policyNumber: p.hasCoverage ? p.policyNumber : null,
          effectiveDate: p.effectiveDate ? new Date(p.effectiveDate) : null,
          expirationDate: p.expirationDate ? new Date(p.expirationDate) : null,
          coverageLimit: p.coverageLimit || null,
          deductible: p.deductible || null,
          coiUploads: p.coiUploads || [],
        },
      });
      results.push(policy);
    }

    res.json({ success: true, data: { policies: results } });
  } catch (error: any) {
    logger.error(
      `Error batch upserting insurance: ${error instanceof Error ? error.message : error}`,
    );
    res
      .status(500)
      .json({ success: false, message: "Failed to save insurance policies" });
  }
};

// ============================================
// GET /insurance/requirements
// Recommended/required insurance by provider capability
// ============================================
export const getInsuranceRequirements = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const providerProfileId = await resolveProviderProfileId(req);
    if (!providerProfileId) {
      return res.status(404).json({ success: false, message: "Provider profile not found" });
    }

    const profile = await prisma.providerProfile.findUnique({
      where: { id: providerProfileId },
      include: { insurancePolicies: true },
    });

    if (!profile) {
      return res.status(404).json({ success: false, message: "Provider profile not found" });
    }

    const requirements = buildInsuranceRequirementChecklist(profile);
    const requiredMissing = requirements.filter(
      (item) => item.level === "REQUIRED" && !item.complete,
    );

    res.json({
      success: true,
      data: {
        providerProfileId,
        businessType: profile.businessType,
        businessTypeCat: profile.businessTypeCat,
        servicesOffered: profile.servicesOffered,
        requirements,
        counts: {
          required: requirements.filter((item) => item.level === "REQUIRED").length,
          recommended: requirements.filter((item) => item.level === "RECOMMENDED").length,
          requiredMissing: requiredMissing.length,
          verified: requirements.filter((item) => item.verified).length,
        },
        customerBadgeEligible: requiredMissing.length === 0,
      },
    });
  } catch (error: any) {
    logger.error(
      `Error fetching insurance requirements: ${error instanceof Error ? error.message : error}`,
    );
    res.status(500).json({
      success: false,
      message: "Failed to fetch insurance requirements",
    });
  }
};
