/**
 * ============================================
 * SUBSCRIPTION ROUTES
 * ============================================
 * Gerenciamento de assinaturas dos clientes
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error-handler';
import { logger } from '../config/logger';
import * as stripeService from '../services/stripe.service';

const router = Router();

router.use(authenticate);

/**
 * GET /api/v1/subscriptions/me
 * Obter assinatura atual do usuário
 */
router.get(
  '/me',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    let subscription = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Se não tem assinatura, criar FREE
    if (!subscription) {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setFullYear(periodEnd.getFullYear() + 100); // FREE = "infinito"

      subscription = await prisma.subscription.create({
        data: {
          userId,
          plan: 'FREE',
          price: 0,
          status: 'ACTIVE',
          maxVehicles: 1,
          maxServiceRequestsPerMonth: 3,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      });
    }

    // Buscar limites do template
    const template = await prisma.subscriptionPlanTemplate.findUnique({
      where: { planKey: subscription.plan.toLowerCase() },
    });

    res.json({
      success: true,
      data: {
        ...subscription,
        price: Number(subscription.price),
        features: template?.features || [],
        templateName: template?.name || subscription.plan,
        templateDescription: template?.description || null,
      },
    });
  })
);

/**
 * GET /api/v1/subscriptions/plans
 * Listar planos disponíveis
 */
router.get(
  '/plans',
  asyncHandler(async (_req: Request, res: Response) => {
    const plans = await prisma.subscriptionPlanTemplate.findMany({
      where: { isActive: true },
      orderBy: { position: 'asc' },
    });

    res.json({
      success: true,
      data: plans.map((p) => ({
        ...p,
        monthlyPrice: Number(p.monthlyPrice),
        yearlyPrice: Number(p.yearlyPrice),
      })),
    });
  })
);

/**
 * POST /api/v1/subscriptions/subscribe
 * Criar/upgrade assinatura
 */
