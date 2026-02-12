/**
 * ============================================================
 * MULTI-STATE COMPLIANCE SEED
 * ============================================================
 * Seeds the multi-state compliance architecture with:
 * 1. Compliance Requirements Catalog (federal + state patterns)
 * 2. Florida State Profile (first active state)
 * 3. Florida Jurisdiction Policies (state-wide)
 * 4. Default platform disclaimers
 *
 * Run: npx ts-node prisma/seed-multi-state.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🏗️  Seeding multi-state compliance architecture...\n");

  // ════════════════════════════════════════
  // 1. COMPLIANCE REQUIREMENTS CATALOG
  // ════════════════════════════════════════
  console.log("📋 Creating compliance requirements catalog...");

  const requirements = [
    {
      requirementKey: "STATE_REPAIR_SHOP_REG",
      scope: "STATE" as const,
      displayName: "State Repair Shop Registration",
      description:
        "State-level motor vehicle repair shop registration/license required by the state regulatory authority.",
      appliesToServices: ["ALL"],
      verificationMode: "UPLOAD_ONLY",
      fieldsSchema: {
        number: true,
        issuer: true,
        issueDate: true,
        expirationDate: true,
        uploads: true,
      },
      renewalRule: "annual",
      priority: 10,
    },
    {
      requirementKey: "LOCAL_BUSINESS_LICENSE_COUNTY",
      scope: "COUNTY" as const,
      displayName: "County Business Tax Receipt",
      description:
        "Local business tax receipt (BTR) or occupational license issued by the county.",
      appliesToServices: ["ALL"],
      verificationMode: "UPLOAD_ONLY",
      fieldsSchema: {
        number: true,
        issuer: true,
        issueDate: true,
        expirationDate: true,
        uploads: true,
      },
      renewalRule: "annual",
      priority: 20,
    },
    {
      requirementKey: "LOCAL_BUSINESS_LICENSE_CITY",
      scope: "CITY" as const,
      displayName: "City Business Tax Receipt",
      description:
        "Local business tax receipt (BTR) or occupational license issued by the city (required if inside city limits).",
      appliesToServices: ["ALL"],
      verificationMode: "UPLOAD_ONLY",
      fieldsSchema: {
        number: true,
        issuer: true,
        issueDate: true,
        expirationDate: true,
        uploads: true,
      },
      renewalRule: "annual",
      priority: 30,
    },
    {
      requirementKey: "EPA_609",
      scope: "FEDERAL" as const,
      displayName: "EPA Section 609 Technician Certification",
      description:
        "Federal certification required for technicians who service motor vehicle air conditioning systems. Required by the Clean Air Act.",
      appliesToServices: ["AC_SERVICE"],
      verificationMode: "UPLOAD_ONLY",
      fieldsSchema: {
        number: true,
        issuer: true,
        issueDate: true,
        uploads: true,
      },
      renewalRule: "none",
      priority: 40,
    },
  ];

  for (const req of requirements) {
    await prisma.complianceRequirement.upsert({
      where: { requirementKey: req.requirementKey },
      update: {
        displayName: req.displayName,
        description: req.description,
        appliesToServices: req.appliesToServices,
        verificationMode: req.verificationMode,
        fieldsSchema: req.fieldsSchema,
        renewalRule: req.renewalRule,
        priority: req.priority,
      },
      create: req,
    });
    console.log(`  ✅ ${req.requirementKey} (${req.scope})`);
  }

  // ════════════════════════════════════════
  // 2. STATE PROFILES
  // ════════════════════════════════════════
  console.log("\n🗺️  Creating state profiles...");

  // Florida - ACTIVE (first state)
  await prisma.stateProfile.upsert({
    where: { stateCode: "FL" },
    update: {
      isActive: true,
      stateRepairShopRegRequired: true,
      stateRepairShopRegDisplayName: "FDACS Motor Vehicle Repair Registration",
      stateRepairShopRegAuthority: "FDACS",
    },
    create: {
      stateCode: "FL",
      stateName: "Florida",
      isActive: true,
      stateRepairShopRegRequired: true,
      stateRepairShopRegDisplayName: "FDACS Motor Vehicle Repair Registration",
      stateRepairShopRegAuthority: "FDACS",
      defaultLocalLicenseModel: "CITY_AND_COUNTY",
      towingRegulationLevel: "HIGH",
      notesInternal:
        "First active state. FDACS Motor Vehicle Repair Act (F.S. 559.901-935). Towing regulated under F.S. 715.07.",
    },
  });
  console.log("  ✅ FL - Florida (ACTIVE)");

  // Pre-seed other major states as INACTIVE (ready for expansion)
  const inactiveStates = [
    {
      stateCode: "TX",
      stateName: "Texas",
      stateRepairShopRegRequired: false,
      stateRepairShopRegDisplayName: null,
      stateRepairShopRegAuthority: null,
      defaultLocalLicenseModel: "COUNTY_ONLY" as const,
      towingRegulationLevel: "MEDIUM" as const,
      notesInternal:
        "Texas does not require state-level repair shop registration. Local licenses vary by county.",
    },
    {
      stateCode: "CA",
      stateName: "California",
      stateRepairShopRegRequired: true,
      stateRepairShopRegDisplayName: "BAR Auto Repair Dealer License",
      stateRepairShopRegAuthority: "Bureau of Automotive Repair (BAR)",
      defaultLocalLicenseModel: "CITY_AND_COUNTY" as const,
      towingRegulationLevel: "HIGH" as const,
      notesInternal:
        "California Bureau of Automotive Repair (BAR) regulates auto repair dealers. Very strict towing regulations.",
    },
    {
      stateCode: "NY",
      stateName: "New York",
      stateRepairShopRegRequired: true,
      stateRepairShopRegDisplayName: "DMV Repair Shop Registration",
      stateRepairShopRegAuthority: "NYS DMV",
      defaultLocalLicenseModel: "CITY_AND_COUNTY" as const,
      towingRegulationLevel: "HIGH" as const,
      notesInternal:
        "New York DMV requires repair shop registration. NYC has additional requirements.",
    },
    {
      stateCode: "GA",
      stateName: "Georgia",
      stateRepairShopRegRequired: false,
      stateRepairShopRegDisplayName: null,
      stateRepairShopRegAuthority: null,
      defaultLocalLicenseModel: "COUNTY_ONLY" as const,
      towingRegulationLevel: "LOW" as const,
      notesInternal:
        "Georgia does not require state-level repair shop registration. Local business licenses required.",
    },
    {
      stateCode: "NJ",
      stateName: "New Jersey",
      stateRepairShopRegRequired: false,
      stateRepairShopRegDisplayName: null,
      stateRepairShopRegAuthority: null,
      defaultLocalLicenseModel: "VARIES" as const,
      towingRegulationLevel: "MEDIUM" as const,
      notesInternal: "No state repair shop registration required.",
    },
    {
      stateCode: "PA",
      stateName: "Pennsylvania",
      stateRepairShopRegRequired: false,
      stateRepairShopRegDisplayName: null,
      stateRepairShopRegAuthority: null,
      defaultLocalLicenseModel: "VARIES" as const,
      towingRegulationLevel: "MEDIUM" as const,
      notesInternal: "No state repair shop registration required. Emission inspection stations need separate license.",
    },
    {
      stateCode: "IL",
      stateName: "Illinois",
      stateRepairShopRegRequired: false,
      stateRepairShopRegDisplayName: null,
      stateRepairShopRegAuthority: null,
      defaultLocalLicenseModel: "CITY_AND_COUNTY" as const,
      towingRegulationLevel: "MEDIUM" as const,
      notesInternal: "No state repair shop registration required. Chicago has additional business licensing.",
    },
    {
      stateCode: "OH",
      stateName: "Ohio",
      stateRepairShopRegRequired: false,
      stateRepairShopRegDisplayName: null,
      stateRepairShopRegAuthority: null,
      defaultLocalLicenseModel: "COUNTY_ONLY" as const,
      towingRegulationLevel: "LOW" as const,
      notesInternal: "No state repair shop registration required.",
    },
  ];

  for (const state of inactiveStates) {
    await prisma.stateProfile.upsert({
      where: { stateCode: state.stateCode },
      update: {},
      create: {
        ...state,
        isActive: false,
      },
    });
    console.log(`  ⏸️  ${state.stateCode} - ${state.stateName} (inactive)`);
  }

  // ════════════════════════════════════════
  // 3. FLORIDA JURISDICTION POLICIES
  // ════════════════════════════════════════
  console.log("\n📜 Creating Florida jurisdiction policies...");

  // State-wide policy for Florida
  // Note: Prisma TS types don't allow null in composite unique where,
  // so we use findFirst + create/update pattern
  let flStatePolicy = await prisma.jurisdictionPolicy.findFirst({
    where: {
      stateCode: "FL",
      countyName: null,
      cityName: null,
    },
  });

  if (flStatePolicy) {
    flStatePolicy = await prisma.jurisdictionPolicy.update({
      where: { id: flStatePolicy.id },
      data: { isActive: true },
    });
  } else {
    flStatePolicy = await prisma.jurisdictionPolicy.create({
      data: {
        stateCode: "FL",
        isActive: true,
        notesInternal:
          "Florida state-wide policy: FDACS registration + county BTR + city BTR + EPA 609 for A/C",
      },
    });
  }

  // Link requirements to FL state-wide policy
  const flRequirements = [
    {
      requirementKey: "STATE_REPAIR_SHOP_REG",
      displayNameOverride: "FDACS Motor Vehicle Repair Registration",
      issuingAuthorityOverride: "FDACS",
      isMandatory: true,
    },
    {
      requirementKey: "LOCAL_BUSINESS_LICENSE_COUNTY",
      displayNameOverride: "County Business Tax Receipt (BTR)",
      issuingAuthorityOverride: null,
      isMandatory: true,
    },
    {
      requirementKey: "LOCAL_BUSINESS_LICENSE_CITY",
      displayNameOverride: "City Business Tax Receipt (BTR)",
      issuingAuthorityOverride: null,
      isMandatory: true,
    },
    {
      requirementKey: "EPA_609",
      displayNameOverride: null,
      issuingAuthorityOverride: null,
      isMandatory: true,
    },
  ];

  // Clear existing and re-create
  await prisma.jurisdictionRequirement.deleteMany({
    where: { policyId: flStatePolicy.id },
  });

  for (const req of flRequirements) {
    await prisma.jurisdictionRequirement.create({
      data: {
        policyId: flStatePolicy.id,
        requirementKey: req.requirementKey,
        displayNameOverride: req.displayNameOverride,
        issuingAuthorityOverride: req.issuingAuthorityOverride,
        isMandatory: req.isMandatory,
      },
    });
    console.log(
      `  ✅ FL → ${req.requirementKey}${req.displayNameOverride ? ` (${req.displayNameOverride})` : ""}`
    );
  }

  // ════════════════════════════════════════
  // 4. DEFAULT DISCLAIMERS
  // ════════════════════════════════════════
  console.log("\n⚖️  Creating default disclaimers...");

  const disclaimers = [
    {
      serviceType: null,
      stateCode: null,
      version: "v1.0",
      text: `IMPORTANT NOTICE: The service provider you have selected has not yet provided verified proof of insurance coverage. By proceeding, you acknowledge and accept the associated risks.

TechTrust AutoSolutions operates as a technology marketplace connecting vehicle owners with independent automotive service providers. We do not employ, direct, or control service providers. Each service provider is an independent business solely responsible for:

• Maintaining all required licenses and registrations
• Carrying adequate insurance coverage
• Complying with all applicable federal, state, and local laws
• The quality and safety of their work

TechTrust does not guarantee, warrant, or endorse any service provider's qualifications, insurance status, or work quality.

By tapping "I Accept," you confirm that you understand these terms and voluntarily proceed with this service provider.`,
    },
    {
      serviceType: "TOWING",
      stateCode: null,
      version: "v1.0",
      text: `TOWING SERVICE DISCLAIMER: The towing provider you selected has not provided verified Commercial Auto and/or On-Hook/Tow insurance. Towing services without proper insurance coverage may expose your vehicle to uninsured risk.

TechTrust AutoSolutions strongly recommends using only towing providers with verified insurance coverage. By proceeding, you acknowledge that:

• You understand the provider's insurance status is not verified
• You accept full responsibility for any damage during towing
• TechTrust is not liable for any loss or damage

By tapping "I Accept," you confirm that you understand and accept these risks.`,
    },
    {
      serviceType: "AC_SERVICE",
      stateCode: null,
      version: "v1.0",
      text: `A/C SERVICE NOTICE: Federal law (Clean Air Act, Section 609) requires that all technicians servicing motor vehicle air conditioning systems hold a valid EPA Section 609 certification.

The selected provider's A/C technician certification status has not been verified. By proceeding, you acknowledge this notice.`,
    },
  ];

  for (const d of disclaimers) {
    const existing = await prisma.disclaimerVersion.findFirst({
      where: {
        serviceType: d.serviceType,
        stateCode: d.stateCode,
        version: d.version,
      },
    });

    if (!existing) {
      await prisma.disclaimerVersion.create({ data: { ...d, isActive: true } });
      console.log(
        `  ✅ Disclaimer ${d.version} for ${d.serviceType || "ALL"} / ${d.stateCode || "ALL"}`
      );
    } else {
      console.log(
        `  ⏭️  Disclaimer ${d.version} for ${d.serviceType || "ALL"} / ${d.stateCode || "ALL"} already exists`
      );
    }
  }

  // ════════════════════════════════════════
  // 5. PLATFORM LEGAL TERMS (embedded in disclaimer)
  // ════════════════════════════════════════
  console.log("\n📄 Creating platform legal marketplace disclaimer...");

  const platformDisclaimer = {
    serviceType: null,
    stateCode: null,
    version: "platform-v1.0",
    text: `TechTrust AutoSolutions operates as a technology marketplace and does not provide automotive repair services, towing services, or mechanical work. All services listed on the platform are performed by independent businesses ("Service Providers") who are solely responsible for:

1. Complying with all applicable federal, state, and local laws and regulations
2. Maintaining required business licenses, registrations, and certifications
3. Carrying adequate insurance coverage
4. The quality, safety, and legality of their services
5. Accurate representation of their qualifications

TechTrust facilitates connections between vehicle owners and Service Providers through technology. TechTrust does not employ, supervise, direct, or control Service Providers or their work.

Use of the TechTrust platform constitutes acceptance of these terms.`,
  };

  const existingPlatform = await prisma.disclaimerVersion.findFirst({
    where: {
      serviceType: null,
      stateCode: null,
      version: "platform-v1.0",
    },
  });

  if (!existingPlatform) {
    await prisma.disclaimerVersion.create({
      data: { ...platformDisclaimer, isActive: true },
    });
    console.log("  ✅ Platform marketplace disclaimer created");
  }

  console.log("\n✅ Multi-state compliance seed complete!");
  console.log("   - 4 compliance requirements in catalog");
  console.log("   - 9 state profiles (1 active: FL)");
  console.log("   - 1 jurisdiction policy (FL state-wide with 4 requirements)");
  console.log("   - 4 disclaimer versions");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
