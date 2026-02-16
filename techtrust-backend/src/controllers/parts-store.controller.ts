/**
 * ============================================
 * AUTO PARTS STORE CONTROLLER
 * ============================================
 * Endpoints for Parts Store discovery, products,
 * reviews, favorites, and provider management
 */

import { Request, Response } from "express";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error-handler";

// ============================================
// PARTS CATEGORIES (static catalog)
// ============================================

const PARTS_CATEGORIES = [
  { id: "engine", name: "Engine Parts", icon: "cog" },
  { id: "brakes", name: "Brakes & Rotors", icon: "disc" },
  { id: "filters", name: "Filters", icon: "funnel" },
  { id: "oil_fluids", name: "Oil & Fluids", icon: "water" },
  { id: "electrical", name: "Electrical", icon: "flash" },
  { id: "suspension", name: "Suspension", icon: "navigate" },
  { id: "exhaust", name: "Exhaust System", icon: "cloud" },
  { id: "transmission", name: "Transmission", icon: "settings" },
  { id: "cooling", name: "Cooling System", icon: "thermometer" },
  { id: "body_exterior", name: "Body & Exterior", icon: "car" },
  { id: "interior", name: "Interior", icon: "home" },
  { id: "tires_wheels", name: "Tires & Wheels", icon: "ellipse" },
  { id: "battery", name: "Battery & Starting", icon: "battery-charging" },
  { id: "belts_hoses", name: "Belts & Hoses", icon: "link" },
  { id: "lighting", name: "Lighting", icon: "bulb" },
  { id: "accessories", name: "Accessories", icon: "sparkles" },
];

// ============================================
// PUBLIC / CLIENT ENDPOINTS
// ============================================

/**
 * GET /api/v1/parts-store/categories
 * List all parts categories
 */
export const getCategories = async (_req: Request, res: Response) => {
  res.json({ success: true, data: PARTS_CATEGORIES });
};

/**
 * GET /api/v1/parts-store/search
 * Search for parts stores and products
 * Query: lat, lng, radiusMiles, category, search, page, limit, sortBy
 */
export const searchStores = async (req: Request, res: Response) => {
  const {
    lat,
    lng,
    radiusMiles = "25",
    search,
    sortBy = "distance",
    page = "1",
    limit = "20",
  } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = Math.min(parseInt(limit as string), 50);
  const offset = (pageNum - 1) * limitNum;

  const where: any = { isActive: true };

  // Geo filtering
  if (lat && lng) {
    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);
    const radius = parseFloat(radiusMiles as string);
    const latDelta = radius / 69;
    const lngDelta = radius / (69 * Math.cos((latitude * Math.PI) / 180));

    where.latitude = { gte: latitude - latDelta, lte: latitude + latDelta };
    where.longitude = { gte: longitude - lngDelta, lte: longitude + lngDelta };
  }

  // Search by name
  if (search) {
    where.OR = [
      { storeName: { contains: search as string, mode: "insensitive" } },
      { description: { contains: search as string, mode: "insensitive" } },
    ];
  }

  const orderBy: any =
    sortBy === "rating"
      ? { averageRating: "desc" }
      : sortBy === "name"
        ? { storeName: "asc" }
        : { createdAt: "desc" };

  const [stores, total] = await Promise.all([
    prisma.partsStore.findMany({
      where,
      orderBy,
      skip: offset,
      take: limitNum,
      include: {
        _count: { select: { products: { where: { isActive: true } } } },
      },
    }),
    prisma.partsStore.count({ where }),
  ]);

  res.json({
    success: true,
    data: stores,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
};

/**
 * GET /api/v1/parts-store/:id
 * Get a single store profile
 */
export const getStoreProfile = async (req: Request, res: Response) => {
  const { id } = req.params;

  const store = await prisma.partsStore.findUnique({
    where: { id },
    include: {
      products: {
        where: { isActive: true },
        take: 20,
        orderBy: { createdAt: "desc" },
      },
      reviews: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true } } },
      },
      featured: {
        where: { isActive: true },
        orderBy: { position: "asc" },
      },
      _count: {
        select: {
          products: { where: { isActive: true } },
          reviews: true,
        },
      },
    },
  });

  if (!store) {
    throw new AppError("Parts store not found", 404, "STORE_NOT_FOUND");
  }

  // Track profile view
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.partsStoreMetric.upsert({
    where: { storeId_date: { storeId: id, date: today } },
    update: { profileViews: { increment: 1 } },
    create: { storeId: id, date: today, profileViews: 1 },
  });

  res.json({ success: true, data: store });
};

