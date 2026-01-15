/**
 * ============================================
 * CONTENT CONTROLLER
 * ============================================
 * Controla conteúdo dinâmico: banners, ofertas, artigos, etc
 */

import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error-handler';
import { logger } from '../config/logger';

/**
 * GET /api/v1/content/banners
 * Retorna banners/promoções ativas
 */
export const getBanners = async (req: Request, res: Response) => {
  try {
    const banners = await prisma.banner.findMany({
      where: {
        isActive: true,
        startDate: { lte: new Date() },
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } }
        ]
      },
      orderBy: { order: 'asc' },
      take: 10,
    });

    res.json({
      success: true,
      data: banners,
    });
  } catch (error: any) {
    logger.error('Erro ao buscar banners:', error);
    throw new AppError('Erro ao buscar banners', 500);
  }
};

/**
 * GET /api/v1/content/offers
 * Retorna ofertas especiais ativas
 */
export const getOffers = async (req: Request, res: Response) => {
  try {
    const offers = await prisma.specialOffer.findMany({
      where: {
        isActive: true,
        startDate: { lte: new Date() },
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } }
        ]
      },
      orderBy: { order: 'asc' },
      take: 10,
    });

    res.json({
      success: true,
      data: offers,
    });
  } catch (error: any) {
    logger.error('Erro ao buscar ofertas:', error);
    throw new AppError('Erro ao buscar ofertas', 500);
  }
};

/**
 * GET /api/v1/content/featured-providers
 * Retorna fornecedores em destaque
 */
export const getFeaturedProviders = async (req: Request, res: Response) => {
  try {
    const featuredProviders = await prisma.user.findMany({
      where: {
        role: 'PROVIDER',
        providerProfile: {
          isFeatured: true,
          isVerified: true,
        }
      },
      include: {
        providerProfile: {
          include: {
            services: true,
          }
        }
      },
      take: 10,
    });

    res.json({
      success: true,
      data: featuredProviders,
    });
  } catch (error: any) {
    logger.error('Erro ao buscar fornecedores em destaque:', error);
    throw new AppError('Erro ao buscar fornecedores', 500);
  }
};

/**
 * GET /api/v1/content/articles
 * Retorna artigos/blog posts
 */
export const getArticles = async (req: Request, res: Response) => {
  try {
    const articles = await prisma.article.findMany({
      where: {
        isPublished: true,
        publishDate: { lte: new Date() },
      },
      orderBy: { publishDate: 'desc' },
      take: 10,
    });

    res.json({
      success: true,
      data: articles,
    });
  } catch (error: any) {
    logger.error('Erro ao buscar artigos:', error);
    throw new AppError('Erro ao buscar artigos', 500);
  }
};

/**
 * GET /api/v1/content/home-data
 * Retorna todos os dados da home em uma única chamada
 */
export const getHomeData = async (req: Request, res: Response) => {
  try {
    const [banners, offers, featuredProviders, articles] = await Promise.all([
      prisma.banner.findMany({
        where: {
          isActive: true,
          startDate: { lte: new Date() },
          OR: [{ endDate: null }, { endDate: { gte: new Date() } }]
        },
        orderBy: { order: 'asc' },
        take: 5,
      }),
      prisma.specialOffer.findMany({
        where: {
          isActive: true,
          startDate: { lte: new Date() },
          OR: [{ endDate: null }, { endDate: { gte: new Date() } }]
        },
        orderBy: { order: 'asc' },
        take: 5,
      }),
      prisma.user.findMany({
        where: {
          role: 'PROVIDER',
          providerProfile: {
            isFeatured: true,
            isVerified: true,
          }
        },
        include: {
          providerProfile: {
            include: { services: true }
          }
        },
        take: 6,
      }),
      prisma.article.findMany({
        where: {
          isPublished: true,
          publishDate: { lte: new Date() },
        },
        orderBy: { publishDate: 'desc' },
        take: 3,
      }),
    ]);

    res.json({
      success: true,
      data: {
        banners,
        offers,
        featuredProviders,
        articles,
      }
    });
  } catch (error: any) {
    logger.error('Erro ao buscar dados da home:', error);
    throw new AppError('Erro ao buscar dados da home', 500);
  }
};
