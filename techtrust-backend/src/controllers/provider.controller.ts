/**
 * ============================================
 * PROVIDER CONTROLLER
 * ============================================
 * Features específicas para fornecedores
 */

import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { prisma } from "../config/database";
import { geocodeAddress, formatAddress } from "../services/geocoding.service";
import { findProvidersWithinRadius, kmToMiles } from "../utils/distance";
import { RAW_TO_SERVICE_OFFERED } from "../config/service-type-mapping";
import { logger } from "../config/logger";
import { buildProviderDisclosure } from "../utils/provider-disclosures";
import { buildInsuranceRequirementChecklist } from "../utils/insurance-requirements";

/**
 * GET /api/v1/providers/profile
 * Full provider profile via raw SQL — bypasses stale Prisma Client.
 */
export const getProfile = async (req: Request, res: Response) => {
  const providerId = req.user!.id;

  const rows = await prisma.$queryRaw<any[]>`
    SELECT * FROM "provider_profiles" WHERE "userId" = ${providerId} LIMIT 1
  `;

  res.json({
    success: true,
    data: rows[0] || null,
  });
};

/**
 * GET /api/v1/providers/dashboard
 * Dashboard do fornecedor
 */
export const getDashboard = async (req: Request, res: Response) => {
  const providerId = req.user!.id;

  // Estatísticas gerais
  const [
    profile,
    activeQuotes,
    activeWorkOrders,
    completedServices,
    pendingPayments,
  ] = await Promise.all([
    prisma.providerProfile.findUnique({
      where: { userId: providerId },
    }),
    prisma.quote.count({
      where: {
        providerId,
        status: "PENDING",
      },
    }),
    prisma.workOrder.count({
      where: {
        providerId,
        status: {
          in: ["PENDING_START", "IN_PROGRESS", "AWAITING_APPROVAL"],
        },
      },
    }),
    prisma.workOrder.count({
      where: {
        providerId,
        status: "COMPLETED",
      },
    }),
    prisma.payment.aggregate({
      where: {
        providerId,
        status: "PENDING",
      },
      _sum: {
        providerAmount: true,
      },
    }),
  ]);

  // Receita total
  const totalRevenue = await prisma.payment.aggregate({
    where: {
      providerId,
      status: "CAPTURED",
    },
    _sum: {
      providerAmount: true,
    },
  });

  // Últimos work orders
  const recentWorkOrders = await prisma.workOrder.findMany({
    where: { providerId },
    take: 5,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      serviceRequest: {
        select: {
          title: true,
          serviceType: true,
        },
      },
      customer: {
        select: {
          fullName: true,
        },
      },
    },
  });

  res.json({
    success: true,
    data: {
      profile,
      stats: {
        activeQuotes,
        activeWorkOrders,
        completedServices,
        averageRating: Number(profile?.averageRating || 0),
        totalReviews: profile?.totalReviews || 0,
        pendingPayments: Number(pendingPayments._sum.providerAmount || 0),
        totalRevenue: Number(totalRevenue._sum?.providerAmount || 0),
      },
      recentWorkOrders,
    },
  });
};

/**
 * GET /api/v1/providers/available-requests
 * Buscar solicitações disponíveis para orçamento
 */
export const getAvailableRequests = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const { serviceType, page = 1, limit = 10 } = req.query;

  // Load provider profile for capability filtering
  const providerProfile = await prisma.providerProfile.findUnique({
    where: { userId: providerId },
    select: { servicesOffered: true, vehicleTypesServed: true, sellsParts: true },
  });

  const providerServices: string[] = Array.isArray(providerProfile?.servicesOffered)
    ? (providerProfile!.servicesOffered as string[]).map((s: string) => s.toUpperCase())
    : [];
  const providerVehicleTypes: string[] = Array.isArray(providerProfile?.vehicleTypesServed)
    ? (providerProfile!.vehicleTypesServed as string[]).map((s: string) => s.toUpperCase())
    : [];
  const providerSellsParts = providerProfile?.sellsParts || false;

  // Verificar se fornecedor já enviou quote
  const myQuotes = await prisma.quote.findMany({
    where: { providerId },
    select: { serviceRequestId: true },
  });

  const quotedRequestIds = myQuotes.map((q) => q.serviceRequestId);

  const where: any = {
    status: {
      in: ["SEARCHING_PROVIDERS", "QUOTES_RECEIVED"],
    },
    quotesCount: {
      lt: 5, // Ainda aceita orçamentos
    },
    NOT: {
      id: {
        in: quotedRequestIds, // Não mostrar onde já enviei quote
      },
    },
  };

  if (serviceType) {
    where.serviceType = serviceType;
  }

  const allRequests = await prisma.serviceRequest.findMany({
    where,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      vehicle: {
        select: {
          make: true,
          model: true,
          year: true,
        },
      },
      user: {
        select: {
          fullName: true,
          city: true,
          state: true,
        },
      },
    },
  });

  // Same mapping as getPendingRequests
  // Filter by provider capabilities
  const filteredRequests = allRequests.filter((r) => {
    if (providerServices.length === 0) return true;
    const rawType = (r as any).rawServiceType?.toLowerCase() || "";
    const matchingServices = RAW_TO_SERVICE_OFFERED[rawType] || ["GENERAL_REPAIR"];
    const serviceMatch = matchingServices.some((s) => providerServices.includes(s));
    if (!serviceMatch) return false;
    const requestVehicleCategory = ((r as any).vehicleCategory || "").toUpperCase();
    if (requestVehicleCategory && providerVehicleTypes.length > 0) {
      if (!providerVehicleTypes.includes(requestVehicleCategory)) return false;
    }
    const requestScope = (r as any).serviceScope || "";
    if (requestScope === "parts" && !providerSellsParts) return false;
    return true;
  });

  const skip = (Number(page) - 1) * Number(limit);
  const paginatedRequests = filteredRequests.slice(skip, skip + Number(limit));
  const total = filteredRequests.length;

  res.json({
    success: true,
    data: {
      requests: paginatedRequests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    },
  });
};