/**
 * GET /api/v1/parts-store/:id/products
 * List products from a store with filtering
 * Query: category, search, condition, inStock, sortBy, page, limit
 */
export const getStoreProducts = async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    category,
    search,
    condition,
    inStock,
    sortBy = "newest",
    page = "1",
    limit = "20",
  } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = Math.min(parseInt(limit as string), 50);
  const offset = (pageNum - 1) * limitNum;

  const where: any = { storeId: id, isActive: true };
  if (category) where.categoryId = category as string;
  if (condition) where.condition = condition as string;
  if (inStock === "true") where.inStock = true;
  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: "insensitive" } },
      { brand: { contains: search as string, mode: "insensitive" } },
      { partNumber: { contains: search as string, mode: "insensitive" } },
    ];
  }

  const orderBy: any =
    sortBy === "price_low"
      ? { price: "asc" }
      : sortBy === "price_high"
        ? { price: "desc" }
        : sortBy === "name"
          ? { name: "asc" }
          : { createdAt: "desc" };

  const [products, total] = await Promise.all([
    prisma.partsProduct.findMany({
      where,
      orderBy,
      skip: offset,
      take: limitNum,
    }),
    prisma.partsProduct.count({ where }),
  ]);

  res.json({
    success: true,
    data: products,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
};

/**
 * GET /api/v1/parts-store/products/:productId
 * Get product detail
 */
export const getProductDetail = async (req: Request, res: Response) => {
  const { productId } = req.params;

  const product = await prisma.partsProduct.findUnique({
    where: { id: productId },
    include: {
      store: {
        select: {
          id: true,
          storeName: true,
          phone: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          latitude: true,
          longitude: true,
          averageRating: true,
          operatingHours: true,
        },
      },
      reviews: {
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true } } },
      },
      _count: { select: { reviews: true } },
    },
  });

  if (!product) {
    throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
  }

  // Track product view
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.partsStoreMetric.upsert({
    where: { storeId_date: { storeId: product.storeId, date: today } },
    update: { productViews: { increment: 1 } },
    create: { storeId: product.storeId, date: today, productViews: 1 },
  });

  res.json({ success: true, data: product });
};

/**
 * GET /api/v1/parts-store/products/search
 * Global product search across all stores
 * Query: search, category, make, model, year, condition, sortBy, page, limit
 */
