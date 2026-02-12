/**
 * Provider Compliance Controller
 * Manages ComplianceItems — now data-driven via multi-state rule engine.
 * Supports FDACS (Florida) and any future state registration requirements.
 */

import { Request, Response } from "express";
import { PrismaClient, ComplianceType, ComplianceStatus } from "@prisma/client";
import * as ruleEngine from "../services/rule-engine.service";

const prisma = new PrismaClient();

// ============================================
// GET /compliance/:providerProfileId
// List all compliance items for a provider
// ============================================
export const getComplianceItems = async (req: Request, res: Response) => {
  try {
    const { providerProfileId } = req.params;

    const items = await prisma.complianceItem.findMany({
      where: { providerProfileId },
      include: { technician: true },
      orderBy: { type: "asc" },
    });

    res.json({ success: true, data: { items } });
  } catch (error: any) {
    console.error("Error fetching compliance items:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch compliance items" });
  }
};

// ============================================
// POST /compliance/:providerProfileId
// Create or update a compliance item
// ============================================
export const upsertComplianceItem = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const { providerProfileId } = req.params;
    const user = (req as any).user;
    const {
      type,
      licenseNumber,
      issuingAuthority,
      issueDate,
      expirationDate,
      documentUploads,
      technicianId,
    } = req.body;

    if (!type) {
      return res
        .status(400)
        .json({ success: false, message: "Compliance type is required" });
    }

    // Verify the provider profile belongs to this user (or admin)
    const profile = await prisma.providerProfile.findUnique({
      where: { id: providerProfileId },
    });

    if (!profile) {
      return res
        .status(404)
        .json({ success: false, message: "Provider profile not found" });
    }

    if (profile.userId !== user.userId && user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    // Determine initial status based on what's provided
    let status: ComplianceStatus = "NOT_PROVIDED";
    if (licenseNumber || (documentUploads && documentUploads.length > 0)) {
      status = "PROVIDED_UNVERIFIED";
    }

    const item = await prisma.complianceItem.upsert({
      where: {
        providerProfileId_type_technicianId: {
          providerProfileId,
          type: type as ComplianceType,
          technicianId: (technicianId || null) as string,
        },
      },
      update: {
        licenseNumber,
        issuingAuthority,
        issueDate: issueDate ? new Date(issueDate) : undefined,
        expirationDate: expirationDate ? new Date(expirationDate) : undefined,
        documentUploads: documentUploads || undefined,
        status,
      },
      create: {
        providerProfileId,
        type: type as ComplianceType,
        status,
        licenseNumber,
        issuingAuthority,
        issueDate: issueDate ? new Date(issueDate) : null,
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        documentUploads: documentUploads || [],
        technicianId: technicianId || null,
      },
    });

    res.json({ success: true, data: { item } });
  } catch (error: any) {
    console.error("Error upserting compliance item:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to save compliance item" });
  }
};

// ============================================
// POST /compliance/:providerProfileId/auto-create
// Auto-create required compliance items based on provider location/services
// NOW DATA-DRIVEN via rule engine (multi-state support)
// ============================================
export const autoCreateComplianceItems = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const { providerProfileId } = req.params;

    const profile = await prisma.providerProfile.findUnique({
      where: { id: providerProfileId },
    });

    if (!profile) {
      return res
        .status(404)
        .json({ success: false, message: "Provider profile not found" });
    }

    // Use rule engine to auto-create items based on jurisdiction policies
    const { created, jurisdiction } =
      await ruleEngine.autoCreateComplianceItemsFromRules(providerProfileId);

    // If no jurisdiction policies found, fall back to minimal creation
    if (created.length === 0) {
      // Fallback: at minimum create county BTR
      await prisma.complianceItem.upsert({
        where: {
          providerProfileId_type_technicianId: {
            providerProfileId,
            type: "LOCAL_BTR_COUNTY",
            technicianId: null as unknown as string,
          },
        },
        update: {},
        create: {
          providerProfileId,
          type: "LOCAL_BTR_COUNTY",
          requirementKey: "LOCAL_BUSINESS_LICENSE_COUNTY",
          status: "NOT_PROVIDED",
          issuingAuthority: profile.county
            ? `${profile.county} County`
            : undefined,
        },
      });
      created.push("LOCAL_BUSINESS_LICENSE_COUNTY");
    }

    // Recalculate eligibility after creating items
    await ruleEngine.calculateServiceEligibility(providerProfileId);
    await ruleEngine.recalculateProviderStatus(providerProfileId);

    res.json({ success: true, data: { created, jurisdiction } });
  } catch (error: any) {
    console.error("Error auto-creating compliance items:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to auto-create compliance items",
      });
  }
};