/**
 * GET /api/v1/providers/my-quotes
 * Meus orçamentos enviados
 */
export const getMyQuotes = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const { status, page = 1, limit = 10 } = req.query;

  const where: any = { providerId };

  if (status) {
    where.status = status;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [quotes, total] = await Promise.all([
    prisma.quote.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: {
        createdAt: "desc",
      },
      include: {
        serviceRequest: {
          select: {
            requestNumber: true,
            title: true,
            serviceType: true,
            status: true,
            vehicle: {
              select: {
                make: true,
                model: true,
                year: true,
              },
            },
          },
        },
      },
    }),
    prisma.quote.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      quotes,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    },
  });
};

/**
 * PATCH /api/v1/providers/profile
 * Atualizar perfil do fornecedor
 */
export const updateProfile = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const {
    businessName,
    legalName,
    ein,
    sunbizDocumentNumber,
    businessIdentityStatus,
    businessPhone,
    businessEmail,
    address,
    city,
    state,
    zipCode,
    serviceRadiusKm,
    specialties,
    businessHours,
    mobileService,
    roadsideAssistance,
    freeKm,
    extraFeePerKm,
    travelChargeType,
    fdacsRegistrationNumber,
    cityBusinessTaxReceiptNumber,
    countyBusinessTaxReceiptNumber,
    businessTaxReceiptStatus,
    payoutMethod,
    zelleEmail,
    zellePhone,
    bankTransferLabel,
    bankAccountType,
    bankAccountNumber,
    bankRoutingNumber,
    payoutInstructions,
    marketplaceFacilitatorTaxAcknowledged,
    insuranceDisclosureAccepted,
    insuranceDisclosureDeclined,
    servicesOffered,
    vehicleTypesServed,
    sellsParts,
    businessDescription,
    serviceCounties,
  } = req.body;

  // Se endereço foi fornecido, tenta fazer geocoding
  let baseLatitude = undefined;
  let baseLongitude = undefined;

  if (address && city && state) {
    const fullAddress = formatAddress(address, city, state, zipCode);
    const geocoded = await geocodeAddress(fullAddress);

    if (geocoded) {
      baseLatitude = geocoded.latitude;
      baseLongitude = geocoded.longitude;
      logger.info(
        `Geocoding ok: (${baseLatitude}, ${baseLongitude})`,
      );
    } else {
      logger.warn(`Geocoding falhou para endereço informado`);
    }
  }

  // Ensure the profile row exists — INSERT with defaults, do nothing on conflict.
  // Uses raw SQL to bypass stale Prisma Client validation on newer columns.
  // id uses randomUUID because Prisma's cuid() is JS-level, not a DB default.
  const newProfileId = randomUUID();
  await prisma.$executeRaw`
    INSERT INTO "provider_profiles" (
      "id", "userId", "businessName", "businessPhone", "businessEmail",
      "address", "city", "state", "zipCode", "serviceRadiusKm",
      "mobileService", "roadsideAssistance", "freeKm", "extraFeePerKm",
      "travelChargeType", "specialties", "payoutMethod",
      "marketplaceFacilitatorTaxAcknowledged", "servicesOffered",
      "vehicleTypesServed", "sellsParts", "isVerified",
      "averageRating", "totalReviews", "totalServicesCompleted",
      "updatedAt"
    ) VALUES (
      ${newProfileId}, ${providerId}, 'My Business', '', '', '', '', 'FL', '', 50,
      false, false, 0, 0.00, 'ONE_WAY', '[]'::jsonb, 'MANUAL',
      true, '[]'::jsonb, '[]'::jsonb, false, false, 0, 0, 0,
      NOW()
    )
    ON CONFLICT ("userId") DO NOTHING
  `;

  // Build a dynamic UPDATE using raw SQL to bypass stale Prisma Client.
  const sqlParams: any[] = [providerId];
  const setClauses: string[] = [];

  const addStr = (col: string, val: string | null) => {
    sqlParams.push(val);
    setClauses.push(`"${col}" = $${sqlParams.length}`);
  };
  const addNum = (col: string, val: number | null) => {
    sqlParams.push(val);
    setClauses.push(`"${col}" = $${sqlParams.length}`);
  };
  const addBool = (col: string, val: boolean) => {
    sqlParams.push(val);
    setClauses.push(`"${col}" = $${sqlParams.length}`);
  };
  const addJson = (col: string, val: any) => {
    sqlParams.push(JSON.stringify(val));
    setClauses.push(`"${col}" = $${sqlParams.length}::jsonb`);
  };

  if (businessName) addStr("businessName", businessName);
  if (legalName !== undefined) addStr("legalName", legalName || null);
  if (ein !== undefined) addStr("ein", ein || null);
  if (sunbizDocumentNumber !== undefined) addStr("sunbizDocumentNumber", sunbizDocumentNumber || null);
  if (businessPhone) addStr("businessPhone", businessPhone);
  if (businessEmail) addStr("businessEmail", businessEmail);
  if (address !== undefined) addStr("address", address);
  if (city !== undefined) addStr("city", city);
  if (state !== undefined) addStr("state", state);
  if (zipCode !== undefined) addStr("zipCode", zipCode);
  if (serviceRadiusKm !== undefined) addNum("serviceRadiusKm", Number(serviceRadiusKm));
  if (baseLatitude !== undefined) addNum("baseLatitude", baseLatitude);
  if (baseLongitude !== undefined) addNum("baseLongitude", baseLongitude);
  if (mobileService !== undefined) addBool("mobileService", !!mobileService);
  if (roadsideAssistance !== undefined) addBool("roadsideAssistance", !!roadsideAssistance);
  if (freeKm !== undefined) addNum("freeKm", Number(freeKm));
  if (extraFeePerKm !== undefined) addNum("extraFeePerKm", Number(extraFeePerKm));
  if (travelChargeType !== undefined) addStr("travelChargeType", travelChargeType === "ROUND_TRIP" ? "ROUND_TRIP" : "ONE_WAY");
  if (specialties !== undefined) addJson("specialties", specialties);
  if (businessHours !== undefined) addJson("businessHours", businessHours);
  if (businessDescription !== undefined) addStr("businessDescription", businessDescription || null);
  if (servicesOffered !== undefined) addJson("servicesOffered", servicesOffered);
  if (vehicleTypesServed !== undefined) addJson("vehicleTypesServed", vehicleTypesServed);
  if (serviceCounties !== undefined) addJson("serviceCounties", serviceCounties);
  if (sellsParts !== undefined) addBool("sellsParts", !!sellsParts);
  if (fdacsRegistrationNumber !== undefined) addStr("fdacsRegistrationNumber", fdacsRegistrationNumber || null);
  if (cityBusinessTaxReceiptNumber !== undefined) addStr("cityBusinessTaxReceiptNumber", cityBusinessTaxReceiptNumber || null);
  if (countyBusinessTaxReceiptNumber !== undefined) addStr("countyBusinessTaxReceiptNumber", countyBusinessTaxReceiptNumber || null);
  if (payoutMethod !== undefined) addStr("payoutMethod", payoutMethod || "MANUAL");
  if (zelleEmail !== undefined) addStr("zelleEmail", zelleEmail || null);
  if (zellePhone !== undefined) addStr("zellePhone", zellePhone || null);
  if (bankTransferLabel !== undefined) addStr("bankTransferLabel", bankTransferLabel || null);
  if (bankAccountType !== undefined) addStr("bankAccountType", bankAccountType || null);
  if (bankAccountNumber !== undefined) addStr("bankAccountNumber", bankAccountNumber || null);
  if (bankRoutingNumber !== undefined) addStr("bankRoutingNumber", bankRoutingNumber || null);
  if (payoutInstructions !== undefined) addStr("payoutInstructions", payoutInstructions || null);
  if (marketplaceFacilitatorTaxAcknowledged !== undefined) addBool("marketplaceFacilitatorTaxAcknowledged", marketplaceFacilitatorTaxAcknowledged !== false);

  if (insuranceDisclosureAccepted) {
    sqlParams.push(new Date().toISOString());
    setClauses.push(`"insuranceDisclosureAcceptedAt" = $${sqlParams.length}`);
  }
  if (insuranceDisclosureDeclined) {
    sqlParams.push(new Date().toISOString());
    setClauses.push(`"insuranceDisclosureDeclinedAt" = $${sqlParams.length}`);
  }

  // businessIdentityStatus derivation
  if (businessIdentityStatus !== undefined || legalName !== undefined || ein !== undefined || sunbizDocumentNumber !== undefined) {
    const idStatus = businessIdentityStatus || (legalName || ein || sunbizDocumentNumber ? "PROVIDED_UNVERIFIED" : "NOT_PROVIDED");
    addStr("businessIdentityStatus", idStatus);
  }

  // businessTaxReceiptStatus derivation
  if (businessTaxReceiptStatus !== undefined || cityBusinessTaxReceiptNumber !== undefined || countyBusinessTaxReceiptNumber !== undefined) {
    const taxStatus = businessTaxReceiptStatus || (cityBusinessTaxReceiptNumber || countyBusinessTaxReceiptNumber ? "PROVIDED_UNVERIFIED" : "NOT_PROVIDED");
    addStr("businessTaxReceiptStatus", taxStatus);
  }

  if (setClauses.length > 0) {
    setClauses.push(`"updatedAt" = NOW()`);
    const sql = `UPDATE "provider_profiles" SET ${setClauses.join(", ")} WHERE "userId" = $1`;
    await prisma.$executeRawUnsafe(sql, ...sqlParams);
  }

  // Fetch the updated profile via raw SQL to avoid stale Prisma Client SELECT issues.
  const profileRows = await prisma.$queryRaw<any[]>`
    SELECT * FROM "provider_profiles" WHERE "userId" = ${providerId} LIMIT 1
  `;
  const profile = profileRows[0] || {};

  res.json({
    success: true,
    message: "Perfil atualizado com sucesso",
    data: {
      ...profile,
      disclosures: buildProviderDisclosure(profile),
      insuranceRequirements: buildInsuranceRequirementChecklist(profile),
    },
  });
};

