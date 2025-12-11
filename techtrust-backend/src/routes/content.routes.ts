/**
 * ============================================
 * CONTENT ROUTES - Rotas Públicas de Conteúdo
 * ============================================
 * Endpoint público para mobile/web acessar conteúdo
 * da landing page: banners, ofertas, artigos, avisos
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../utils/async-handler';

const router = Router();
const prisma = new PrismaClient();

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
  const now = new Date();
  
  const where: any = {
    isActive: true,
    OR: [
      { validFrom: null, validUntil: null },
      { validFrom: { lte: now }, validUntil: null },
      { validFrom: null, validUntil: { gte: now } },
      { validFrom: { lte: now }, validUntil: { gte: now } }
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

export default router;
