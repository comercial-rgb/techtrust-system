/**
 * ============================================
 * CAR WASH CONTROLLER
 * ============================================
 * Endpoints for Car Wash discovery, profiles,
 * reviews, favorites, and provider management
 */

import { Request, Response } from "express";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error-handler";

// ============================================
// PUBLIC / CLIENT ENDPOINTS
// ============================================

/**
 * GET /api/v1/car-wash/nearby
 * Search car washes near a location
 * Query params: lat, lng, radiusMiles, type, minRating, openNow, sortBy, page, limit
 */
export const searchNearby = async (req: Request, res: Response) => {
  const {
    lat,
    lng,
    radiusMiles = "10",
    type,
    minRating,
    openNow,
    hasMembership,
    hasFreeVacuum,
    sortBy = "distance",
    page = "1",
    limit = "20",
    search,
  } = req.query;

  if (!lat || !lng) {
    throw new AppError("Latitude and longitude are required", 400, "MISSING_COORDS");
  }

  const latitude = parseFloat(lat as string);
  const longitude = parseFloat(lng as string);
  const radius = parseFloat(radiusMiles as string);
  const pageNum = parseInt(page as string);
  const limitNum = Math.min(parseInt(limit as string), 50);
  const offset = (pageNum - 1) * limitNum;

  // Convert miles to approximate degrees (1 degree ≈ 69 miles)
  const latDelta = radius / 69;
  const lngDelta = radius / (69 * Math.cos((latitude * Math.PI) / 180));

  // Build where conditions
  const where: any = {
    status: "ACTIVE",
    latitude: {
      gte: latitude - latDelta,
      lte: latitude + latDelta,
    },
    longitude: {
      gte: longitude - lngDelta,
      lte: longitude + lngDelta,
    },
  };

  // Filter by car wash type
  if (type) {
    const types = (type as string).split(",");
    where.carWashTypes = {
      path: "$",
      array_contains: types,
    };
  }

  // Filter by minimum rating
  if (minRating) {
    where.averageRating = { gte: parseFloat(minRating as string) };
  }

  // Filter by search text
  if (search) {
    where.OR = [
      { businessName: { contains: search as string, mode: "insensitive" } },
      { address: { contains: search as string, mode: "insensitive" } },
      { city: { contains: search as string, mode: "insensitive" } },
      { zipCode: { contains: search as string, mode: "insensitive" } },
    ];
  }

  // Get car washes
  const [carWashes, total] = await Promise.all([
    prisma.carWash.findMany({
      where,
      include: {
        photos: {
          where: { isPrimary: true },
          take: 1,
        },
        operatingHours: true,
        packages: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          take: 1, // Just cheapest for card preview
        },
        membershipPlans: {
          where: { isActive: true },
          take: 1, // Just to know if exists
        },
        amenities: {
          include: { amenity: true },
        },
        _count: {
          select: { reviews: true },
        },
      },
      skip: offset,
      take: limitNum,
      orderBy:
        sortBy === "rating"
          ? { averageRating: "desc" }
          : sortBy === "name"
            ? { businessName: "asc" }
            : { createdAt: "desc" }, // distance sorting done client-side
    }),
    prisma.carWash.count({ where }),
  ]);

  // Calculate distance for each car wash and add to response
  const results = carWashes.map((cw) => {
    const cwLat = Number(cw.latitude);
    const cwLng = Number(cw.longitude);
    const distanceMiles = calculateDistanceMiles(latitude, longitude, cwLat, cwLng);

    // Check if open now
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const todayHours = cw.operatingHours.find((h) => h.dayOfWeek === dayOfWeek);
    let isOpenNow = false;
    let opensAt: string | null = null;
    let closesAt: string | null = null;

    if (todayHours) {
      if (todayHours.is24Hours) {
        isOpenNow = true;
      } else if (!todayHours.isClosed && todayHours.openTime && todayHours.closeTime) {
        isOpenNow = currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime;
        closesAt = todayHours.closeTime;
        opensAt = todayHours.openTime;
      }
    }

    // Check free vacuum amenity
    const hasFreeVac = cw.amenities.some((a) => a.amenity.key === "free_vacuum");

    // Price range from packages
    const minPkg = cw.packages[0];
    const priceFrom = minPkg ? Number(minPkg.priceBase) : null;

    return {
      id: cw.id,
      businessName: cw.businessName,
      carWashTypes: cw.carWashTypes,
      logoUrl: cw.logoUrl,
      primaryPhoto: cw.photos[0]?.imageUrl || null,
      address: cw.address,
      city: cw.city,
      state: cw.state,
      zipCode: cw.zipCode,
      latitude: cwLat,
      longitude: cwLng,
      distanceMiles: Math.round(distanceMiles * 10) / 10,
      estimatedDriveMinutes: Math.round(distanceMiles * 2), // rough estimate ~30mph avg
      averageRating: Number(cw.averageRating),
      totalReviews: cw._count.reviews,
      isOpenNow,
      opensAt,
      closesAt,
      priceFrom,
      hasMembershipPlans: cw.membershipPlans.length > 0,
      hasFreeVacuum: hasFreeVac,
      isFeatured: cw.isFeatured,
      isPromoted: cw.isPromoted,
      isEcoFriendly: cw.isEcoFriendly,
    };
  });

  // Sort by distance if requested (default)
  if (sortBy === "distance") {
    results.sort((a, b) => a.distanceMiles - b.distanceMiles);
  } else if (sortBy === "price") {
    results.sort((a, b) => (a.priceFrom || 999) - (b.priceFrom || 999));
  }

  // Apply client-side filters that can't be done in Prisma easily
  let filtered = results;
  if (openNow === "true") {
    filtered = filtered.filter((r) => r.isOpenNow);
  }
  if (hasMembership === "true") {
    filtered = filtered.filter((r) => r.hasMembershipPlans);
  }
  if (hasFreeVacuum === "true") {
    filtered = filtered.filter((r) => r.hasFreeVacuum);
  }

  // Featured/promoted first
  filtered.sort((a, b) => {
    if (a.isPromoted && !b.isPromoted) return -1;
    if (!a.isPromoted && b.isPromoted) return 1;
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;
    return 0;
  });

  res.json({
    success: true,
    data: {
      carWashes: filtered,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    },
  });
};