/**
 * GET /api/v1/providers/onboarding-status
 * Lightweight, non-blocking provider onboarding checklist.
 */
export const getOnboardingStatus = async (req: Request, res: Response) => {
  const providerId = req.user!.id;

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: providerId },
    include: {
      complianceItems: true,
      insurancePolicies: true,
    },
  });

  if (!profile) {
    res.status(404).json({
      success: false,
      message: "Provider profile not found",
    });
    return;
  }

  const disclosures = buildProviderDisclosure(profile);
  const profileComplete = Boolean(
    profile.businessName &&
      profile.address &&
      profile.city &&
      profile.state &&
      profile.zipCode &&
      Array.isArray(profile.servicesOffered) &&
      profile.servicesOffered.length > 0,
  );

  const checklist = [
    {
      key: "profile",
      label: "Business profile",
      requiredToJoin: true,
      blocksMarketplace: false,
      complete: profileComplete,
    },
    {
      key: "tax_acknowledgment",
      label: "Marketplace facilitator tax acknowledgment",
      requiredToJoin: true,
      blocksMarketplace: false,
      complete: profile.marketplaceFacilitatorTaxAcknowledged !== false,
    },
    {
      key: "business_identity",
      label: "Business identity verification",
      requiredToJoin: false,
      blocksMarketplace: false,
      complete: profile.businessIdentityStatus === "VERIFIED",
      note:
        profile.businessIdentityStatus === "PROVIDED_UNVERIFIED"
          ? "Submitted for manual review against official state/county records."
          : "Optional during signup. Add legal name, EIN, or Sunbiz document number to speed up verification.",
    },
    {
      key: "payout",
      label: "Payout method",
      requiredToJoin: false,
      blocksMarketplace: false,
      complete: Boolean(profile.stripeOnboardingCompleted || profile.zelleEmail || profile.zellePhone || profile.bankTransferLabel),
      note: disclosures.payout.message,
    },
    {
      key: "local_btr",
      label: "City/County Business Tax Receipt",
      requiredToJoin: false,
      blocksMarketplace: false,
      complete: disclosures.compliance.localBusinessTaxReceiptDeclared,
      note: disclosures.compliance.message,
    },
    {
      key: "fdacs",
      label: "FDACS / state repair registration",
      requiredToJoin: false,
      blocksMarketplace: false,
      complete: disclosures.compliance.fdacsDeclared,
      note: "Recommended for Florida motor vehicle repair providers. Missing data is disclosed where applicable.",
    },
    {
      key: "insurance",
      label: "Insurance declaration",
      requiredToJoin: false,
      blocksMarketplace: false,
      complete: disclosures.insurance.declared || disclosures.insurance.disclosureAccepted,
      note: disclosures.insurance.message,
    },
  ];

  res.json({
    success: true,
    data: {
      profileId: profile.id,
      providerPublicStatus: profile.providerPublicStatus,
      canUsePlatform: true,
      canReceiveManualPayouts: true,
      canReceiveStripePayouts: Boolean(profile.stripeOnboardingCompleted),
      checklist,
      disclosures,
      insuranceRequirements: buildInsuranceRequirementChecklist(profile),
    },
  });
};