// ============================================
// GET /compliance/:providerProfileId/summary
// Get compliance summary with service gating info
// NOW POWERED BY RULE ENGINE (multi-state)
// ============================================
export const getComplianceSummary = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const { providerProfileId } = req.params;

    // Use rule engine for full summary
    const summary = await ruleEngine.getFullComplianceSummary(providerProfileId);

    const profile = await prisma.providerProfile.findUnique({
      where: { id: providerProfileId },
      include: {
        complianceItems: { include: { technician: true } },
        technicians: true,
        insurancePolicies: true,
      },
    });

    if (!profile) {
      return res
        .status(404)
        .json({ success: false, message: "Provider profile not found" });
    }

    const servicesOffered = (profile.servicesOffered as string[]) || [];

    // Build backward-compatible licensing section
    const fdacs = profile.complianceItems.find(
      (c) => c.type === "FDACS_MOTOR_VEHICLE_REPAIR" || c.type === "STATE_SHOP_REGISTRATION",
    );
    const countyBtr = profile.complianceItems.find(
      (c) => c.type === "LOCAL_BTR_COUNTY",
    );
    const cityBtr = profile.complianceItems.find(
      (c) => c.type === "LOCAL_BTR_CITY",
    );

    // Insurance summary
    const insuranceSummary = profile.insurancePolicies.map((p) => ({
      type: p.type,
      status: p.status,
      hasCoverage: p.hasCoverage,
      carrierName: p.carrierName,
      expirationDate: p.expirationDate,
    }));

    const generalLiability = profile.insurancePolicies.find(
      (p) => p.type === "GENERAL_LIABILITY",
    );
    const hasVerifiedInsurance = generalLiability?.status === "INS_VERIFIED";

    res.json({
      success: true,
      data: {
        providerPublicStatus: profile.providerPublicStatus,
        // Multi-state jurisdiction info
        jurisdiction: summary.jurisdiction,
        requiredItems: summary.requiredItems,
        // Backward-compatible licensing section
        licensing: {
          stateRegistration: fdacs
            ? {
                status: fdacs.status,
                licenseNumber: fdacs.licenseNumber,
                expirationDate: fdacs.expirationDate,
                type: fdacs.type,
                requirementKey: fdacs.requirementKey,
                issuingAuthority: fdacs.issuingAuthority,
              }
            : null,
          // Legacy aliases
          fdacs: fdacs
            ? {
                status: fdacs.status,
                licenseNumber: fdacs.licenseNumber,
                expirationDate: fdacs.expirationDate,
              }
            : null,
          countyBtr: countyBtr
            ? {
                status: countyBtr.status,
                issuingAuthority: countyBtr.issuingAuthority,
                expirationDate: countyBtr.expirationDate,
              }
            : null,
          cityBtr: cityBtr
            ? {
                status: cityBtr.status,
                issuingAuthority: cityBtr.issuingAuthority,
                expirationDate: cityBtr.expirationDate,
              }
            : null,
        },
        federal: {
          epa609TechniciansCount: profile.technicians.filter(
            (t) => t.epa609Status === "VERIFIED",
          ).length,
          totalTechnicians: profile.technicians.length,
        },
        insurance: insuranceSummary,
        hasVerifiedInsurance,
        serviceGating: summary.serviceGating,
        serviceEligibilities: summary.serviceEligibilities,
        servicesOffered,
        disclaimersNeeded: summary.disclaimersNeeded,
      },
    });
  } catch (error: any) {
    console.error("Error fetching compliance summary:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch compliance summary" });
  }
};
