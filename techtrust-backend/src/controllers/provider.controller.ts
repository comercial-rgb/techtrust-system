/**
 * ============================================
 * PROVIDER CONTROLLER
 * ============================================
 * Features específicas para fornecedores
 */

import { Request, Response } from "express";
import { prisma } from "../config/database";
import { geocodeAddress, formatAddress } from "../services/geocoding.service";
import { findProvidersWithinRadius } from "../utils/distance";

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
        averageRating: profile?.averageRating || 0,
        totalReviews: profile?.totalReviews || 0,
        pendingPayments: pendingPayments._sum.providerAmount || 0,
        totalRevenue: totalRevenue._sum?.providerAmount || 0,
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

  const skip = (Number(page) - 1) * Number(limit);

  const [requests, total] = await Promise.all([
    prisma.serviceRequest.findMany({
      where,
      skip,
      take: Number(limit),
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
    }),
    prisma.serviceRequest.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      requests,
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
    fdacsRegistrationNumber,
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
      console.log(
        `Geocoding bem-sucedido: ${fullAddress} -> (${baseLatitude}, ${baseLongitude})`,
      );
    } else {
      console.warn(`Geocoding falhou para: ${fullAddress}`);
    }
  }

  const profile = await prisma.providerProfile.upsert({
    where: { userId: providerId },
    create: {
      userId: providerId,
      businessName: businessName || "My Business",
      businessPhone,
      businessEmail,
      address,
      city,
      state,
      zipCode,
      serviceRadiusKm: serviceRadiusKm || 50,
      baseLatitude,
      baseLongitude,
      mobileService: mobileService || false,
      roadsideAssistance: roadsideAssistance || false,
      freeKm: freeKm || 0,
      extraFeePerKm: extraFeePerKm || 0,
      specialties: specialties || [],
      businessHours: businessHours || {},
      fdacsRegistrationNumber: fdacsRegistrationNumber || null,
      isVerified: false,
      averageRating: 0,
      totalReviews: 0,
      totalServicesCompleted: 0,
    },
    update: {
      ...(businessName && { businessName }),
      ...(businessPhone && { businessPhone }),
      ...(businessEmail && { businessEmail }),
      ...(address !== undefined && { address }),
      ...(city !== undefined && { city }),
      ...(state !== undefined && { state }),
      ...(zipCode !== undefined && { zipCode }),
      ...(serviceRadiusKm && { serviceRadiusKm: Number(serviceRadiusKm) }),
      ...(baseLatitude !== undefined && { baseLatitude }),
      ...(baseLongitude !== undefined && { baseLongitude }),
      ...(mobileService !== undefined && { mobileService }),
      ...(roadsideAssistance !== undefined && { roadsideAssistance }),
      ...(freeKm !== undefined && { freeKm: Number(freeKm) }),
      ...(extraFeePerKm !== undefined && {
        extraFeePerKm: Number(extraFeePerKm),
      }),
      ...(specialties && { specialties }),
      ...(businessHours && { businessHours }),
      ...(fdacsRegistrationNumber !== undefined && {
        fdacsRegistrationNumber: fdacsRegistrationNumber || null,
      }),
    },
  });

  res.json({
    success: true,
    message: "Perfil atualizado com sucesso",
    data: profile,
  });
};

/**
 * GET /api/v1/providers/search
 * Buscar providers por localização e raio
 * Query params: lat, lng, radius (km), serviceType
 */
export const searchProvidersByLocation = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { lat, lng, radius = 50, serviceType } = req.query;

  if (!lat || !lng) {
    res.status(400).json({
      success: false,
      message: "Latitude e longitude são obrigatórios",
    });
    return;
  }

  const latitude = parseFloat(lat as string);
  const longitude = parseFloat(lng as string);
  const radiusKm = parseFloat(radius as string);

  // Buscar todos os providers ativos com coordenadas
  const providers = await prisma.providerProfile.findMany({
    where: {
      baseLatitude: { not: null },
      baseLongitude: { not: null },
      isVerified: true,
      user: {
        status: "ACTIVE",
      },
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
  });

  // Filter by serviceType if provided (match against servicesOffered JSON array)
  const filteredByService = serviceType
    ? providers.filter((p) => {
        try {
          const services = Array.isArray(p.servicesOffered)
            ? p.servicesOffered
            : JSON.parse(String(p.servicesOffered || "[]"));
          return services.some(
            (s: string) =>
              s.toUpperCase() === String(serviceType).toUpperCase(),
          );
        } catch {
          return false;
        }
      })
    : providers;

  // Transformar para formato esperado pela função
  const mappedProviders = filteredByService.map((p) => ({
    ...p,
    baseLocation: {
      latitude: Number(p.baseLatitude),
      longitude: Number(p.baseLongitude),
    },
    freeKm: Number(p.freeKm),
    feePerKm: Number(p.extraFeePerKm),
  }));

  // Filtrar e ordenar por distância
  const serviceLocation = { latitude, longitude };
  const providersWithDistance = findProvidersWithinRadius(
    serviceLocation,
    mappedProviders,
  );

  // Enriquecer resultado com dados adicionais (protect provider data - only business name)
  const enrichedProviders = providersWithDistance.map((item) => ({
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
  }));

  res.json({
    success: true,
    data: {
      providers: enrichedProviders,
      searchLocation: { latitude, longitude },
      searchRadius: radiusKm,
      totalFound: enrichedProviders.length,
    },
  });
};

/**
 * GET /api/v1/providers/dashboard-stats
 * Estatísticas resumidas do dashboard do fornecedor
 */
export const getDashboardStats = async (req: Request, res: Response) => {
  const providerId = req.user!.id;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    profile,
    pendingRequests,
    activeWorkOrders,
    completedThisMonth,
    earningsThisMonth,
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
  ]);

  res.json({
    success: true,
    data: {
      pendingRequests,
      activeWorkOrders,
      completedThisMonth,
      earningsThisMonth: earningsThisMonth._sum.providerAmount || 0,
      rating: profile?.averageRating || 0,
      totalReviews: profile?.totalReviews || 0,
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
      amount: q.status === "ACCEPTED" ? q.totalAmount : undefined,
    });
  });

  recentPayments.forEach((p) => {
    activities.push({
      id: p.id,
      type: "payment_received",
      title: "Payment received",
      description: p.workOrder?.serviceRequest?.title || "Service",
      time: formatTimeAgo(p.capturedAt || p.createdAt),
      amount: p.providerAmount,
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
 */
export const getPendingRequests = async (req: Request, res: Response) => {
  const providerId = req.user!.id;

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
    take: 10,
    include: {
      vehicle: { select: { make: true, model: true, year: true } },
      user: { select: { city: true, state: true } },
    },
  });

  const formatTimeAgo = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)} days`;
  };

  const pendingRequests = requests.map((r) => ({
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