/**
 * GET /api/v1/providers/search
 * Buscar providers por localização e raio, ou por state/city/serviceType
 * Query params: lat, lng, radius (km), serviceType, state, city
 */
export const searchProvidersByLocation = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { lat, lng, radius = 50, serviceType, state, city } = req.query;

  const hasCoordinates = lat && lng;
  const hasLocationFilter = !!(state || city);

  // Build Prisma where clause
  const whereClause: any = {
    user: {
      status: "ACTIVE",
    },
  };

  // Only exclude providers without coordinates when doing pure radius search
  // (no state/city filter). When state/city is provided, include all matching
  // providers regardless of geocoding status.
  if (hasCoordinates && !hasLocationFilter) {
    whereClause.baseLatitude = { not: null };
    whereClause.baseLongitude = { not: null };
  }

  // Normalize "St." → "Saint" so "Port St. Lucie" matches "Port Saint Lucie" in DB
  const normalizeCityInput = (c: string) =>
    c.replace(/\bSt\.\s*/gi, 'Saint ').trim();

  // Filter by state/city at DB level when provided
  if (state) {
    whereClause.state = String(state);
  }
  if (city) {
    const cityStr = normalizeCityInput(String(city));
    whereClause.city = { equals: cityStr, mode: 'insensitive' };
  }

  // Buscar providers ativos
  const providers = await prisma.providerProfile.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
        },
      },
      insurancePolicies: true,
      complianceItems: true,
    },
  });

  // Filter by serviceType if provided (match against servicesOffered JSON array)
  // Supports comma-separated values for OR matching: e.g. "DIAGNOSTICS,BRAKES"
  const normalizeService = (v: string) => v.replace(/_/g, "").toUpperCase();
  const filteredByService = serviceType
    ? providers.filter((p) => {
        try {
          const providerServices: string[] = Array.isArray(p.servicesOffered)
            ? p.servicesOffered
            : JSON.parse(String(p.servicesOffered || "[]"));
          const targets = String(serviceType).split(",").map(normalizeService);
          const normalized = providerServices.map(normalizeService);
          return targets.some((t) => normalized.includes(t));
        } catch {
          return false;
        }
      })
    : providers;

  if (hasCoordinates) {
    // Radius-based search with distance calculation
    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);
    const radiusKm = parseFloat(radius as string);

    // Providers with geocoded coordinates get distance calculation.
    // Providers without coordinates (possible when state/city filter is active)
    // are included as-is with null distance.
    const withCoords = filteredByService.filter((p) => p.baseLatitude && p.baseLongitude);
    const withoutCoords = filteredByService.filter((p) => !p.baseLatitude || !p.baseLongitude);

    const mappedProviders = withCoords.map((p) => ({
      ...p,
      baseLocation: {
        latitude: Number(p.baseLatitude),
        longitude: Number(p.baseLongitude),
      },
      serviceRadiusKm: Math.max(Number(p.serviceRadiusKm) || radiusKm, radiusKm),
      freeMiles: Number(p.freeKm) > 0 ? kmToMiles(Number(p.freeKm)) : undefined,
      feePerMile: Number(p.extraFeePerKm) > 0 ? Number(p.extraFeePerKm) : undefined,
    }));

    const serviceLocation = { latitude, longitude };
    const providersWithDistance = findProvidersWithinRadius(
      serviceLocation,
      mappedProviders,
    );

    const enrichedWithDistance = providersWithDistance.map((item) => ({
      id: item.id,
      userId: item.userId,
      businessName: item.businessName,
      city: item.city,
      state: item.state,
      serviceRadiusKm: item.serviceRadiusKm,
      averageRating: item.averageRating,
      totalReviews: item.totalReviews,
      servicesOffered: item.servicesOffered,
      distance: {
        distanceKm: item.distanceInfo.distanceKm,
        distanceMiles: item.distanceInfo.distanceMiles,
        withinRadius: item.distanceInfo.withinRadius,
        estimatedTimeMinutes: item.distanceInfo.estimatedTimeMinutes,
      },
      travelFee: item.distanceInfo.travelFee,
      disclosures: buildProviderDisclosure(item),
      insuranceRequirements: buildInsuranceRequirementChecklist(item),
    }));

    // Providers matched by state/city but without geocoded coordinates
    const enrichedWithoutCoords = withoutCoords.map((p) => ({
      id: p.id,
      userId: p.userId,
      businessName: p.businessName,
      city: p.city,
      state: p.state,
      serviceRadiusKm: Number(p.serviceRadiusKm),
      averageRating: p.averageRating,
      totalReviews: p.totalReviews,
      servicesOffered: p.servicesOffered,
      distance: null,
      travelFee: null,
      disclosures: buildProviderDisclosure(p),
      insuranceRequirements: buildInsuranceRequirementChecklist(p),
    }));

    const enrichedProviders = [...enrichedWithDistance, ...enrichedWithoutCoords];

    res.json({
      success: true,
      data: {
        providers: enrichedProviders,
        searchLocation: { latitude, longitude },
        searchRadius: radiusKm,
        totalFound: enrichedProviders.length,
      },
    });
  } else {
    // No coordinates — return providers filtered by state/city/serviceType only
    const enrichedProviders = filteredByService.map((p) => ({
      id: p.id,
      userId: p.userId,
      businessName: p.businessName,
      city: p.city,
      state: p.state,
      serviceRadiusKm: Number(p.serviceRadiusKm),
      averageRating: p.averageRating,
      totalReviews: p.totalReviews,
      servicesOffered: p.servicesOffered,
      distance: null,
      travelFee: null,
      disclosures: buildProviderDisclosure(p),
      insuranceRequirements: buildInsuranceRequirementChecklist(p),
    }));

    res.json({
      success: true,
      data: {
        providers: enrichedProviders,
        searchLocation: null,
        searchRadius: null,
        totalFound: enrichedProviders.length,
      },
    });
  }
};

