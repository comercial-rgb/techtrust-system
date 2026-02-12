/**
 * ============================================================
 * MULTI-STATE COMPLIANCE RULE ENGINE
 * ============================================================
 * Data-driven compliance engine that determines:
 * 1. Which requirements apply to a provider (based on location + services)
 * 2. What compliance items to create (intake rules)
 * 3. Which services are eligible (gating rules)
 * 4. Whether risk disclaimers are needed (risk rules)
 *
 * Nothing is hardcoded per state — all driven by:
 *   StateProfile → JurisdictionPolicy → ComplianceRequirement
 */

import {
  PrismaClient,
  ComplianceType,
  ComplianceStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

// ============================================
// TYPES
// ============================================

export interface ResolvedJurisdiction {
  stateCode: string;
  stateName: string;
  countyName?: string | null;
  cityName?: string | null;
  insideCityLimits?: boolean | null;
  isActiveState: boolean;
}

export interface RequiredItem {
  requirementKey: string;
  displayName: string;
  issuingAuthority?: string;
  scope: string;
  verificationMode: string;
  fieldsSchema: any;
  renewalRule?: string;
  isMandatory: boolean;
  appliesToServices: string[];
  priority: number;
}

export interface EligibilityResult {
  serviceType: string;
  eligible: boolean;
  reasonCodes: string[];
}

export interface ComplianceSummaryResult {
  jurisdiction: ResolvedJurisdiction;
  requiredItems: RequiredItem[];
  complianceItems: any[];
  insurancePolicies: any[];
  serviceGating: Record<string, { allowed: boolean; reason?: string }>;
  serviceEligibilities: EligibilityResult[];
  providerPublicStatus: string;
  disclaimersNeeded: { serviceType: string; disclaimerVersion?: any }[];
}

// ============================================
// JURISDICTION RESOLVER
// ============================================

/**
 * Resolve jurisdiction from provider address.
 * MVP: uses provider-declared state/county/city.
 * Future: geocoding + boundary checks.
 */
export async function resolveJurisdiction(
  stateCode: string,
  countyName?: string | null,
  cityName?: string | null,
  insideCityLimits?: boolean | null
): Promise<ResolvedJurisdiction> {
  const stateProfile = await prisma.stateProfile.findUnique({
    where: { stateCode: stateCode.toUpperCase() },
  });

  return {
    stateCode: stateCode.toUpperCase(),
    stateName: stateProfile?.stateName || stateCode,
    countyName,
    cityName,
    insideCityLimits,
    isActiveState: stateProfile?.isActive ?? false,
  };
}

// ============================================
// REQUIREMENT RESOLUTION (INTAKE RULES)
// ============================================

/**
 * Determine all compliance requirements that apply to a provider
 * based on their jurisdiction and services offered.
 */
export async function resolveRequirements(
  jurisdiction: ResolvedJurisdiction,
  servicesOffered: string[]
): Promise<RequiredItem[]> {
  const { stateCode, countyName, cityName, insideCityLimits } = jurisdiction;

  // Find all applicable jurisdiction policies (state-level + county-level + city-level)
  const policies = await prisma.jurisdictionPolicy.findMany({
    where: {
      stateCode,
      isActive: true,
      OR: [
        // State-wide policy (no county/city specified)
        { countyName: null, cityName: null },
        // County-level policy
        ...(countyName ? [{ countyName, cityName: null }] : []),
        // City-level policy (only if inside city limits)
        ...(cityName && insideCityLimits !== false
          ? [{ countyName: countyName || null, cityName }]
          : []),
      ],
    },
    include: {
      requirements: {
        include: {
          requirement: true,
        },
      },
    },
  });

  // Collect all requirements, deduplicating by requirementKey
  const requirementMap = new Map<string, RequiredItem>();

  for (const policy of policies) {
    for (const jr of policy.requirements) {
      const req = jr.requirement;
      if (!req.isActive) continue;

      // Check if requirement applies to any of the provider's services
      const appliesTo = (req.appliesToServices as string[]) || ["ALL"];
      const appliesToProvider =
        appliesTo.includes("ALL") ||
        appliesTo.some((s) => servicesOffered.includes(s));

      if (!appliesToProvider) continue;

      // City-level requirements only apply if inside city limits
      if (
        req.scope === "CITY" &&
        insideCityLimits === false
      ) {
        continue;
      }

      // Use jurisdiction-specific override or fallback to catalog
      const displayName =
        jr.displayNameOverride || req.displayName;
      const issuingAuthority =
        jr.issuingAuthorityOverride || undefined;

      // Deduplicate: keep the most specific (mandatory wins over recommended)
      const existing = requirementMap.get(req.requirementKey);
      if (!existing || (jr.isMandatory && !existing.isMandatory)) {
        requirementMap.set(req.requirementKey, {
          requirementKey: req.requirementKey,
          displayName,
          issuingAuthority,
          scope: req.scope,
          verificationMode: req.verificationMode,
          fieldsSchema: req.fieldsSchema,
          renewalRule: req.renewalRule || undefined,
          isMandatory: jr.isMandatory,
          appliesToServices: appliesTo,
          priority: req.priority,
        });
      }
    }
  }

  // Sort by priority
  return Array.from(requirementMap.values()).sort(
    (a, b) => a.priority - b.priority
  );
}

// ============================================
// COMPLIANCE ITEM AUTO-CREATION
// ============================================

/**
 * Map requirementKey to ComplianceType enum.
 * This bridges the dynamic catalog to the existing schema.
 */
function requirementKeyToComplianceType(
  key: string
): ComplianceType {
  const map: Record<string, ComplianceType> = {
    STATE_REPAIR_SHOP_REG: "STATE_SHOP_REGISTRATION",
    STATE_REPAIR_SHOP_REG_FL: "FDACS_MOTOR_VEHICLE_REPAIR",
    LOCAL_BUSINESS_LICENSE_COUNTY: "LOCAL_BTR_COUNTY",
    LOCAL_BUSINESS_LICENSE_CITY: "LOCAL_BTR_CITY",
    EPA_609: "EPA_609_TECHNICIAN",
  };
  return map[key] || "STATE_SHOP_REGISTRATION";
}

/**
 * Auto-create compliance items for a provider based on resolved requirements.
 * This replaces the hardcoded Florida-specific auto-create logic.
 */
export async function autoCreateComplianceItemsFromRules(
  providerProfileId: string
): Promise<{ created: string[]; jurisdiction: ResolvedJurisdiction }> {
  const profile = await prisma.providerProfile.findUnique({
    where: { id: providerProfileId },
  });

  if (!profile) {
    throw new Error("Provider profile not found");
  }

  const servicesOffered = (profile.servicesOffered as string[]) || [];
  const jurisdiction = await resolveJurisdiction(
    profile.state,
    profile.county,
    profile.city,
    profile.insideCityLimits
  );

  const requirements = await resolveRequirements(jurisdiction, servicesOffered);
  const created: string[] = [];

  // Also check if state requires repair shop registration (fallback for states without full policy setup)
  const stateProfile = await prisma.stateProfile.findUnique({
    where: { stateCode: jurisdiction.stateCode },
  });

  for (const req of requirements) {
    const complianceType = requirementKeyToComplianceType(req.requirementKey);

    // Determine initial status
    let status: ComplianceStatus = "NOT_PROVIDED";
    if (req.scope === "CITY" && profile.insideCityLimits === false) {
      status = "NOT_APPLICABLE";
    }

    // For state shop reg, check if provider already has the number
    if (
      req.requirementKey.startsWith("STATE_REPAIR_SHOP_REG") &&
      profile.fdacsRegistrationNumber
    ) {
      status = "PROVIDED_UNVERIFIED";
    }

    // Determine issuing authority
    let issuingAuthority = req.issuingAuthority;
    if (!issuingAuthority) {
      if (req.scope === "STATE" && stateProfile?.stateRepairShopRegAuthority) {
        issuingAuthority = stateProfile.stateRepairShopRegAuthority;
      } else if (req.scope === "COUNTY" && profile.county) {
        issuingAuthority = `${profile.county} County`;
      } else if (req.scope === "CITY" && profile.city) {
        issuingAuthority = `City of ${profile.city}`;
      }
    }

    await prisma.complianceItem.upsert({
      where: {
        providerProfileId_type_technicianId: {
          providerProfileId,
          type: complianceType,
          technicianId: null as unknown as string,
        },
      },
      update: {
        requirementKey: req.requirementKey,
      },
      create: {
        providerProfileId,
        type: complianceType,
        requirementKey: req.requirementKey,
        status,
        licenseNumber:
          req.requirementKey.startsWith("STATE_REPAIR_SHOP_REG") &&
          profile.fdacsRegistrationNumber
            ? profile.fdacsRegistrationNumber
            : undefined,
        issuingAuthority,
      },
    });
    created.push(req.requirementKey);
  }

  return { created, jurisdiction };
}

// ============================================
// SERVICE ELIGIBILITY (GATING RULES)
// ============================================

/**
 * Calculate service eligibility for a provider.
 * Persists results to ServiceEligibility table.
 */
export async function calculateServiceEligibility(
  providerProfileId: string
): Promise<EligibilityResult[]> {
  const profile = await prisma.providerProfile.findUnique({
    where: { id: providerProfileId },
    include: {
      complianceItems: { include: { technician: true } },
      technicians: true,
      insurancePolicies: true,
    },
  });

  if (!profile) {
    throw new Error("Provider profile not found");
  }

  const servicesOffered = (profile.servicesOffered as string[]) || [];
  const results: EligibilityResult[] = [];
  const now = new Date();

  for (const service of servicesOffered) {
    const reasonCodes: string[] = [];

    // ── A/C Service: requires EPA 609 certified technician ──
    if (service === "AC_SERVICE") {
      const verifiedTechs = profile.technicians.filter(
        (t) => t.epa609Status === "VERIFIED" && t.isActive
      );
      if (verifiedTechs.length === 0) {
        reasonCodes.push("EPA_609_MISSING");
      }
    }

    // ── Towing: requires Commercial Auto + On-Hook insurance ──
    if (service === "TOWING") {
      const commercialAuto = profile.insurancePolicies.find(
        (p) => p.type === "COMMERCIAL_AUTO"
      );
      const onHook = profile.insurancePolicies.find(
        (p) => p.type === "ON_HOOK"
      );

      if (
        !commercialAuto ||
        commercialAuto.status !== "INS_VERIFIED" ||
        (commercialAuto.expirationDate && commercialAuto.expirationDate < now)
      ) {
        reasonCodes.push("COMMERCIAL_AUTO_INSURANCE_MISSING");
      }
      if (
        !onHook ||
        onHook.status !== "INS_VERIFIED" ||
        (onHook.expirationDate && onHook.expirationDate < now)
      ) {
        reasonCodes.push("ON_HOOK_INSURANCE_MISSING");
      }
    }

    // ── General: check if state repair shop reg is verified (soft gate) ──
    const stateReg = profile.complianceItems.find(
      (c) =>
        c.type === "FDACS_MOTOR_VEHICLE_REPAIR" ||
        c.type === "STATE_SHOP_REGISTRATION"
    );
    if (stateReg && stateReg.status === "EXPIRED") {
      reasonCodes.push("STATE_REGISTRATION_EXPIRED");
    }

    // ── Check general liability insurance ──
    const generalLiability = profile.insurancePolicies.find(
      (p) => p.type === "GENERAL_LIABILITY"
    );
    if (
      !generalLiability ||
      generalLiability.status === "INS_NOT_PROVIDED"
    ) {
      // Not a hard block but adds reason code for badges
      reasonCodes.push("GENERAL_LIABILITY_NOT_PROVIDED");
    } else if (generalLiability.status === "INS_EXPIRED") {
      reasonCodes.push("GENERAL_LIABILITY_EXPIRED");
    }

    const eligible = !reasonCodes.some((code) =>
      // Hard blocks: these prevent the service from being offered
      [
        "EPA_609_MISSING",
        "COMMERCIAL_AUTO_INSURANCE_MISSING",
        "ON_HOOK_INSURANCE_MISSING",
        "STATE_REGISTRATION_EXPIRED",
      ].includes(code)
    );

    results.push({ serviceType: service, eligible, reasonCodes });

    // Persist to DB
    await prisma.serviceEligibility.upsert({
      where: {
        providerProfileId_serviceType: {
          providerProfileId,
          serviceType: service,
        },
      },
      update: {
        eligible,
        reasonCodes,
        lastCalculatedAt: now,
      },
      create: {
        providerProfileId,
        serviceType: service,
        eligible,
        reasonCodes,
        lastCalculatedAt: now,
      },
    });
  }

  return results;
}

// ============================================
// PROVIDER PUBLIC STATUS CALCULATION
// ============================================

/**
 * Recalculate and update provider's public status.
 */
export async function recalculateProviderStatus(
  providerProfileId: string
): Promise<string> {
  const profile = await prisma.providerProfile.findUnique({
    where: { id: providerProfileId },
    include: {
      complianceItems: true,
      insurancePolicies: true,
      serviceEligibilities: true,
    },
  });

  if (!profile) return "NOT_ELIGIBLE";

  const complianceItems = profile.complianceItems;
  const insurancePolicies = profile.insurancePolicies;

  // Check if any critical items are expired
  const hasExpired = complianceItems.some(
    (c) => c.status === "EXPIRED"
  );
  const hasExpiredInsurance = insurancePolicies.some(
    (p) => p.status === "INS_EXPIRED" && p.hasCoverage
  );

  // Check if all mandatory items are verified
  const mandatoryItems = complianceItems.filter(
    (c) => c.status !== "NOT_APPLICABLE"
  );
  const allVerified = mandatoryItems.every(
    (c) => c.status === "VERIFIED"
  );
  const allInsuranceVerified = insurancePolicies
    .filter((p) => p.hasCoverage)
    .every((p) => p.status === "INS_VERIFIED");

  let status: string;

  if (hasExpired || hasExpiredInsurance) {
    status = "RESTRICTED";
  } else if (allVerified && allInsuranceVerified && mandatoryItems.length > 0) {
    status = "VERIFIED";
  } else if (mandatoryItems.length === 0) {
    status = "PENDING";
  } else {
    status = "PENDING";
  }

  await prisma.providerProfile.update({
    where: { id: providerProfileId },
    data: {
      providerPublicStatus: status as any,
      isVerified: status === "VERIFIED",
      verifiedAt: status === "VERIFIED" ? new Date() : undefined,
    },
  });

  return status;
}

// ============================================
// FULL COMPLIANCE SUMMARY (for API responses)
// ============================================

/**
 * Get complete compliance summary for a provider.
 * Used by both the provider dashboard and customer-facing badges.
 */
export async function getFullComplianceSummary(
  providerProfileId: string
): Promise<ComplianceSummaryResult> {
  const profile = await prisma.providerProfile.findUnique({
    where: { id: providerProfileId },
    include: {
      complianceItems: { include: { technician: true } },
      technicians: true,
      insurancePolicies: true,
      serviceEligibilities: true,
    },
  });

  if (!profile) {
    throw new Error("Provider profile not found");
  }

  const servicesOffered = (profile.servicesOffered as string[]) || [];

  // Resolve jurisdiction
  const jurisdiction = await resolveJurisdiction(
    profile.state,
    profile.county,
    profile.city,
    profile.insideCityLimits
  );

  // Get required items from catalog
  const requiredItems = await resolveRequirements(jurisdiction, servicesOffered);

  // Build service gating from eligibilities
  const serviceGating: Record<string, { allowed: boolean; reason?: string }> =
    {};

  for (const elig of profile.serviceEligibilities) {
    const reasons = (elig.reasonCodes as string[]) || [];
    serviceGating[elig.serviceType] = {
      allowed: elig.eligible,
      reason: reasons.length > 0 ? reasons.join(", ") : undefined,
    };
  }

  // Check for needed disclaimers
  const disclaimersNeeded: { serviceType: string; disclaimerVersion?: any }[] =
    [];

  for (const service of servicesOffered) {
    // Check if any required insurance for this service is not verified
    const elig = profile.serviceEligibilities.find(
      (e) => e.serviceType === service
    );
    if (elig && !elig.eligible) {
      const disclaimer = await prisma.disclaimerVersion.findFirst({
        where: {
          isActive: true,
          OR: [
            { serviceType: service, stateCode: jurisdiction.stateCode },
            { serviceType: service, stateCode: null },
            { serviceType: null, stateCode: jurisdiction.stateCode },
            { serviceType: null, stateCode: null },
          ],
        },
        orderBy: { effectiveDate: "desc" },
      });
      disclaimersNeeded.push({
        serviceType: service,
        disclaimerVersion: disclaimer || undefined,
      });
    }
  }

  return {
    jurisdiction,
    requiredItems,
    complianceItems: profile.complianceItems,
    insurancePolicies: profile.insurancePolicies,
    serviceGating,
    serviceEligibilities: profile.serviceEligibilities.map((e) => ({
      serviceType: e.serviceType,
      eligible: e.eligible,
      reasonCodes: (e.reasonCodes as string[]) || [],
    })),
    providerPublicStatus: profile.providerPublicStatus,
    disclaimersNeeded,
  };
}

// ============================================
// DISCLAIMER RESOLUTION
// ============================================

/**
 * Get the active disclaimer for a specific service + state combination.
 */
export async function getActiveDisclaimer(
  serviceType: string,
  stateCode?: string
): Promise<any | null> {
  return prisma.disclaimerVersion.findFirst({
    where: {
      isActive: true,
      OR: [
        { serviceType, stateCode: stateCode || null },
        { serviceType, stateCode: null },
        { serviceType: null, stateCode: stateCode || null },
        { serviceType: null, stateCode: null },
      ],
    },
    orderBy: { effectiveDate: "desc" },
  });
}

// ============================================
// STATE AVAILABILITY CHECK
// ============================================

/**
 * Check if a state is active for marketplace operations.
 */
export async function isStateActive(stateCode: string): Promise<boolean> {
  const profile = await prisma.stateProfile.findUnique({
    where: { stateCode: stateCode.toUpperCase() },
  });
  return profile?.isActive ?? false;
}

/**
 * Get all active states.
 */
export async function getActiveStates(): Promise<
  { stateCode: string; stateName: string }[]
> {
  return prisma.stateProfile.findMany({
    where: { isActive: true },
    select: { stateCode: true, stateName: true },
    orderBy: { stateName: "asc" },
  });
}
