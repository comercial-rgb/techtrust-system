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

const prisma = new PrismaClient();

// ============================================
// GET /insurance/:providerProfileId
// List all insurance policies for a provider
// ============================================
export const getInsurancePolicies = async (req: Request, res: Response) => {
  try {
    const { providerProfileId } = req.params;

    const policies = await prisma.insurancePolicy.findMany({
      where: { providerProfileId },
      orderBy: { type: "asc" },
    });

    res.json({ success: true, data: { policies } });
  } catch (error: any) {
    console.error("Error fetching insurance policies:", error);
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
    const { providerProfileId } = req.params;
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

    // Verify ownership
    const profile = await prisma.providerProfile.findUnique({
      where: { id: providerProfileId },
    });
    if (!profile)
      return res
        .status(404)
        .json({ success: false, message: "Provider profile not found" });
    if (profile.userId !== user.userId && user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    // Determine status
    let status: InsurancePolicyStatus = "INS_NOT_PROVIDED";
    if (hasCoverage) {
      // Validate required fields when hasCoverage is true
      if (!carrierName || !policyNumber || !expirationDate) {
        return res.status(400).json({
          success: false,
          message:
            "When coverage is declared, carrier name, policy number, and expiration date are required",
        });
      }
      if (!coiUploads || coiUploads.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "At least one Certificate of Insurance (COI) document is required",
        });
      }
      status = "INS_PROVIDED_UNVERIFIED";
    }

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
        carrierName: hasCoverage ? carrierName : null,
        policyNumber: hasCoverage ? policyNumber : null,
        effectiveDate:
          hasCoverage && effectiveDate ? new Date(effectiveDate) : null,
        expirationDate:
          hasCoverage && expirationDate ? new Date(expirationDate) : null,
        coverageLimit: hasCoverage ? coverageLimit : null,
        deductible: hasCoverage ? deductible : null,
        coiUploads: hasCoverage ? coiUploads : [],
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
        coiUploads: hasCoverage ? coiUploads : [],
      },
    });

    res.json({ success: true, data: { policy } });
  } catch (error: any) {
    console.error("Error upserting insurance policy:", error);
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
    const { providerProfileId } = req.params;
    const user = (req as any).user;
    const { policies } = req.body;

    const profile = await prisma.providerProfile.findUnique({
      where: { id: providerProfileId },
    });
    if (!profile)
      return res
        .status(404)
        .json({ success: false, message: "Provider profile not found" });
    if (profile.userId !== user.userId && user.role !== "ADMIN") {
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
    console.error("Error batch upserting insurance:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to save insurance policies" });
  }
};
