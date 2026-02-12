/**
 * Provider Compliance Controller
 * Manages ComplianceItems (FDACS, BTR City/County, EPA 609)
 */

import { Request, Response } from "express";
import { PrismaClient, ComplianceType, ComplianceStatus } from "@prisma/client";

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
// Called after provider profile setup or services update
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

    const created: string[] = [];

    // 1. FDACS - Always required in Florida
    await prisma.complianceItem.upsert({
      where: {
        providerProfileId_type_technicianId: {
          providerProfileId,
          type: "FDACS_MOTOR_VEHICLE_REPAIR",
          technicianId: null as unknown as string,
        },
      },
      update: {},
      create: {
        providerProfileId,
        type: "FDACS_MOTOR_VEHICLE_REPAIR",
        status: profile.fdacsRegistrationNumber
          ? "PROVIDED_UNVERIFIED"
          : "NOT_PROVIDED",
        licenseNumber: profile.fdacsRegistrationNumber || undefined,
        issuingAuthority: "FDACS",
      },
    });
    created.push("FDACS_MOTOR_VEHICLE_REPAIR");

    // 2. County BTR - Always required
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
        status: "NOT_PROVIDED",
        issuingAuthority: profile.county
          ? `${profile.county} County Tax Collector`
          : undefined,
      },
    });
    created.push("LOCAL_BTR_COUNTY");

    // 3. City BTR - Only if inside city limits
    const cityStatus: ComplianceStatus =
      profile.insideCityLimits === false ? "NOT_APPLICABLE" : "NOT_PROVIDED";
    await prisma.complianceItem.upsert({
      where: {
        providerProfileId_type_technicianId: {
          providerProfileId,
          type: "LOCAL_BTR_CITY",
          technicianId: null as unknown as string,
        },
      },
      update: {
        status:
          profile.insideCityLimits === false ? "NOT_APPLICABLE" : undefined,
      },
      create: {
        providerProfileId,
        type: "LOCAL_BTR_CITY",
        status: cityStatus,
        issuingAuthority: profile.insideCityLimits
          ? `City of ${profile.city}`
          : undefined,
      },
    });
    created.push("LOCAL_BTR_CITY");

    res.json({ success: true, data: { created } });
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
// ============================================
export const getComplianceSummary = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const { providerProfileId } = req.params;

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

    // Build compliance summary
    const fdacs = profile.complianceItems.find(
      (c) => c.type === "FDACS_MOTOR_VEHICLE_REPAIR",
    );
    const countyBtr = profile.complianceItems.find(
      (c) => c.type === "LOCAL_BTR_COUNTY",
    );
    const cityBtr = profile.complianceItems.find(
      (c) => c.type === "LOCAL_BTR_CITY",
    );

    // Service gating checks
    const serviceGating: Record<string, { allowed: boolean; reason?: string }> =
      {};

    // A/C Service gating: requires at least 1 technician with VERIFIED EPA 609
    if (servicesOffered.includes("AC_SERVICE")) {
      const verifiedTechs = profile.technicians.filter(
        (t) => t.epa609Status === "VERIFIED" && t.isActive,
      );
      serviceGating["AC_SERVICE"] = {
        allowed: verifiedTechs.length > 0,
        reason:
          verifiedTechs.length === 0
            ? "Certification required (EPA 609)"
            : undefined,
      };
    }

    // Towing gating: requires COMMERCIAL_AUTO + ON_HOOK insurance verified & not expired
    if (servicesOffered.includes("TOWING")) {
      const commercialAuto = profile.insurancePolicies.find(
        (p) => p.type === "COMMERCIAL_AUTO",
      );
      const onHook = profile.insurancePolicies.find(
        (p) => p.type === "ON_HOOK",
      );
      const commercialOk =
        commercialAuto?.status === "INS_VERIFIED" &&
        (!commercialAuto.expirationDate ||
          commercialAuto.expirationDate > new Date());
      const onHookOk =
        onHook?.status === "INS_VERIFIED" &&
        (!onHook.expirationDate || onHook.expirationDate > new Date());
      serviceGating["TOWING"] = {
        allowed: commercialOk && onHookOk,
        reason:
          !commercialOk || !onHookOk
            ? "Insurance required (Commercial Auto + On-Hook)"
            : undefined,
      };
    }

    // Insurance summary
    const insuranceSummary = profile.insurancePolicies.map((p) => ({
      type: p.type,
      status: p.status,
      hasCoverage: p.hasCoverage,
      carrierName: p.carrierName,
      expirationDate: p.expirationDate,
    }));

    // General liability check
    const generalLiability = profile.insurancePolicies.find(
      (p) => p.type === "GENERAL_LIABILITY",
    );
    const hasVerifiedInsurance = generalLiability?.status === "INS_VERIFIED";

    res.json({
      success: true,
      data: {
        providerPublicStatus: profile.providerPublicStatus,
        licensing: {
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
        serviceGating,
        servicesOffered,
      },
    });
  } catch (error: any) {
    console.error("Error fetching compliance summary:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch compliance summary" });
  }
};