/**
 * GET /api/v1/car-wash/:id
 * Get full car wash profile
 */
export const getProfile = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  const carWash = await prisma.carWash.findUnique({
    where: { id },
    include: {
      photos: { orderBy: { sortOrder: "asc" } },
      operatingHours: { orderBy: { dayOfWeek: "asc" } },
      holidayHours: { orderBy: { date: "asc" } },
      packages: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          services: {
            include: { service: true },
          },
        },
      },
      membershipPlans: {
        where: { isActive: true },
        orderBy: { monthlyPrice: "asc" },
      },
      addOnServices: {
        where: { isActive: true },
        orderBy: { price: "asc" },
      },
      amenities: {
        include: { amenity: true },
      },
      paymentMethods: {
        include: { paymentMethod: true },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          user: {
            select: { id: true, fullName: true, avatarUrl: true },
          },
        },
      },
      _count: {
        select: { reviews: true },
      },
    },
  });

  if (!carWash) {
    throw new AppError("Car wash not found", 404, "CAR_WASH_NOT_FOUND");
  }

  // Check if user has favorited
  let isFavorited = false;
  if (userId) {
    const fav = await prisma.carWashFavorite.findUnique({
      where: { carWashId_userId: { carWashId: id, userId } },
    });
    isFavorited = !!fav;
  }

  // Calculate current open status
  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const todayHours = carWash.operatingHours.find((h) => h.dayOfWeek === dayOfWeek);
  let isOpenNow = false;
  let closesAt: string | null = null;

  if (todayHours) {
    if (todayHours.is24Hours) {
      isOpenNow = true;
    } else if (!todayHours.isClosed && todayHours.openTime && todayHours.closeTime) {
      isOpenNow = currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime;
      closesAt = todayHours.closeTime;
    }
  }

  // Rating distribution
  const ratingDistribution = await prisma.carWashReview.groupBy({
    by: ["rating"],
    where: { carWashId: id },
    _count: { rating: true },
  });

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratingDistribution.forEach((r) => {
    distribution[r.rating] = r._count.rating;
  });

  // Track profile view metric
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.carWashMetric.upsert({
    where: { carWashId_date: { carWashId: id, date: today } },
    update: { profileViews: { increment: 1 } },
    create: { carWashId: id, date: today, profileViews: 1 },
  });

  res.json({
    success: true,
    data: {
      ...carWash,
      isOpenNow,
      closesAt,
      isFavorited,
      ratingDistribution: distribution,
      totalReviews: carWash._count.reviews,
    },
  });
};

/**
 * GET /api/v1/car-wash/:id/reviews
 * Get paginated reviews for a car wash
 */
