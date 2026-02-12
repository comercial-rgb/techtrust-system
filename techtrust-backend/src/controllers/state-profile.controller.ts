/**
 * State Profile & Multi-State Compliance Controller
 * Admin management of state configurations, jurisdiction policies,
 * and compliance requirement catalog.
 */

import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import * as ruleEngine from "../services/rule-engine.service";

const prisma = new PrismaClient();

// ============================================
// STATE PROFILES
// ============================================

/** GET /state-profiles - List all state profiles */
export const listStateProfiles = async (req: Request, res: Response) => {
  try {
    const { activeOnly } = req.query;
    const profiles = await prisma.stateProfile.findMany({
      where: activeOnly === "true" ? { isActive: true } : undefined,
      orderBy: { stateName: "asc" },
      include: {
        _count: { select: { jurisdictionPolicies: true } },
      },
    });
    res.json({ success: true, data: { profiles } });
  } catch (error: any) {
    console.error("Error listing state profiles:", error);
    res.status(500).json({ success: false, message: "Failed to list state profiles" });
  }
};

/** GET /state-profiles/:stateCode - Get state profile details */
export const getStateProfile = async (req: Request, res: Response): Promise<any> => {
  try {
    const { stateCode } = req.params;
    const profile = await prisma.stateProfile.findUnique({
      where: { stateCode: stateCode.toUpperCase() },
      include: {
        jurisdictionPolicies: {
          include: {
            requirements: {
              include: { requirement: true },
            },
          },
        },
      },
    });

    if (!profile) {
      return res.status(404).json({ success: false, message: "State not found" });
    }

    res.json({ success: true, data: { profile } });
  } catch (error: any) {
    console.error("Error getting state profile:", error);
    res.status(500).json({ success: false, message: "Failed to get state profile" });
  }
};

/** POST /state-profiles - Create or update state profile */
export const upsertStateProfile = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    if (user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Admin only" });
    }

    const {
      stateCode,
      stateName,
      isActive,
      stateRepairShopRegRequired,
      stateRepairShopRegDisplayName,
      stateRepairShopRegAuthority,
      defaultLocalLicenseModel,
      towingRegulationLevel,
      notesInternal,
    } = req.body;

    if (!stateCode || !stateName) {
      return res.status(400).json({ success: false, message: "stateCode and stateName are required" });
    }

    const profile = await prisma.stateProfile.upsert({
      where: { stateCode: stateCode.toUpperCase() },
      update: {
        stateName,
        isActive: isActive ?? undefined,
        stateRepairShopRegRequired: stateRepairShopRegRequired ?? undefined,
        stateRepairShopRegDisplayName: stateRepairShopRegDisplayName ?? undefined,
        stateRepairShopRegAuthority: stateRepairShopRegAuthority ?? undefined,
        defaultLocalLicenseModel: defaultLocalLicenseModel ?? undefined,
        towingRegulationLevel: towingRegulationLevel ?? undefined,
        notesInternal: notesInternal ?? undefined,
      },
      create: {
        stateCode: stateCode.toUpperCase(),
        stateName,
        isActive: isActive ?? false,
        stateRepairShopRegRequired: stateRepairShopRegRequired ?? false,
        stateRepairShopRegDisplayName,
        stateRepairShopRegAuthority,
        defaultLocalLicenseModel: defaultLocalLicenseModel ?? "COUNTY_ONLY",
        towingRegulationLevel: towingRegulationLevel ?? "MEDIUM",
        notesInternal,
      },
    });

    res.json({ success: true, data: { profile } });
  } catch (error: any) {
    console.error("Error upserting state profile:", error);
    res.status(500).json({ success: false, message: "Failed to save state profile" });
  }
};

// ============================================
// COMPLIANCE REQUIREMENTS CATALOG
// ============================================

/** GET /compliance-requirements - List all catalog requirements */
export const listComplianceRequirements = async (_req: Request, res: Response) => {
  try {
    const requirements = await prisma.complianceRequirement.findMany({
      where: { isActive: true },
      orderBy: { priority: "asc" },
    });
    res.json({ success: true, data: { requirements } });
  } catch (error: any) {
    console.error("Error listing compliance requirements:", error);
    res.status(500).json({ success: false, message: "Failed to list requirements" });
  }
};