export const searchProducts = async (req: Request, res: Response) => {
  const {
    search,
    category,
    condition,
    sortBy = "relevance",
    page = "1",
    limit = "20",
  } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = Math.min(parseInt(limit as string), 50);
  const offset = (pageNum - 1) * limitNum;

  const where: any = { isActive: true, store: { isActive: true } };
  if (category) where.categoryId = category as string;
  if (condition) where.condition = condition as string;
  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: "insensitive" } },
      { brand: { contains: search as string, mode: "insensitive" } },
      { partNumber: { contains: search as string, mode: "insensitive" } },
      { description: { contains: search as string, mode: "insensitive" } },
    ];
  }

  // Vehicle compatibility filter (searches JSON field)
  // Note: For production, a dedicated compatibility table would be more efficient

  const orderBy: any =
    sortBy === "price_low"
      ? { price: "asc" }
      : sortBy === "price_high"
        ? { price: "desc" }
        : { createdAt: "desc" };

  const [products, total] = await Promise.all([
    prisma.partsProduct.findMany({
      where,
      orderBy,
      skip: offset,
      take: limitNum,
      include: {
        store: {
          select: {
            id: true,
            storeName: true,
            city: true,
            state: true,
            averageRating: true,
          },
        },
      },
    }),
    prisma.partsProduct.count({ where }),
  ]);

  res.json({
    success: true,
    data: products,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
};

/**
 * GET /api/v1/parts-store/:id/reviews
 * Get store reviews
 */
export const getStoreReviews = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { page = "1", limit = "20" } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = Math.min(parseInt(limit as string), 50);
  const offset = (pageNum - 1) * limitNum;

  const [reviews, total] = await Promise.all([
    prisma.partsStoreReview.findMany({
      where: { storeId: id },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limitNum,
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.partsStoreReview.count({ where: { storeId: id } }),
  ]);

  res.json({
    success: true,
    data: reviews,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  });
};

// ============================================
// AUTHENTICATED CLIENT ENDPOINTS
// ============================================

/**
 * GET /api/v1/parts-store/favorites
 * Get user's favorite parts stores
 */
export const getFavorites = async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  const favorites = await prisma.partsStoreFavorite.findMany({
    where: { userId },
    include: {
      store: {
        include: {
          _count: { select: { products: { where: { isActive: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({ success: true, data: favorites.map((f: any) => f.store) });
};

/**
 * POST /api/v1/parts-store/:id/favorite
 * Toggle favorite on a parts store
 */
export const toggleFavorite = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id } = req.params;

  const existing = await prisma.partsStoreFavorite.findUnique({
    where: { storeId_userId: { storeId: id, userId } },
  });

  if (existing) {
    await prisma.partsStoreFavorite.delete({
      where: { id: existing.id },
    });
    res.json({ success: true, favorited: false });
  } else {
    await prisma.partsStoreFavorite.create({
      data: { storeId: id, userId },
    });
    res.json({ success: true, favorited: true });
  }
};

/**
 * POST /api/v1/parts-store/:id/reviews
 * Create a review for a parts store
 */
export const createStoreReview = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id } = req.params;
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    throw new AppError("Rating must be between 1 and 5", 400, "INVALID_RATING");
  }

  const review = await prisma.partsStoreReview.create({
    data: { storeId: id, userId, rating, comment },
  });

  // Update store average rating
  const agg = await prisma.partsStoreReview.aggregate({
    where: { storeId: id },
    _avg: { rating: true },
    _count: true,
  });

  await prisma.partsStore.update({
    where: { id },
    data: {
      averageRating: agg._avg.rating || 0,
      totalReviews: agg._count,
    },
  });

  res.status(201).json({ success: true, data: review });
};

/**
 * POST /api/v1/parts-store/products/:productId/reserve
 * Reserve a product for pickup
 */
export const reserveProduct = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { productId } = req.params;
  const { quantity = 1, notes } = req.body;

  const product = await prisma.partsProduct.findUnique({
    where: { id: productId },
  });

  if (!product || !product.isActive) {
    throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
  }

  if (!product.inStock || product.quantity < quantity) {
    throw new AppError("Product out of stock", 400, "OUT_OF_STOCK");
  }

  // Reserve for 24 hours
  const reservedUntil = new Date();
  reservedUntil.setHours(reservedUntil.getHours() + 24);

  const reservation = await prisma.partsReservation.create({
    data: {
      productId,
      userId,
      quantity,
      notes,
      reservedUntil,
      status: "pending",
    },
  });

  // Track reservation
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.partsStoreMetric.upsert({
    where: { storeId_date: { storeId: product.storeId, date: today } },
    update: { reservationCount: { increment: 1 } },
    create: { storeId: product.storeId, date: today, reservationCount: 1 },
  });

  res.status(201).json({ success: true, data: reservation });
};

/**
 * POST /api/v1/parts-store/:id/track-action
 * Track user actions (directions, phone, etc.)
 */
export const trackAction = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { action } = req.body; // 'direction', 'phone', 'search_impression'

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const updateData: any = {};
  if (action === "direction") updateData.directionClicks = { increment: 1 };
  else if (action === "phone") updateData.phoneClicks = { increment: 1 };
  else if (action === "search_impression") updateData.searchImpressions = { increment: 1 };
  else {
    throw new AppError("Invalid action type", 400, "INVALID_ACTION");
  }

  await prisma.partsStoreMetric.upsert({
    where: { storeId_date: { storeId: id, date: today } },
    update: updateData,
    create: { storeId: id, date: today, ...Object.fromEntries(
      Object.entries(updateData).map(([k]) => [k, 1])
    ) },
  });

  res.json({ success: true });
};

// ============================================
// PROVIDER ENDPOINTS
// ============================================

/**
 * POST /api/v1/parts-store/provider/create
 * Create a new parts store (provider)
 */
export const createStore = async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  const provider = await prisma.providerProfile.findUnique({
    where: { userId },
  });

  if (!provider) {
    throw new AppError("Provider profile not found", 404, "PROVIDER_NOT_FOUND");
  }

  const store = await prisma.partsStore.create({
    data: {
      providerId: provider.id,
      ...req.body,
    },
  });

  res.status(201).json({ success: true, data: store });
};

/**
 * GET /api/v1/parts-store/provider/my-stores
 * Get provider's own parts stores
 */
export const getMyStores = async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  const provider = await prisma.providerProfile.findUnique({
    where: { userId },
  });

  if (!provider) {
    throw new AppError("Provider profile not found", 404, "PROVIDER_NOT_FOUND");
  }

  const stores = await prisma.partsStore.findMany({
    where: { providerId: provider.id },
    include: {
      _count: { select: { products: true, reviews: true } },
    },
  });

  res.json({ success: true, data: stores });
};

/**
 * PATCH /api/v1/parts-store/provider/:id
 * Update a parts store
 */
export const updateStore = async (req: Request, res: Response) => {
  const { id } = req.params;

  const store = await prisma.partsStore.update({
    where: { id },
    data: req.body,
  });

  res.json({ success: true, data: store });
};

/**
 * POST /api/v1/parts-store/provider/:id/products
 * Add a product to store (max 50 per store for MVP)
 */
export const createProduct = async (req: Request, res: Response) => {
  const { id } = req.params;

  // Check product limit
  const count = await prisma.partsProduct.count({
    where: { storeId: id, isActive: true },
  });

  if (count >= 50) {
    throw new AppError(
      "Maximum of 50 active products per store in the current plan",
      400,
      "PRODUCT_LIMIT_REACHED"
    );
  }

  const product = await prisma.partsProduct.create({
    data: { storeId: id, ...req.body },
  });

  res.status(201).json({ success: true, data: product });
};

/**
 * PATCH /api/v1/parts-store/provider/:id/products/:productId
 * Update a product
 */
export const updateProduct = async (req: Request, res: Response) => {
  const { productId } = req.params;

  const product = await prisma.partsProduct.update({
    where: { id: productId },
    data: req.body,
  });

  res.json({ success: true, data: product });
};

/**
 * DELETE /api/v1/parts-store/provider/:id/products/:productId
 * Soft-delete a product
 */
export const deleteProduct = async (req: Request, res: Response) => {
  const { productId } = req.params;

  await prisma.partsProduct.update({
    where: { id: productId },
    data: { isActive: false },
  });

  res.json({ success: true, message: "Product removed" });
};

/**
 * GET /api/v1/parts-store/provider/:id/dashboard
 * Provider dashboard with metrics
 */
export const getProviderDashboard = async (req: Request, res: Response) => {
  const { id } = req.params;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [store, metrics, recentReservations] = await Promise.all([
    prisma.partsStore.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: { where: { isActive: true } },
            reviews: true,
            reservations: true,
          },
        },
      },
    }),
    prisma.partsStoreMetric.findMany({
      where: { storeId: id, date: { gte: thirtyDaysAgo } },
      orderBy: { date: "desc" },
    }),
    prisma.partsReservation.findMany({
      where: {
        product: { storeId: id },
        createdAt: { gte: thirtyDaysAgo },
      },
      include: {
        product: { select: { name: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  // Aggregate metrics
  const totals = {
    profileViews: 0,
    directionClicks: 0,
    phoneClicks: 0,
    searchImpressions: 0,
    productViews: 0,
    reservationCount: 0,
  };

  metrics.forEach((m: any) => {
    totals.profileViews += m.profileViews;
    totals.directionClicks += m.directionClicks;
    totals.phoneClicks += m.phoneClicks;
    totals.searchImpressions += m.searchImpressions;
    totals.productViews += m.productViews;
    totals.reservationCount += m.reservationCount;
  });

  res.json({
    success: true,
    data: {
      store,
      metrics30d: totals,
      dailyMetrics: metrics,
      recentReservations,
    },
  });
};

/**
 * POST /api/v1/parts-store/provider/:id/reviews/:reviewId/respond
 * Provider responds to a review
 */
export const respondToReview = async (req: Request, res: Response) => {
  const { reviewId } = req.params;
  const { response: responseText } = req.body;

  const review = await prisma.partsStoreReview.update({
    where: { id: reviewId },
    data: { response: responseText, responseAt: new Date() },
  });

  res.json({ success: true, data: review });
};

// ============================================
// ADMIN ENDPOINTS
// ============================================

/**
 * GET /api/v1/parts-store/admin/pending
 * Get stores pending approval
 */
export const getPendingStores = async (_req: Request, res: Response) => {
  const stores = await prisma.partsStore.findMany({
    where: { isVerified: false, isActive: true },
    include: {
      provider: { select: { businessName: true, userId: true } },
      _count: { select: { products: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  res.json({ success: true, data: stores });
};

/**
 * PATCH /api/v1/parts-store/admin/:id/verify
 * Approve or reject a parts store
 */
export const verifyStore = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { verified } = req.body;

  const store = await prisma.partsStore.update({
    where: { id },
    data: { isVerified: verified, isActive: verified },
  });

  res.json({ success: true, data: store });
};