export const getReviews = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { page = "1", limit = "10", sortBy = "recent" } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = Math.min(parseInt(limit as string), 50);
  const offset = (pageNum - 1) * limitNum;

  const orderBy: any =
    sortBy === "highest"
      ? { rating: "desc" as const }
      : sortBy === "lowest"
        ? { rating: "asc" as const }
        : { createdAt: "desc" as const };

  const [reviews, total] = await Promise.all([
    prisma.carWashReview.findMany({
      where: { carWashId: id },
      orderBy,
      skip: offset,
      take: limitNum,
      include: {
        user: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
      },
    }),
    prisma.carWashReview.count({ where: { carWashId: id } }),
  ]);

  res.json({
    success: true,
    data: {
      reviews,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    },
  });
};

/**
 * POST /api/v1/car-wash/:id/reviews
 * Create a review for a car wash
 */
export const createReview = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    throw new AppError("Rating must be between 1 and 5", 400, "INVALID_RATING");
  }

  // Check car wash exists
  const carWash = await prisma.carWash.findUnique({ where: { id } });
  if (!carWash) {
    throw new AppError("Car wash not found", 404, "CAR_WASH_NOT_FOUND");
  }

  // Check if user already reviewed
  const existing = await prisma.carWashReview.findFirst({
    where: { carWashId: id, userId },
  });
  if (existing) {
    throw new AppError("You have already reviewed this car wash", 409, "ALREADY_REVIEWED");
  }

  const review = await prisma.carWashReview.create({
    data: {
      carWashId: id,
      userId,
      rating: Math.round(rating),
      comment: comment || null,
    },
    include: {
      user: { select: { id: true, fullName: true, avatarUrl: true } },
    },
  });

  // Update denormalized rating
  const stats = await prisma.carWashReview.aggregate({
    where: { carWashId: id },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.carWash.update({
    where: { id },
    data: {
      averageRating: stats._avg.rating || 0,
      totalReviews: stats._count.rating,
    },
  });

  res.status(201).json({
    success: true,
    data: review,
  });
};

/**
 * POST /api/v1/car-wash/:id/favorite
 * Toggle favorite status
 */
export const toggleFavorite = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  const carWash = await prisma.carWash.findUnique({ where: { id } });
  if (!carWash) {
    throw new AppError("Car wash not found", 404, "CAR_WASH_NOT_FOUND");
  }

  const existing = await prisma.carWashFavorite.findUnique({
    where: { carWashId_userId: { carWashId: id, userId } },
  });

  if (existing) {
    await prisma.carWashFavorite.delete({
      where: { id: existing.id },
    });
    res.json({ success: true, data: { isFavorited: false } });
  } else {
    await prisma.carWashFavorite.create({
      data: { carWashId: id, userId },
    });
    res.json({ success: true, data: { isFavorited: true } });
  }
};

/**
 * GET /api/v1/car-wash/favorites
 * Get user's favorite car washes
 */
export const getFavorites = async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const favorites = await prisma.carWashFavorite.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      carWash: {
        include: {
          photos: { where: { isPrimary: true }, take: 1 },
          operatingHours: true,
          packages: { where: { isActive: true }, orderBy: { priceBase: "asc" }, take: 1 },
          _count: { select: { reviews: true } },
        },
      },
    },
  });

  const results = favorites.map((fav) => {
    const cw = fav.carWash;
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const todayHours = cw.operatingHours.find((h) => h.dayOfWeek === dayOfWeek);
    let isOpenNow = false;

    if (todayHours) {
      if (todayHours.is24Hours) isOpenNow = true;
      else if (!todayHours.isClosed && todayHours.openTime && todayHours.closeTime) {
        isOpenNow = currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime;
      }
    }

    return {
      id: cw.id,
      businessName: cw.businessName,
      carWashTypes: cw.carWashTypes,
      logoUrl: cw.logoUrl,
      primaryPhoto: cw.photos[0]?.imageUrl || null,
      city: cw.city,
      state: cw.state,
      averageRating: Number(cw.averageRating),
      totalReviews: cw._count.reviews,
      isOpenNow,
      priceFrom: cw.packages[0] ? Number(cw.packages[0].priceBase) : null,
      favoritedAt: fav.createdAt,
    };
  });

  res.json({ success: true, data: results });
};

/**
 * POST /api/v1/car-wash/:id/track-action
 * Track user actions (direction click, phone click, website click)
 */
