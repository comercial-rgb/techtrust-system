/**
 * ============================================
 * CONTENT ROUTES - Rotas Públicas de Conteúdo
 * ============================================
 * Endpoint público para mobile/web acessar conteúdo
 * da landing page: banners, ofertas, artigos, avisos
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

// ============================================
// BANNERS - Publicidade
// ============================================

// Obter banners ativos
router.get('/banners', asyncHandler(async (req: Request, res: Response) => {
  const { audience = 'all' } = req.query;
  const now = new Date();
  
  const banners = await prisma.banner.findMany({
    where: {
      isActive: true,
      targetAudience: { in: ['all', audience as string] },
      OR: [
        { startDate: null, endDate: null },
        { startDate: { lte: now }, endDate: null },
        { startDate: null, endDate: { gte: now } },
        { startDate: { lte: now }, endDate: { gte: now } }
      ]
    },
    orderBy: { position: 'asc' },
    select: {
      id: true,
      title: true,
      subtitle: true,
      imageUrl: true,
      linkUrl: true,
      linkType: true
    }
  });
  
  res.json(banners);
}));

// ============================================
// OFERTAS ESPECIAIS
// ============================================

// Obter ofertas ativas
router.get('/offers', asyncHandler(async (req: Request, res: Response) => {
  const { featured } = req.query;
  
  // Use start of today (midnight) for date comparison to avoid timezone issues
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // End of today for validUntil comparison
  const endOfToday = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
  
  const where: any = {
    isActive: true,
    OR: [
      { validFrom: null, validUntil: null },
      { validFrom: { lte: endOfToday }, validUntil: null },
      { validFrom: null, validUntil: { gte: today } },
      { validFrom: { lte: endOfToday }, validUntil: { gte: today } }
    ]
  };
  
  if (featured === 'true') {
    where.isFeatured = true;
  }
  
  const offers = await prisma.specialOffer.findMany({
    where,
    orderBy: [{ isFeatured: 'desc' }, { position: 'asc' }],
    select: {
      id: true,
      title: true,
      description: true,
      imageUrl: true,
      discountType: true,
      discountLabel: true,
      originalPrice: true,
      discountedPrice: true,
      validUntil: true,
      promoCode: true
    }
  });
  
  res.json(offers);
}));

// Obter oferta por ID
router.get('/offers/:id', asyncHandler(async (req: Request, res: Response) => {
  const offer = await prisma.specialOffer.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      title: true,
      description: true,
      imageUrl: true,
      discountType: true,
      discountValue: true,
      discountLabel: true,
      originalPrice: true,
      discountedPrice: true,
      validFrom: true,
      validUntil: true,
      promoCode: true,
      applicableServices: true
    }
  });
  
  if (!offer) {
    return res.status(404).json({ error: 'Oferta não encontrada' });
  }
  
  return res.json(offer);
}));

// ============================================
// ARTIGOS/DICAS
// ============================================

// Listar artigos publicados
router.get('/articles', asyncHandler(async (req: Request, res: Response) => {
  const { category, featured, limit = '10', offset = '0' } = req.query;
  
  const where: any = { isPublished: true };
  if (category) where.category = category;
  if (featured === 'true') where.isFeatured = true;
  
  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        imageUrl: true,
        category: true,
        readTime: true,
        publishedAt: true,
        isFeatured: true,
        author: {
          select: { fullName: true }
        }
      }
    }),
    prisma.article.count({ where })
  ]);
  
  res.json({ articles, total, limit: parseInt(limit as string), offset: parseInt(offset as string) });
}));

// Obter artigo por slug
router.get('/articles/slug/:slug', asyncHandler(async (req: Request, res: Response) => {
  const article = await prisma.article.findUnique({
    where: { slug: req.params.slug, isPublished: true },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      content: true,
      imageUrl: true,
      category: true,
      tags: true,
      readTime: true,
      publishedAt: true,
      viewCount: true,
      likeCount: true,
      author: {
        select: { fullName: true }
      }
    }
  });
  
  if (!article) {
    return res.status(404).json({ error: 'Artigo não encontrado' });
  }
  
  // Incrementar visualização
  await prisma.article.update({
    where: { id: article.id },
    data: { viewCount: { increment: 1 } }
  });
  
  return res.json(article);
}));

// Obter artigo por ID
router.get('/articles/:id', asyncHandler(async (req: Request, res: Response) => {
  const article = await prisma.article.findUnique({
    where: { id: req.params.id, isPublished: true },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      content: true,
      imageUrl: true,
      category: true,
      tags: true,
      readTime: true,
      publishedAt: true,
      viewCount: true,
      likeCount: true,
      author: {
        select: { fullName: true }
      }
    }
  });
  
  if (!article) {
    return res.status(404).json({ error: 'Artigo não encontrado' });
  }
  
  // Incrementar visualização
  await prisma.article.update({
    where: { id: article.id },
    data: { viewCount: { increment: 1 } }
  });
  
  return res.json(article);
}));

// Categorias de artigos
router.get('/articles/categories/list', asyncHandler(async (_req: Request, res: Response) => {
  const categories = [
    { id: 'tips', name: 'Tips & How-to', icon: 'bulb' },
    { id: 'maintenance', name: 'Maintenance', icon: 'construct' },
    { id: 'news', name: 'News', icon: 'newspaper' },
    { id: 'safety', name: 'Safety', icon: 'shield-checkmark' },
    { id: 'technology', name: 'Technology', icon: 'hardware-chip' }
  ];
  
  res.json(categories);
}));

// ============================================
// AVISOS/NOTÍCIAS IMPORTANTES
// ============================================

// Obter avisos ativos
router.get('/notices', asyncHandler(async (req: Request, res: Response) => {
  const { audience = 'all', type } = req.query;
  const now = new Date();
  
  const where: any = {
    isActive: true,
    targetAudience: { in: ['all', audience as string] },
    OR: [
      { startDate: null, endDate: null },
      { startDate: { lte: now }, endDate: null },
      { startDate: null, endDate: { gte: now } },
      { startDate: { lte: now }, endDate: { gte: now } }
    ]
  };
  
  if (type) where.type = type;
  
  const notices = await prisma.notice.findMany({
    where,
    orderBy: [{ isPinned: 'desc' }, { position: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      title: true,
      message: true,
      type: true,
      icon: true,
      isPinned: true,
      actionLabel: true,
      actionUrl: true
    }
  });
  
  res.json(notices);
}));

// ============================================
// CONTEÚDO COMBINADO - Landing Page
// ============================================

// Obter todo conteúdo para landing page em uma chamada
router.get('/landing', asyncHandler(async (req: Request, res: Response) => {
  const { audience = 'all' } = req.query;
  const now = new Date();
  
  const dateFilter = {
    OR: [
      { startDate: null, endDate: null },
      { startDate: { lte: now }, endDate: null },
      { startDate: null, endDate: { gte: now } },
      { startDate: { lte: now }, endDate: { gte: now } }
    ]
  };
  
  const [banners, offers, articles, notices] = await Promise.all([
    // Banners
    prisma.banner.findMany({
      where: {
        isActive: true,
        targetAudience: { in: ['all', audience as string] },
        ...dateFilter
      },
      orderBy: { position: 'asc' },
      take: 5,
      select: {
        id: true,
        title: true,
        subtitle: true,
        imageUrl: true,
        linkUrl: true,
        linkType: true
      }
    }),
    // Ofertas
    prisma.specialOffer.findMany({
      where: {
        isActive: true,
        OR: [
          { validFrom: null, validUntil: null },
          { validFrom: { lte: now }, validUntil: null },
          { validFrom: null, validUntil: { gte: now } },
          { validFrom: { lte: now }, validUntil: { gte: now } }
        ]
      },
      orderBy: [{ isFeatured: 'desc' }, { position: 'asc' }],
      take: 6,
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        discountLabel: true,
        originalPrice: true,
        discountedPrice: true,
        validUntil: true
      }
    }),
    // Artigos
    prisma.article.findMany({
      where: { isPublished: true },
      orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
      take: 4,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        imageUrl: true,
        category: true,
        readTime: true
      }
    }),
    // Avisos
    prisma.notice.findMany({
      where: {
        isActive: true,
        targetAudience: { in: ['all', audience as string] },
        ...dateFilter
      },
      orderBy: [{ isPinned: 'desc' }, { position: 'asc' }],
      take: 3,
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        icon: true,
        isPinned: true,
        actionLabel: true,
        actionUrl: true
      }
    })
  ]);
  
  res.json({ banners, offers, articles, notices });
}));

// ============================================
// HOME DATA - Todos os dados da página inicial
// ============================================

// Obter todos os dados para a home (banners, ofertas, artigos, fornecedores em destaque)
router.get('/home-data', asyncHandler(async (_req: Request, res: Response) => {
  const now = new Date();
  
  const [banners, offers, articles, notices, featuredProviders] = await Promise.all([
    // Banners
    prisma.banner.findMany({
      where: {
        isActive: true,
        targetAudience: { in: ['all', 'guest'] },
        OR: [
          { startDate: null, endDate: null },
          { startDate: { lte: now }, endDate: null },
          { startDate: null, endDate: { gte: now } },
          { startDate: { lte: now }, endDate: { gte: now } }
        ]
      },
      orderBy: { position: 'asc' },
      select: {
        id: true,
        title: true,
        subtitle: true,
        imageUrl: true,
        linkUrl: true,
        linkType: true
      },
      take: 5,
    }),
    // Ofertas especiais
    prisma.specialOffer.findMany({
      where: {
        isActive: true,
        OR: [
          { validFrom: null, validUntil: null },
          { validFrom: { lte: now }, validUntil: null },
          { validFrom: null, validUntil: { gte: now } },
          { validFrom: { lte: now }, validUntil: { gte: now } }
        ]
      },
      orderBy: { position: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        discountType: true,
        discountValue: true,
        discountLabel: true,
        originalPrice: true,
        discountedPrice: true,
        validFrom: true,
        validUntil: true,
        promoCode: true,
        serviceType: true,
        vehicleTypes: true,
        fuelTypes: true,
        isFeatured: true
      },
      take: 5,
    }),
    // Artigos
    prisma.article.findMany({
      where: {
        isPublished: true,
        OR: [{ publishedAt: null }, { publishedAt: { lte: now } }]
      },
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        excerpt: true,
        imageUrl: true,
        slug: true,
        publishedAt: true
      },
      take: 3,
    }),
    // Avisos importantes
    prisma.notice.findMany({
      where: { isPinned: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        icon: true,
        actionLabel: true,
        actionUrl: true
      },
      take: 2,
    }),
    // Fornecedores em destaque
    prisma.user.findMany({
      where: {
        role: 'PROVIDER',
        status: 'ACTIVE',
        providerProfile: {
          isVerified: true,
        }
      },
      include: {
        providerProfile: {
          select: {
            businessName: true,
            businessType: true,
            city: true,
            state: true,
            averageRating: true,
            totalReviews: true,
          }
        }
      },
      take: 6,
    })
  ]);

  res.json({
    success: true,
    data: {
      banners,
      offers: offers.map((o) => ({
        id: o.id,
        title: o.title,
        description: o.description,
        imageUrl: o.imageUrl,
        discountType: o.discountType,
        discountValue: o.discountValue,
        discountLabel: o.discountLabel,
        originalPrice: o.originalPrice,
        discountedPrice: o.discountedPrice,
        validFrom: o.validFrom,
        validUntil: o.validUntil,
        promoCode: o.promoCode,
        serviceType: o.serviceType,
        vehicleTypes: o.vehicleTypes,
        fuelTypes: o.fuelTypes,
        isFeatured: o.isFeatured,
        // Legacy field aliases for backwards compatibility
        discount: o.discountValue,
        code: o.promoCode,
      })),
      articles: articles.map((a) => ({
        id: a.id,
        title: a.title,
        summary: a.excerpt,
        imageUrl: a.imageUrl,
        slug: a.slug,
        publishDate: a.publishedAt,
      })),
      notices,
      featuredProviders: featuredProviders.map(p => ({
        id: p.id,
        fullName: p.fullName,
        email: p.email,
        phone: p.phone,
        ...p.providerProfile,
      }))
    }
  });
}));

// ============================================
// SUBSCRIPTION PLANS - Planos de Assinatura
// ============================================

// Obter planos ativos para o mobile
router.get('/subscription-plans', asyncHandler(async (_req: Request, res: Response) => {
  // Try to get from database
  const dbPlans = await prisma.subscriptionPlanTemplate.findMany({
    where: { isActive: true },
    orderBy: { position: 'asc' },
    select: {
      id: true,
      planKey: true,
      name: true,
      description: true,
      monthlyPrice: true,
      yearlyPrice: true,
      vehicleLimit: true,
      serviceRequestsPerMonth: true,
      features: true,
      isFeatured: true,
    }
  });
  
  // If no plans in DB, return default plans
  if (dbPlans.length === 0) {
    const defaultPlans = [
      {
        id: 'free',
        planKey: 'free',
        name: 'Free',
        description: 'Perfect for getting started',
        monthlyPrice: 0,
        yearlyPrice: 0,
        vehicleLimit: 1,
        serviceRequestsPerMonth: null,
        features: [
          'Up to 1 vehicle',
          'Basic service requests',
          'Standard support',
          'View service history',
        ],
        isFeatured: false,
      },
      {
        id: 'basic',
        planKey: 'basic',
        name: 'Basic',
        description: 'For individuals with multiple vehicles',
        monthlyPrice: 9.99,
        yearlyPrice: 99.99,
        vehicleLimit: 3,
        serviceRequestsPerMonth: 10,
        features: [
          'Up to 3 vehicles',
          'Priority service requests',
          'Email support',
          'Service history & reports',
          'Service reminders',
        ],
        isFeatured: false,
      },
      {
        id: 'premium',
        planKey: 'premium',
        name: 'Premium',
        description: 'Best for families and small businesses',
        monthlyPrice: 19.99,
        yearlyPrice: 199.99,
        vehicleLimit: 10,
        serviceRequestsPerMonth: null,
        features: [
          'Up to 10 vehicles',
          'Priority service requests',
          'Priority support 24/7',
          'Detailed service reports',
          'Exclusive discounts (up to 15%)',
          'Free roadside assistance',
          'Service reminders',
        ],
        isFeatured: true,
      },
    ];
    return res.json(defaultPlans);
  }
  
  // Format DB plans for response
  const plans = dbPlans.map(plan => ({
    ...plan,
    monthlyPrice: Number(plan.monthlyPrice),
    yearlyPrice: Number(plan.yearlyPrice),
    features: typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features,
  }));
  
  return res.json(plans);
}));

export default router;