/**
 * GET /api/v1/providers/active-cities
 * Return states and cities that have at least one active provider.
 * Public endpoint — used by LandingScreen to show "Coming Soon" badges on cities.
 */
export const getActiveCities = async (_req: Request, res: Response): Promise<void> => {
  const providers = await prisma.providerProfile.findMany({
    where: {
      user: { status: 'ACTIVE' },
      state: { not: '' },
      city: { not: '' },
    },
    select: {
      state: true,
      city: true,
    },
  });

  // Normalize "St." → "Saint" so DB cities match the static city list in the mobile app
  const normCity = (c: string) => c.replace(/\bSt\.\s*/gi, 'Saint ').trim();

  // Build a map of state → Set<city>
  const stateMap: Record<string, Set<string>> = {};
  for (const p of providers) {
    if (!p.state || !p.city) continue;
    const st = p.state.toUpperCase();
    if (!stateMap[st]) stateMap[st] = new Set();
    stateMap[st].add(normCity(p.city));
  }

  // Convert to plain object
  const activeCities: Record<string, string[]> = {};
  for (const [state, cities] of Object.entries(stateMap)) {
    activeCities[state] = Array.from(cities).sort();
  }

  res.json({
    success: true,
    data: {
      activeStates: Object.keys(activeCities),
      activeCities,
    },
  });
};