export const trackAction = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { action } = req.body;

  const validActions = ["direction", "phone", "website"];
  if (!validActions.includes(action)) {
    throw new AppError("Invalid action type", 400, "INVALID_ACTION");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const updateField =
    action === "direction"
      ? { directionClicks: { increment: 1 } }
      : action === "phone"
        ? { phoneClicks: { increment: 1 } }
        : { websiteClicks: { increment: 1 } };

  await prisma.carWashMetric.upsert({
    where: { carWashId_date: { carWashId: id, date: today } },
    update: updateField,
    create: {
      carWashId: id,
      date: today,
      ...Object.fromEntries(
        Object.entries(updateField).map(([k]) => [k, 1]),
      ),
    },
  });

  res.json({ success: true });
};

// ============================================
// CATALOG ENDPOINTS (PUBLIC)
// ============================================

/**
 * GET /api/v1/car-wash/catalog/services
 * Get all pre-defined car wash services
 */
export const getServiceCatalog = async (_req: Request, res: Response) => {
  const services = await prisma.carWashServiceCatalog.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });

  // Group by category
  const grouped: Record<string, typeof services> = {};
  services.forEach((s) => {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  });

  res.json({ success: true, data: { services, grouped } });
};

/**
 * GET /api/v1/car-wash/catalog/amenities
 * Get all pre-defined amenities
 */
export const getAmenityCatalog = async (_req: Request, res: Response) => {
  const amenities = await prisma.carWashAmenityCatalog.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  res.json({ success: true, data: amenities });
};

/**
 * GET /api/v1/car-wash/catalog/payment-methods
 * Get all pre-defined payment methods
 */
export const getPaymentMethodCatalog = async (_req: Request, res: Response) => {
  const methods = await prisma.carWashPaymentMethodCatalog.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  res.json({ success: true, data: methods });
};

// ============================================
// PROVIDER ENDPOINTS
// ============================================

/**
 * POST /api/v1/car-wash/provider/create
 * Create a new car wash listing
 */
export const createCarWash = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const {
    businessName,
    description,
    logoUrl,
    websiteUrl,
    phoneNumber,
    email,
    carWashTypes,
    address,
    addressLine2,
    city,
    state,
    zipCode,
    latitude,
    longitude,
    accessInstructions,
    numberOfTunnels,
    numberOfBays,
    maxVehicleHeight,
    acceptsLargeVehicles,
    equipmentType,
    yearEstablished,
    isEcoFriendly,
    operatingHours,
    packages,
    membershipPlans,
    addOnServices,
    amenityIds,
    paymentMethodIds,
  } = req.body;

  if (!businessName || !address || !city || !state || !zipCode || latitude === undefined || longitude === undefined) {
    throw new AppError("Missing required fields", 400, "MISSING_FIELDS");
  }

  // Create car wash with related data in a transaction
  const carWash = await prisma.$transaction(async (tx) => {
    // Create the car wash
    const cw = await tx.carWash.create({
      data: {
        providerId,
        businessName,
        description,
        logoUrl,
        websiteUrl,
        phoneNumber,
        email,
        carWashTypes: carWashTypes || [],
        address,
        addressLine2,
        city,
        state,
        zipCode,
        latitude,
        longitude,
        accessInstructions,
        numberOfTunnels: numberOfTunnels || 0,
        numberOfBays: numberOfBays || 0,
        maxVehicleHeight,
        acceptsLargeVehicles: acceptsLargeVehicles !== false,
        equipmentType,
        yearEstablished,
        isEcoFriendly: isEcoFriendly || false,
        status: "PENDING_APPROVAL",
      },
    });

    // Operating hours
    if (operatingHours && Array.isArray(operatingHours)) {
      await tx.carWashOperatingHours.createMany({
        data: operatingHours.map((h: any) => ({
          carWashId: cw.id,
          dayOfWeek: h.dayOfWeek,
          openTime: h.openTime || null,
          closeTime: h.closeTime || null,
          isClosed: h.isClosed || false,
          is24Hours: h.is24Hours || false,
        })),
      });
    }

    // Packages
    if (packages && Array.isArray(packages)) {
      for (let i = 0; i < packages.length; i++) {
        const pkg = packages[i];
        const createdPkg = await tx.carWashPackage.create({
          data: {
            carWashId: cw.id,
            name: pkg.name,
            priceBase: pkg.priceBase,
            priceSUV: pkg.priceSUV || null,
            isMostPopular: pkg.isMostPopular || false,
            sortOrder: i,
            isActive: true,
          },
        });

        // Package services
        if (pkg.serviceIds && Array.isArray(pkg.serviceIds)) {
          await tx.carWashPackageService.createMany({
            data: pkg.serviceIds.map((serviceId: string) => ({
              packageId: createdPkg.id,
              serviceId,
            })),
          });
        }
      }
    }

    // Membership plans
    if (membershipPlans && Array.isArray(membershipPlans)) {
      await tx.carWashMembershipPlan.createMany({
        data: membershipPlans.map((mp: any) => ({
          carWashId: cw.id,
          name: mp.name,
          monthlyPrice: mp.monthlyPrice,
          packageLevel: mp.packageLevel,
          multiLocation: mp.multiLocation || false,
          description: mp.description || null,
        })),
      });
    }

    // Add-on services
    if (addOnServices && Array.isArray(addOnServices)) {
      await tx.carWashAddOn.createMany({
        data: addOnServices.map((ao: any) => ({
          carWashId: cw.id,
          name: ao.name,
          description: ao.description || null,
          price: ao.price,
        })),
      });
    }

    // Amenities
    if (amenityIds && Array.isArray(amenityIds)) {
      await tx.carWashAmenity.createMany({
        data: amenityIds.map((amenityId: string) => ({
          carWashId: cw.id,
          amenityId,
        })),
      });
    }

    // Payment methods
    if (paymentMethodIds && Array.isArray(paymentMethodIds)) {
      await tx.carWashPaymentMethod.createMany({
        data: paymentMethodIds.map((paymentMethodId: string) => ({
          carWashId: cw.id,
          paymentMethodId,
        })),
      });
    }

    // Update provider profile business type
    await tx.providerProfile.updateMany({
      where: { userId: providerId },
      data: { businessTypeCat: "CAR_WASH" },
    });

    return cw;
  });

  const fullCarWash = await prisma.carWash.findUnique({
    where: { id: carWash.id },
    include: {
      photos: true,
      operatingHours: true,
      packages: { include: { services: { include: { service: true } } } },
      membershipPlans: true,
      addOnServices: true,
      amenities: { include: { amenity: true } },
      paymentMethods: { include: { paymentMethod: true } },
    },
  });

  res.status(201).json({ success: true, data: fullCarWash });
};