/** POST /compliance-requirements - Create or update a catalog requirement */
export const upsertComplianceRequirement = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    if (user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Admin only" });
    }

    const {
      requirementKey,
      scope,
      displayName,
      description,
      appliesToServices,
      verificationMode,
      fieldsSchema,
      renewalRule,
      priority,
    } = req.body;

    if (!requirementKey || !scope || !displayName) {
      return res.status(400).json({ success: false, message: "requirementKey, scope, and displayName are required" });
    }

    const requirement = await prisma.complianceRequirement.upsert({
      where: { requirementKey },
      update: {
        scope,
        displayName,
        description: description ?? undefined,
        appliesToServices: appliesToServices ?? undefined,
        verificationMode: verificationMode ?? undefined,
        fieldsSchema: fieldsSchema ?? undefined,
        renewalRule: renewalRule ?? undefined,
        priority: priority ?? undefined,
      },
      create: {
        requirementKey,
        scope,
        displayName,
        description,
        appliesToServices: appliesToServices ?? ["ALL"],
        verificationMode: verificationMode ?? "UPLOAD_ONLY",
        fieldsSchema,
        renewalRule,
        priority: priority ?? 100,
      },
    });

    res.json({ success: true, data: { requirement } });
  } catch (error: any) {
    console.error("Error upserting requirement:", error);
    res.status(500).json({ success: false, message: "Failed to save requirement" });
  }
};

// ============================================
// JURISDICTION POLICIES
// ============================================

/** GET /jurisdiction-policies/:stateCode - List policies for a state */
export const listJurisdictionPolicies = async (req: Request, res: Response) => {
  try {
    const { stateCode } = req.params;
    const policies = await prisma.jurisdictionPolicy.findMany({
      where: { stateCode: stateCode.toUpperCase() },
      include: {
        requirements: {
          include: { requirement: true },
        },
      },
      orderBy: { countyName: "asc" },
    });
    res.json({ success: true, data: { policies } });
  } catch (error: any) {
    console.error("Error listing jurisdiction policies:", error);
    res.status(500).json({ success: false, message: "Failed to list policies" });
  }
};

/** POST /jurisdiction-policies - Create or update a jurisdiction policy */
export const upsertJurisdictionPolicy = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    if (user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Admin only" });
    }

    const {
      stateCode,
      countyName,
      cityName,
      insideCityLimitsRequired,
      isActive,
      notesInternal,
      requirements, // [{ requirementKey, displayNameOverride, issuingAuthorityOverride, isMandatory }]
    } = req.body;

    if (!stateCode) {
      return res.status(400).json({ success: false, message: "stateCode is required" });
    }

    const policy = await prisma.jurisdictionPolicy.upsert({
      where: {
        stateCode_countyName_cityName: {
          stateCode: stateCode.toUpperCase(),
          countyName: countyName || null,
          cityName: cityName || null,
        },
      },
      update: {
        insideCityLimitsRequired: insideCityLimitsRequired ?? undefined,
        isActive: isActive ?? undefined,
        notesInternal: notesInternal ?? undefined,
      },
      create: {
        stateCode: stateCode.toUpperCase(),
        countyName: countyName || null,
        cityName: cityName || null,
        insideCityLimitsRequired: insideCityLimitsRequired ?? undefined,
        isActive: isActive ?? true,
        notesInternal,
      },
    });

    // Sync requirements if provided
    if (requirements && Array.isArray(requirements)) {
      // Delete existing requirements
      await prisma.jurisdictionRequirement.deleteMany({
        where: { policyId: policy.id },
      });

      // Create new requirements
      for (const req of requirements) {
        await prisma.jurisdictionRequirement.create({
          data: {
            policyId: policy.id,
            requirementKey: req.requirementKey,
            displayNameOverride: req.displayNameOverride || null,
            issuingAuthorityOverride: req.issuingAuthorityOverride || null,
            isMandatory: req.isMandatory ?? true,
          },
        });
      }
    }

    // Re-fetch with requirements
    const result = await prisma.jurisdictionPolicy.findUnique({
      where: { id: policy.id },
      include: {
        requirements: {
          include: { requirement: true },
        },
      },
    });

    res.json({ success: true, data: { policy: result } });
  } catch (error: any) {
    console.error("Error upserting jurisdiction policy:", error);
    res.status(500).json({ success: false, message: "Failed to save policy" });
  }
};