/**
 * GET /api/v1/providers/dashboard-stats
 * Estatísticas resumidas do dashboard do fornecedor (D34, D38, D39, D40)
 */
export const getDashboardStats = async (req: Request, res: Response) => {
  const providerId = req.user!.id;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    profile,
    pendingRequests,
    activeWorkOrders,
    completedThisMonth,
    completedLastMonth,
    earningsThisMonth,
    earningsLastMonth,
    expiredQuotesCount,
    pendingRequestsLastMonth,
  ] = await Promise.all([
    prisma.providerProfile.findUnique({
      where: { userId: providerId },
    }),
    // Solicitações disponíveis para orçamento
    prisma.serviceRequest.count({
      where: {
        status: {
          in: ["SEARCHING_PROVIDERS", "QUOTES_RECEIVED"],
        },
        quotesCount: {
          lt: 5,
        },
      },
    }),
    // Ordens de serviço ativas
    prisma.workOrder.count({
      where: {
        providerId,
        status: {
          in: ["PENDING_START", "IN_PROGRESS", "AWAITING_APPROVAL"],
        },
      },
    }),
    // Completas este mês
    prisma.workOrder.count({
      where: {
        providerId,
        status: "COMPLETED",
        completedAt: {
          gte: startOfMonth,
        },
      },
    }),
    // D38 — Completas mês passado (para trend)
    prisma.workOrder.count({
      where: {
        providerId,
        status: "COMPLETED",
        completedAt: {
          gte: startOfLastMonth,
          lt: startOfMonth,
        },
      },
    }),
    // Ganhos do mês
    prisma.payment.aggregate({
      where: {
        providerId,
        status: "CAPTURED",
        capturedAt: {
          gte: startOfMonth,
        },
      },
      _sum: {
        providerAmount: true,
      },
    }),
    // D38 — Ganhos mês passado (para trend)
    prisma.payment.aggregate({
      where: {
        providerId,
        status: "CAPTURED",
        capturedAt: {
          gte: startOfLastMonth,
          lt: startOfMonth,
        },
      },
      _sum: {
        providerAmount: true,
      },
    }),
    // D34 — Expired quotes count
    prisma.quote.count({
      where: {
        providerId,
        status: "EXPIRED",
      },
    }),
    // D38 — Pending requests last month (for trend)
    prisma.serviceRequest.count({
      where: {
        status: {
          in: ["SEARCHING_PROVIDERS", "QUOTES_RECEIVED"],
        },
        createdAt: {
          gte: startOfLastMonth,
          lt: startOfMonth,
        },
      },
    }),
  ]);

  // D38 — Calculate trend percentages
  const calcTrend = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const earningsThisVal = Number(earningsThisMonth._sum.providerAmount || 0);
  const earningsLastVal = Number(earningsLastMonth._sum.providerAmount || 0);

  const trends = {
    requests: calcTrend(pendingRequests, pendingRequestsLastMonth),
    workOrders: 0, // active work orders is a snapshot, not a trend
    completed: calcTrend(completedThisMonth, completedLastMonth),
    earnings: calcTrend(earningsThisVal, earningsLastVal),
  };

  // D39 — Car Wash metrics (if applicable)
  let carWashMetrics = null;
  const businessType = profile?.businessTypeCat || 'REPAIR_SHOP';
  if (businessType === 'CAR_WASH' || businessType === 'BOTH') {
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [washesToday, totalWashes, activeWashes] = await Promise.all([
      prisma.carWash.count({
        where: {
          providerId: providerId,
          createdAt: { gte: todayStart },
        },
      }),
      prisma.carWash.count({
        where: {
          providerId: providerId,
          status: 'ACTIVE',
        },
      }),
      prisma.carWash.count({
        where: {
          providerId: providerId,
        },
      }),
    ]);
    carWashMetrics = { washesToday, activePackages: totalWashes, memberships: activeWashes };
  }

  // D40 — Parts Store metrics (if applicable)
  let partsStoreMetrics = null;
  if (profile) {
    try {
      const store = await prisma.partsStore.findFirst({
        where: { providerId: profile.id },
        select: { id: true },
      });
      if (store) {
        const [productsListed, pendingPickups] = await Promise.all([
          prisma.partsProduct.count({ where: { storeId: store.id, isActive: true } }),
          prisma.partsReservation.count({
            where: {
              product: { storeId: store.id },
              status: 'pending',
            },
          }),
        ]);
        partsStoreMetrics = {
          productsListed,
          pendingPickups,
          fillRate: productsListed > 0 ? Math.min(99, Math.round((productsListed / (productsListed + pendingPickups)) * 100)) : 0,
        };
      }
    } catch (err) {
      logger.warn('Parts store metrics lookup failed');
    }
  }

  res.json({
    success: true,
    data: {
      pendingRequests,
      activeWorkOrders,
      completedThisMonth,
      earningsThisMonth: earningsThisVal,
      rating: Number(profile?.averageRating || 0),
      totalReviews: profile?.totalReviews || 0,
      // D34 — Expired quotes
      expiredQuotes: expiredQuotesCount,
      // D38 — Trends
      trends,
      // D37 — Weekly reports preference (stored in user preferencesJson)
      businessType,
      // D39/D40 — Adaptive metrics
      carWashMetrics,
      partsStoreMetrics,
    },
  });
};