/**
 * PATCH /api/v1/car-wash/provider/:id
 * Update car wash details
 */
export const updateCarWash = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const { id } = req.params;

  // Verify ownership
  const carWash = await prisma.carWash.findFirst({
    where: { id, providerId },
  });
  if (!carWash) {
    throw new AppError("Car wash not found or not owned by you", 404, "NOT_FOUND");
  }

  const {
    businessName,
    description,
    logoUrl,
    websiteUrl,
    phoneNumber,
    email,
    carWashTypes,
    address,
    addressLine2,
    city,
    state,
    zipCode,
    latitude,
    longitude,
    accessInstructions,
    numberOfTunnels,
    numberOfBays,
    maxVehicleHeight,
    acceptsLargeVehicles,
    equipmentType,
    yearEstablished,
    isEcoFriendly,
    operatingHours,
    amenityIds,
    paymentMethodIds,
  } = req.body;

  await prisma.$transaction(async (tx) => {
    // Update main record
    await tx.carWash.update({
      where: { id },
      data: {
        ...(businessName !== undefined && { businessName }),
        ...(description !== undefined && { description }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(websiteUrl !== undefined && { websiteUrl }),
        ...(phoneNumber !== undefined && { phoneNumber }),
        ...(email !== undefined && { email }),
        ...(carWashTypes !== undefined && { carWashTypes }),
        ...(address !== undefined && { address }),
        ...(addressLine2 !== undefined && { addressLine2 }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(zipCode !== undefined && { zipCode }),
        ...(latitude !== undefined && { latitude }),
        ...(longitude !== undefined && { longitude }),
        ...(accessInstructions !== undefined && { accessInstructions }),
        ...(numberOfTunnels !== undefined && { numberOfTunnels }),
        ...(numberOfBays !== undefined && { numberOfBays }),
        ...(maxVehicleHeight !== undefined && { maxVehicleHeight }),
        ...(acceptsLargeVehicles !== undefined && { acceptsLargeVehicles }),
        ...(equipmentType !== undefined && { equipmentType }),
        ...(yearEstablished !== undefined && { yearEstablished }),
        ...(isEcoFriendly !== undefined && { isEcoFriendly }),
      },
    });

    // Update operating hours
    if (operatingHours && Array.isArray(operatingHours)) {
      await tx.carWashOperatingHours.deleteMany({ where: { carWashId: id } });
      await tx.carWashOperatingHours.createMany({
        data: operatingHours.map((h: any) => ({
          carWashId: id,
          dayOfWeek: h.dayOfWeek,
          openTime: h.openTime || null,
          closeTime: h.closeTime || null,
          isClosed: h.isClosed || false,
          is24Hours: h.is24Hours || false,
        })),
      });
    }

    // Update amenities
    if (amenityIds && Array.isArray(amenityIds)) {
      await tx.carWashAmenity.deleteMany({ where: { carWashId: id } });
      await tx.carWashAmenity.createMany({
        data: amenityIds.map((amenityId: string) => ({
          carWashId: id,
          amenityId,
        })),
      });
    }

    // Update payment methods
    if (paymentMethodIds && Array.isArray(paymentMethodIds)) {
      await tx.carWashPaymentMethod.deleteMany({ where: { carWashId: id } });
      await tx.carWashPaymentMethod.createMany({
        data: paymentMethodIds.map((paymentMethodId: string) => ({
          carWashId: id,
          paymentMethodId,
        })),
      });
    }
  });

  const updated = await prisma.carWash.findUnique({
    where: { id },
    include: {
      photos: true,
      operatingHours: { orderBy: { dayOfWeek: "asc" } },
      packages: { include: { services: { include: { service: true } } } },
      membershipPlans: true,
      addOnServices: true,
      amenities: { include: { amenity: true } },
      paymentMethods: { include: { paymentMethod: true } },
    },
  });

  res.json({ success: true, data: updated });
};

/**
 * GET /api/v1/car-wash/provider/my-car-washes
 * Get all car washes owned by the provider
 */
export const getMyCarWashes = async (req: Request, res: Response) => {
  const providerId = req.user!.id;

  const carWashes = await prisma.carWash.findMany({
    where: { providerId },
    include: {
      photos: { where: { isPrimary: true }, take: 1 },
      operatingHours: true,
      packages: { where: { isActive: true } },
      _count: { select: { reviews: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({ success: true, data: carWashes });
};

/**
 * GET /api/v1/car-wash/provider/:id/dashboard
 * Car wash provider dashboard with metrics
 */
export const getProviderDashboard = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const { id } = req.params;

  const carWash = await prisma.carWash.findFirst({
    where: { id, providerId },
  });
  if (!carWash) {
    throw new AppError("Car wash not found", 404, "NOT_FOUND");
  }

  // Metrics for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const [metrics, recentReviews, totalReviews] = await Promise.all([
    prisma.carWashMetric.findMany({
      where: {
        carWashId: id,
        date: { gte: thirtyDaysAgo },
      },
      orderBy: { date: "asc" },
    }),
    prisma.carWashReview.findMany({
      where: { carWashId: id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        user: { select: { fullName: true, avatarUrl: true } },
      },
    }),
    prisma.carWashReview.count({ where: { carWashId: id } }),
  ]);

  // Aggregate metrics
  const totals = metrics.reduce(
    (acc, m) => ({
      profileViews: acc.profileViews + m.profileViews,
      directionClicks: acc.directionClicks + m.directionClicks,
      phoneClicks: acc.phoneClicks + m.phoneClicks,
      websiteClicks: acc.websiteClicks + m.websiteClicks,
      searchImpressions: acc.searchImpressions + m.searchImpressions,
    }),
    { profileViews: 0, directionClicks: 0, phoneClicks: 0, websiteClicks: 0, searchImpressions: 0 },
  );

  res.json({
    success: true,
    data: {
      carWash,
      metrics: {
        last30Days: totals,
        daily: metrics,
      },
      recentReviews,
      totalReviews,
    },
  });
};

/**
 * POST /api/v1/car-wash/provider/:id/reviews/:reviewId/respond
 * Provider responds to a review
 */
export const respondToReview = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const { id, reviewId } = req.params;
  const { response } = req.body;

  const carWash = await prisma.carWash.findFirst({ where: { id, providerId } });
  if (!carWash) {
    throw new AppError("Car wash not found", 404, "NOT_FOUND");
  }

  const review = await prisma.carWashReview.findFirst({
    where: { id: reviewId, carWashId: id },
  });
  if (!review) {
    throw new AppError("Review not found", 404, "REVIEW_NOT_FOUND");
  }

  const updated = await prisma.carWashReview.update({
    where: { id: reviewId },
    data: {
      response,
      responseAt: new Date(),
    },
  });

  res.json({ success: true, data: updated });
};

// ============================================
// PACKAGE MANAGEMENT (PROVIDER)
// ============================================

/**
 * POST /api/v1/car-wash/provider/:id/packages
 * Create a wash package
 */
export const createPackage = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const { id } = req.params;
  const { name, priceBase, priceSUV, isMostPopular, serviceIds } = req.body;

  const carWash = await prisma.carWash.findFirst({ where: { id, providerId } });
  if (!carWash) throw new AppError("Car wash not found", 404, "NOT_FOUND");

  const maxOrder = await prisma.carWashPackage.aggregate({
    where: { carWashId: id },
    _max: { sortOrder: true },
  });

  const pkg = await prisma.$transaction(async (tx) => {
    const created = await tx.carWashPackage.create({
      data: {
        carWashId: id,
        name,
        priceBase,
        priceSUV: priceSUV || null,
        isMostPopular: isMostPopular || false,
        sortOrder: (maxOrder._max.sortOrder || 0) + 1,
      },
    });

    if (serviceIds && Array.isArray(serviceIds)) {
      await tx.carWashPackageService.createMany({
        data: serviceIds.map((serviceId: string) => ({
          packageId: created.id,
          serviceId,
        })),
      });
    }

    return created;
  });

  const full = await prisma.carWashPackage.findUnique({
    where: { id: pkg.id },
    include: { services: { include: { service: true } } },
  });

  res.status(201).json({ success: true, data: full });
};

/**
 * PATCH /api/v1/car-wash/provider/:id/packages/:packageId
 * Update a wash package
 */
export const updatePackage = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const { id, packageId } = req.params;
  const { name, priceBase, priceSUV, isMostPopular, isActive, serviceIds } = req.body;

  const carWash = await prisma.carWash.findFirst({ where: { id, providerId } });
  if (!carWash) throw new AppError("Car wash not found", 404, "NOT_FOUND");

  await prisma.$transaction(async (tx) => {
    await tx.carWashPackage.update({
      where: { id: packageId },
      data: {
        ...(name !== undefined && { name }),
        ...(priceBase !== undefined && { priceBase }),
        ...(priceSUV !== undefined && { priceSUV }),
        ...(isMostPopular !== undefined && { isMostPopular }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    if (serviceIds && Array.isArray(serviceIds)) {
      await tx.carWashPackageService.deleteMany({ where: { packageId } });
      await tx.carWashPackageService.createMany({
        data: serviceIds.map((serviceId: string) => ({
          packageId,
          serviceId,
        })),
      });
    }
  });

  const updated = await prisma.carWashPackage.findUnique({
    where: { id: packageId },
    include: { services: { include: { service: true } } },
  });

  res.json({ success: true, data: updated });
};

/**
 * DELETE /api/v1/car-wash/provider/:id/packages/:packageId
 * Delete a wash package
 */
export const deletePackage = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const { id, packageId } = req.params;

  const carWash = await prisma.carWash.findFirst({ where: { id, providerId } });
  if (!carWash) throw new AppError("Car wash not found", 404, "NOT_FOUND");

  await prisma.carWashPackage.delete({ where: { id: packageId } });

  res.json({ success: true, message: "Package deleted" });
};

// ============================================
// ADD-ON MANAGEMENT (PROVIDER)
// ============================================

/**
 * POST /api/v1/car-wash/provider/:id/add-ons
 */
export const createAddOn = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const { id } = req.params;
  const { name, description, price } = req.body;

  const carWash = await prisma.carWash.findFirst({ where: { id, providerId } });
  if (!carWash) throw new AppError("Car wash not found", 404, "NOT_FOUND");

  const addOn = await prisma.carWashAddOn.create({
    data: { carWashId: id, name, description, price },
  });

  res.status(201).json({ success: true, data: addOn });
};

/**
 * PATCH /api/v1/car-wash/provider/:id/add-ons/:addOnId
 */
export const updateAddOn = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const { id, addOnId } = req.params;
  const { name, description, price, isActive } = req.body;

  const carWash = await prisma.carWash.findFirst({ where: { id, providerId } });
  if (!carWash) throw new AppError("Car wash not found", 404, "NOT_FOUND");

  const updated = await prisma.carWashAddOn.update({
    where: { id: addOnId },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(price !== undefined && { price }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  res.json({ success: true, data: updated });
};

/**
 * DELETE /api/v1/car-wash/provider/:id/add-ons/:addOnId
 */
export const deleteAddOn = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const { id, addOnId } = req.params;

  const carWash = await prisma.carWash.findFirst({ where: { id, providerId } });
  if (!carWash) throw new AppError("Car wash not found", 404, "NOT_FOUND");

  await prisma.carWashAddOn.delete({ where: { id: addOnId } });
  res.json({ success: true, message: "Add-on deleted" });
};

// ============================================
// MEMBERSHIP MANAGEMENT (PROVIDER)
// ============================================

/**
 * POST /api/v1/car-wash/provider/:id/memberships
 */
export const createMembership = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const { id } = req.params;
  const { name, monthlyPrice, packageLevel, multiLocation, description } = req.body;

  const carWash = await prisma.carWash.findFirst({ where: { id, providerId } });
  if (!carWash) throw new AppError("Car wash not found", 404, "NOT_FOUND");

  const plan = await prisma.carWashMembershipPlan.create({
    data: { carWashId: id, name, monthlyPrice, packageLevel, multiLocation: multiLocation || false, description },
  });

  res.status(201).json({ success: true, data: plan });
};

/**
 * PATCH /api/v1/car-wash/provider/:id/memberships/:membershipId
 */
export const updateMembership = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const { id, membershipId } = req.params;
  const { name, monthlyPrice, packageLevel, multiLocation, description, isActive } = req.body;

  const carWash = await prisma.carWash.findFirst({ where: { id, providerId } });
  if (!carWash) throw new AppError("Car wash not found", 404, "NOT_FOUND");

  const updated = await prisma.carWashMembershipPlan.update({
    where: { id: membershipId },
    data: {
      ...(name !== undefined && { name }),
      ...(monthlyPrice !== undefined && { monthlyPrice }),
      ...(packageLevel !== undefined && { packageLevel }),
      ...(multiLocation !== undefined && { multiLocation }),
      ...(description !== undefined && { description }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  res.json({ success: true, data: updated });
};

/**
 * DELETE /api/v1/car-wash/provider/:id/memberships/:membershipId
 */
export const deleteMembership = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const { id, membershipId } = req.params;

  const carWash = await prisma.carWash.findFirst({ where: { id, providerId } });
  if (!carWash) throw new AppError("Car wash not found", 404, "NOT_FOUND");

  await prisma.carWashMembershipPlan.delete({ where: { id: membershipId } });
  res.json({ success: true, message: "Membership plan deleted" });
};

// ============================================
// PHOTO MANAGEMENT (PROVIDER)
// ============================================

/**
 * POST /api/v1/car-wash/provider/:id/photos
 */
export const addPhoto = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const { id } = req.params;
  const { imageUrl, caption, isPrimary } = req.body;

  const carWash = await prisma.carWash.findFirst({ where: { id, providerId } });
  if (!carWash) throw new AppError("Car wash not found", 404, "NOT_FOUND");

  // If setting as primary, unset others
  if (isPrimary) {
    await prisma.carWashPhoto.updateMany({
      where: { carWashId: id },
      data: { isPrimary: false },
    });
  }

  const maxOrder = await prisma.carWashPhoto.aggregate({
    where: { carWashId: id },
    _max: { sortOrder: true },
  });

  const photo = await prisma.carWashPhoto.create({
    data: {
      carWashId: id,
      imageUrl,
      caption,
      isPrimary: isPrimary || false,
      sortOrder: (maxOrder._max.sortOrder || 0) + 1,
    },
  });

  res.status(201).json({ success: true, data: photo });
};

/**
 * DELETE /api/v1/car-wash/provider/:id/photos/:photoId
 */
export const deletePhoto = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const { id, photoId } = req.params;

  const carWash = await prisma.carWash.findFirst({ where: { id, providerId } });
  if (!carWash) throw new AppError("Car wash not found", 404, "NOT_FOUND");

  await prisma.carWashPhoto.delete({ where: { id: photoId } });
  res.json({ success: true, message: "Photo deleted" });
};

// ============================================
// ADMIN ENDPOINTS
// ============================================

/**
 * PATCH /api/v1/car-wash/admin/:id/status
 * Approve or reject a car wash listing
 */
export const updateStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["ACTIVE", "INACTIVE", "PENDING_APPROVAL"].includes(status)) {
    throw new AppError("Invalid status", 400, "INVALID_STATUS");
  }

  const carWash = await prisma.carWash.update({
    where: { id },
    data: { status },
  });

  res.json({ success: true, data: carWash });
};

/**
 * GET /api/v1/car-wash/admin/pending
 * Get all car washes pending approval
 */
export const getPendingApprovals = async (_req: Request, res: Response) => {
  const pending = await prisma.carWash.findMany({
    where: { status: "PENDING_APPROVAL" },
    include: {
      provider: { select: { fullName: true, email: true, phone: true } },
      photos: { take: 1 },
    },
    orderBy: { createdAt: "asc" },
  });

  res.json({ success: true, data: pending });
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