// ============================================
// RULE ENGINE ENDPOINTS
// ============================================

/** POST /rule-engine/resolve/:providerProfileId - Resolve requirements for a provider */
export const resolveProviderRequirements = async (req: Request, res: Response): Promise<any> => {
  try {
    const { providerProfileId } = req.params;
    const profile = await prisma.providerProfile.findUnique({
      where: { id: providerProfileId },
    });

    if (!profile) {
      return res.status(404).json({ success: false, message: "Provider not found" });
    }

    const servicesOffered = (profile.servicesOffered as string[]) || [];
    const jurisdiction = await ruleEngine.resolveJurisdiction(
      profile.state,
      profile.county,
      profile.city,
      profile.insideCityLimits
    );
    const requirements = await ruleEngine.resolveRequirements(
      jurisdiction,
      servicesOffered
    );

    res.json({
      success: true,
      data: { jurisdiction, requirements, servicesOffered },
    });
  } catch (error: any) {
    console.error("Error resolving requirements:", error);
    res.status(500).json({ success: false, message: "Failed to resolve requirements" });
  }
};

/** POST /rule-engine/eligibility/:providerProfileId - Recalculate eligibility */
export const recalculateEligibility = async (req: Request, res: Response): Promise<any> => {
  try {
    const { providerProfileId } = req.params;
    const results = await ruleEngine.calculateServiceEligibility(providerProfileId);
    const status = await ruleEngine.recalculateProviderStatus(providerProfileId);

    res.json({
      success: true,
      data: { eligibilities: results, providerPublicStatus: status },
    });
  } catch (error: any) {
    console.error("Error recalculating eligibility:", error);
    res.status(500).json({ success: false, message: "Failed to recalculate eligibility" });
  }
};

// ============================================
// ACTIVE STATES (PUBLIC)
// ============================================

/** GET /states/active - Get all active marketplace states */
export const getActiveStates = async (_req: Request, res: Response) => {
  try {
    const states = await ruleEngine.getActiveStates();
    res.json({ success: true, data: { states } });
  } catch (error: any) {
    console.error("Error listing active states:", error);
    res.status(500).json({ success: false, message: "Failed to list active states" });
  }
};

/** GET /states/all - Get all state profiles (admin) */
export const getAllStates = async (_req: Request, res: Response) => {
  try {
    const states = await prisma.stateProfile.findMany({
      orderBy: { stateName: "asc" },
      include: { _count: { select: { jurisdictionPolicies: true } } },
    });
    res.json({ success: true, data: { states } });
  } catch (error: any) {
    console.error("Error listing all states:", error);
    res.status(500).json({ success: false, message: "Failed to list states" });
  }
};

// ============================================
// DISCLAIMER VERSIONS
// ============================================

/** GET /disclaimers - List active disclaimers */
export const listDisclaimers = async (_req: Request, res: Response) => {
  try {
    const disclaimers = await prisma.disclaimerVersion.findMany({
      where: { isActive: true },
      orderBy: { effectiveDate: "desc" },
    });
    res.json({ success: true, data: { disclaimers } });
  } catch (error: any) {
    console.error("Error listing disclaimers:", error);
    res.status(500).json({ success: false, message: "Failed to list disclaimers" });
  }
};

/** POST /disclaimers - Create a new disclaimer version */
export const createDisclaimer = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    if (user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Admin only" });
    }

    const { serviceType, stateCode, version, text, effectiveDate } = req.body;

    if (!version || !text) {
      return res.status(400).json({ success: false, message: "version and text are required" });
    }

    const disclaimer = await prisma.disclaimerVersion.create({
      data: {
        serviceType: serviceType || null,
        stateCode: stateCode || null,
        version,
        text,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
        isActive: true,
      },
    });

    res.json({ success: true, data: { disclaimer } });
  } catch (error: any) {
    console.error("Error creating disclaimer:", error);
    res.status(500).json({ success: false, message: "Failed to create disclaimer" });
  }
};