/**
 * GET /api/v1/providers/recent-activity
 * Atividade recente do fornecedor
 */
export const getRecentActivity = async (req: Request, res: Response) => {
  const providerId = req.user!.id;

  // Buscar últimas atividades
  const [recentQuotes, recentPayments, recentWorkOrders] = await Promise.all([
    prisma.quote.findMany({
      where: { providerId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        serviceRequest: {
          select: {
            title: true,
            vehicle: { select: { make: true, model: true, year: true } },
          },
        },
      },
    }),
    prisma.payment.findMany({
      where: { providerId, status: "CAPTURED" },
      orderBy: { capturedAt: "desc" },
      take: 5,
      include: {
        workOrder: {
          select: {
            serviceRequest: { select: { title: true } },
          },
        },
      },
    }),
    prisma.workOrder.findMany({
      where: { providerId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: 5,
      include: {
        serviceRequest: { select: { title: true } },
      },
    }),
  ]);

  const formatTimeAgo = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? "s" : ""}`;
  };

  // Combinar e formatar atividades
  const activities: any[] = [];

  recentQuotes.forEach((q) => {
    activities.push({
      id: q.id,
      type: q.status === "ACCEPTED" ? "quote_accepted" : "new_request",
      title: q.status === "ACCEPTED" ? "Quote accepted!" : "Quote sent",
      description: `${q.serviceRequest.title} - ${q.serviceRequest.vehicle?.make} ${q.serviceRequest.vehicle?.model}`,
      time: formatTimeAgo(q.createdAt),
      amount: q.status === "ACCEPTED" ? Number(q.totalAmount) : undefined,
    });
  });

  recentPayments.forEach((p) => {
    activities.push({
      id: p.id,
      type: "payment_received",
      title: "Payment received",
      description: p.workOrder?.serviceRequest?.title || "Service",
      time: formatTimeAgo(p.capturedAt || p.createdAt),
      amount: Number(p.providerAmount),
    });
  });

  recentWorkOrders.forEach((wo) => {
    activities.push({
      id: wo.id,
      type: "work_completed",
      title: "Service completed",
      description: wo.serviceRequest?.title || "Service",
      time: formatTimeAgo(wo.completedAt || wo.createdAt),
    });
  });

  // Ordenar por data
  activities.sort((a, b) => b.time.localeCompare(a.time));

  res.json({
    success: true,
    data: activities.slice(0, 10),
  });
};

/**
 * GET /api/v1/providers/pending-requests
 * Solicitações pendentes na área do fornecedor
 * Filtered by provider's servicesOffered, vehicleTypesServed, and sellsParts
 */
export const getPendingRequests = async (req: Request, res: Response) => {
  const providerId = req.user!.id;

  // Load provider profile for capability filtering
  const providerProfile = await prisma.providerProfile.findUnique({
    where: { userId: providerId },
    select: { servicesOffered: true, vehicleTypesServed: true, sellsParts: true },
  });

  const providerServices: string[] = Array.isArray(providerProfile?.servicesOffered)
    ? (providerProfile!.servicesOffered as string[]).map((s: string) => s.toUpperCase())
    : [];
  const providerVehicleTypes: string[] = Array.isArray(providerProfile?.vehicleTypesServed)
    ? (providerProfile!.vehicleTypesServed as string[]).map((s: string) => s.toUpperCase())
    : [];
  const providerSellsParts = providerProfile?.sellsParts || false;

  // Buscar IDs de solicitações já cotadas
  const myQuotes = await prisma.quote.findMany({
    where: { providerId },
    select: { serviceRequestId: true },
  });
  const quotedRequestIds = myQuotes.map((q) => q.serviceRequestId);

  // Buscar solicitações disponíveis
  const requests = await prisma.serviceRequest.findMany({
    where: {
      status: {
        in: ["SEARCHING_PROVIDERS", "QUOTES_RECEIVED"],
      },
      quotesCount: { lt: 5 },
      NOT: { id: { in: quotedRequestIds } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      vehicle: { select: { make: true, model: true, year: true } },
      user: { select: { city: true, state: true } },
    },
  });

  // Filter requests by provider capabilities
  const filteredRequests = requests.filter((r) => {
    // If provider has no services configured, show all (backward compat)
    if (providerServices.length === 0) return true;

    // 1. Filter by service type
    const rawType = (r as any).rawServiceType?.toLowerCase() || "";
    const matchingServices = RAW_TO_SERVICE_OFFERED[rawType] || ["GENERAL_REPAIR"];
    const serviceMatch = matchingServices.some((s) => providerServices.includes(s));
    if (!serviceMatch) return false;

    // 2. Filter by vehicle type (if the request specifies one)
    const requestVehicleCategory = ((r as any).vehicleCategory || "").toUpperCase();
    if (requestVehicleCategory && providerVehicleTypes.length > 0) {
      if (!providerVehicleTypes.includes(requestVehicleCategory)) return false;
    }

    // 3. Filter parts-only requests (only show to providers that sell parts)
    const requestScope = (r as any).serviceScope || "";
    if (requestScope === "parts" && !providerSellsParts) return false;

    return true;
  });

  const formatTimeAgo = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)} days`;
  };

  const pendingRequests = filteredRequests.slice(0, 10).map((r) => ({
    id: r.id,
    title:
      r.title || r.description?.substring(0, 50) || "Solicitação de Serviço",
    vehicle: r.vehicle
      ? `${r.vehicle.make} ${r.vehicle.model} ${r.vehicle.year}`
      : "N/A",
    location: r.user ? `${r.user.city || ""}, ${r.user.state || ""}` : "",
    timeAgo: formatTimeAgo(r.createdAt),
    isUrgent: r.isUrgent || false,
  }));

  res.json({
    success: true,
    data: pendingRequests,
  });
};