router.post(
  '/subscribe',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { planKey, billingPeriod = 'monthly' } = req.body;

    if (!planKey) {
      throw new AppError('planKey is required', 400, 'MISSING_PLAN');
    }

    // Buscar template do plano
    const template = await prisma.subscriptionPlanTemplate.findUnique({
      where: { planKey },
    });

    if (!template || !template.isActive) {
      throw new AppError('Plan not found or inactive', 404, 'PLAN_NOT_FOUND');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, fullName: true },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Verificar assinatura atual
    const currentSub = await prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    const planEnum = planKey.toUpperCase() as 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
    const price = billingPeriod === 'yearly' ? Number(template.yearlyPrice) : Number(template.monthlyPrice);

    // Se é plano FREE
    if (planEnum === 'FREE') {
      // Cancelar assinatura Stripe se existir
      if (currentSub?.stripeSubscriptionId) {
        await stripeService.cancelSubscription({
          subscriptionId: currentSub.stripeSubscriptionId,
          immediately: true,
        });
      }

      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setFullYear(periodEnd.getFullYear() + 100);

      // Cancelar atual e criar FREE
      if (currentSub) {
        await prisma.subscription.update({
          where: { id: currentSub.id },
          data: { status: 'CANCELLED', cancelledAt: new Date() },
        });
      }

      const newSub = await prisma.subscription.create({
        data: {
          userId,
          plan: 'FREE',
          price: 0,
          status: 'ACTIVE',
          maxVehicles: template.vehicleLimit,
          maxServiceRequestsPerMonth: template.serviceRequestsPerMonth,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      });

      res.json({
        success: true,
        data: newSub,
        message: 'Downgraded to Free plan',
      });
      return;
    }

    // Planos pagos - precisa do Stripe
    // Obter ou criar Stripe Customer
    const stripeCustomerId = await stripeService.getOrCreateCustomer({
      userId,
      email: user.email,
      name: user.fullName,
      existingStripeCustomerId: currentSub?.stripeCustomerId,
    });

    // Determinar Stripe Price ID baseado no plano
    const priceIdMap: Record<string, string | undefined> = {
      basic: process.env.STRIPE_PRICE_BASIC,
      premium: process.env.STRIPE_PRICE_PREMIUM,
      enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
    };

    const stripePriceId = priceIdMap[planKey];
    if (!stripePriceId) {
      throw new AppError(`Stripe Price ID not configured for plan: ${planKey}`, 500, 'PRICE_NOT_CONFIGURED');
    }

    // Se já tem subscription ativa no Stripe, fazer upgrade
    if (currentSub?.stripeSubscriptionId) {
      const updated = await stripeService.updateSubscription({
        subscriptionId: currentSub.stripeSubscriptionId,
        newPriceId: stripePriceId,
      });

      await prisma.subscription.update({
        where: { id: currentSub.id },
        data: {
          plan: planEnum,
          price,
          maxVehicles: template.vehicleLimit,
          maxServiceRequestsPerMonth: template.serviceRequestsPerMonth,
          currentPeriodEnd: updated.currentPeriodEnd,
        },
      });

      res.json({
        success: true,
        message: `Plan upgraded to ${template.name}`,
        data: { subscriptionId: currentSub.id },
      });
      return;
    }

    // Criar nova subscription no Stripe
    const stripeResult = await stripeService.createSubscription({
      customerId: stripeCustomerId,
      priceId: stripePriceId,
      metadata: { userId, planKey },
    });

    const now = new Date();
    const periodEnd = stripeResult.currentPeriodEnd;

    // Cancelar assinatura atual
    if (currentSub) {
      await prisma.subscription.update({
        where: { id: currentSub.id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });
    }

    // Criar no banco
    const newSub = await prisma.subscription.create({
      data: {
        userId,
        plan: planEnum,
        price,
        status: 'ACTIVE',
        stripeSubscriptionId: stripeResult.subscriptionId,
        stripeCustomerId,
        maxVehicles: template.vehicleLimit,
        maxServiceRequestsPerMonth: template.serviceRequestsPerMonth,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    logger.info(`Subscription criada: ${newSub.id} (${planEnum}) para user ${userId}`);

    res.json({
      success: true,
      data: {
        subscriptionId: newSub.id,
        clientSecret: stripeResult.clientSecret,
        plan: planEnum,
      },
      message: `Subscribed to ${template.name}`,
    });
  })
);

/**
 * POST /api/v1/subscriptions/cancel
 * Cancelar assinatura
 */
router.post(
  '/cancel',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { immediately = false, reason } = req.body;

    const subscription = await prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      throw new AppError('No active subscription found', 404, 'NO_SUBSCRIPTION');
    }

    if (subscription.plan === 'FREE') {
      throw new AppError('Cannot cancel free plan', 400, 'CANNOT_CANCEL_FREE');
    }

    // Cancelar no Stripe
    if (subscription.stripeSubscriptionId) {
      await stripeService.cancelSubscription({
        subscriptionId: subscription.stripeSubscriptionId,
        immediately,
      });
    }

    if (immediately) {
      // Cancelar imediatamente e reverter para FREE
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancellationReason: reason || null,
        },
      });

      // Criar plano FREE
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setFullYear(periodEnd.getFullYear() + 100);

      await prisma.subscription.create({
        data: {
          userId,
          plan: 'FREE',
          price: 0,
          status: 'ACTIVE',
          maxVehicles: 1,
          maxServiceRequestsPerMonth: 3,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      });

      res.json({
        success: true,
        message: 'Subscription cancelled immediately. Reverted to Free plan.',
      });
      return;
    }

    // Cancelar no fim do período
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancellationReason: reason || null,
      },
    });

    res.json({
      success: true,
      message: `Subscription will be cancelled at end of period (${subscription.currentPeriodEnd.toISOString().split('T')[0]})`,
      data: {
        cancelAt: subscription.currentPeriodEnd,
      },
    });
  })
);

/**
 * GET /api/v1/subscriptions/usage
 * Verificar uso atual da assinatura
 */
router.get(
  '/usage',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const subscription = await prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      res.json({
        success: true,
        data: {
          plan: 'FREE',
          vehicles: { used: 0, limit: 1 },
          serviceRequests: { used: 0, limit: 3 },
        },
      });
      return;
    }

    // Contar veículos reais
    const vehicleCount = await prisma.vehicle.count({
      where: { userId },
    });

    res.json({
      success: true,
      data: {
        plan: subscription.plan,
        vehicles: {
          used: vehicleCount,
          limit: subscription.maxVehicles,
        },
        serviceRequests: {
          used: subscription.serviceRequestsThisMonth,
          limit: subscription.maxServiceRequestsPerMonth,
          unlimited: subscription.maxServiceRequestsPerMonth === null,
        },
        period: {
          start: subscription.currentPeriodStart,
          end: subscription.currentPeriodEnd,
        },
      },
    });
  })
);

export default router;