/**
 * POST /api/v1/providers/validate-fdacs
 * D35 — Validate FDACS MV-XXXXX license number
 */
export const validateFdacs = async (req: Request, res: Response): Promise<void> => {
  const { fdacsNumber } = req.body;

  if (!fdacsNumber) {
    res.status(400).json({ success: false, message: "FDACS number is required" });
    return;
  }

  // Validate MV-XXXXX format
  const pattern = /^MV-\d{5}$/;
  if (!pattern.test(fdacsNumber)) {
    res.json({
      success: true,
      data: {
        valid: false,
        formatted: fdacsNumber,
        reason: "Invalid format. Expected MV-XXXXX (e.g. MV-12345)",
      },
    });
    return;
  }

  // Check if this FDACS number is already registered by another provider
  const existing = await prisma.providerProfile.findFirst({
    where: {
      fdacsRegistrationNumber: fdacsNumber,
      userId: { not: req.user!.id },
    },
    select: { id: true },
  });

  if (existing) {
    res.json({
      success: true,
      data: {
        valid: false,
        formatted: fdacsNumber,
        reason: "This FDACS number is already registered by another provider",
      },
    });
    return;
  }

  // Check state compliance records
  const complianceItem = await prisma.complianceItem.findFirst({
    where: {
      providerProfile: { userId: req.user!.id },
      type: "FDACS_MOTOR_VEHICLE_REPAIR",
    },
    select: { id: true, status: true },
  });

  res.json({
    success: true,
    data: {
      valid: true,
      formatted: fdacsNumber,
      complianceStatus: complianceItem?.status || null,
      reason: null,
    },
  });
};

/**
 * PATCH /api/v1/providers/weekly-reports
 * D37 — Toggle weekly reports preference
 */
export const toggleWeeklyReports = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { enabled } = req.body;

  // Store in User.preferencesJson
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferencesJson: true },
  });

  const prefs = (user?.preferencesJson as Record<string, any>) || {};
  prefs.weeklyReportsEnabled = !!enabled;

  await prisma.user.update({
    where: { id: userId },
    data: { preferencesJson: prefs },
  });

  res.json({
    success: true,
    data: { weeklyReportsEnabled: !!enabled },
    message: enabled ? "Weekly reports enabled" : "Weekly reports disabled",
  });
};
