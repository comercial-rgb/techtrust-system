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
import {
  getEffectiveServiceRequestLimit,
  getEffectiveVehicleLimit,
  isTrialActive,
  TRIAL_POLICY,
  VEHICLE_ADD_ON,
} from '../config/businessRules';

const router = Router();

router.use(authenticate);

function getStripePriceId(planKey: string, billingPeriod: 'monthly' | 'yearly' = 'monthly') {
  const normalizedPlan = planKey.toLowerCase();
  const normalizedPeriod = billingPeriod.toLowerCase() === 'yearly' ? 'yearly' : 'monthly';

  const monthlyPriceIdMap: Record<string, string | undefined> = {
    starter: process.env.STRIPE_PRICE_STARTER || process.env.STRIPE_PRICE_STARTER_MONTHLY,
    pro: process.env.STRIPE_PRICE_PRO || process.env.STRIPE_PRICE_PRO_MONTHLY,
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE || process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
  };

  const yearlyPriceIdMap: Record<string, string | undefined> = {
    starter: process.env.STRIPE_PRICE_STARTER_YEARLY,
    pro: process.env.STRIPE_PRICE_PRO_YEARLY,
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY,
  };

  return normalizedPeriod === 'yearly'
    ? yearlyPriceIdMap[normalizedPlan] || monthlyPriceIdMap[normalizedPlan]
    : monthlyPriceIdMap[normalizedPlan];
}

function getVehicleAddOnPriceId(plan: string) {
  const normalizedPlan = plan.toUpperCase();
  const priceIdMap: Record<string, string | undefined> = {
    FREE: process.env.STRIPE_PRICE_VEHICLE_ADDON_FREE,
    STARTER: process.env.STRIPE_PRICE_VEHICLE_ADDON_STARTER,
    PRO: process.env.STRIPE_PRICE_VEHICLE_ADDON_PRO,
    ENTERPRISE: process.env.STRIPE_PRICE_VEHICLE_ADDON_ENTERPRISE,
  };

  return priceIdMap[normalizedPlan] || process.env.STRIPE_PRICE_VEHICLE_ADDON;
}

function getBillingReturnUrls(req: Request, fallbackPath: string) {
  const frontendUrl =
    process.env.FRONTEND_URL ||
    process.env.CUSTOMER_APP_URL ||
    process.env.PUBLIC_APP_URL ||
    'https://techtrustautosolutions.com';

  return {
    successUrl: req.body.successUrl || `${frontendUrl}${fallbackPath}?stripe=success`,
    cancelUrl: req.body.cancelUrl || `${frontendUrl}${fallbackPath}?stripe=cancelled`,
  };
}

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
        isTrialActive: isTrialActive(subscription.trialEnd),
        trialEndsAt: subscription.trialEnd,
        trialPolicy: isTrialActive(subscription.trialEnd)
          ? {
              maxVehicles: TRIAL_POLICY.MAX_VEHICLES,
              maxServiceRequestsPerMonth: TRIAL_POLICY.MAX_REQUESTS_PER_MONTH,
              maxActiveSimultaneous: TRIAL_POLICY.MAX_ACTIVE_SIMULTANEOUS,
              lockedFeatures: TRIAL_POLICY.LOCKED_FEATURES,
            }
          : null,
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

    const planEnum = planKey.toUpperCase() as 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
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
        await prisma.$transaction([
          prisma.vehicleAddOn.updateMany({
            where: { subscriptionId: currentSub.id, isActive: true },
            data: { isActive: false, cancelledAt: new Date() },
          }),
          prisma.subscription.update({
            where: { id: currentSub.id },
            data: { status: 'CANCELLED', cancelledAt: new Date() },
          }),
        ]);
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
    const stripePriceId = getStripePriceId(planKey, billingPeriod);
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

    // Criar nova subscription no Stripe (with 7-day trial for first subscription)
    const isFirstPaidSubscription =
      !currentSub || currentSub.plan === 'FREE' || !currentSub.stripeSubscriptionId;
    const hasHadPaidBefore = await prisma.subscription.findFirst({
      where: {
        userId,
        plan: { not: 'FREE' },
        stripeSubscriptionId: { not: null },
        status: { in: ['ACTIVE', 'CANCELLED'] },
      },
    });

    const trialDays = isFirstPaidSubscription && !hasHadPaidBefore
      ? TRIAL_POLICY.TRIAL_DAYS
      : undefined;

    const stripeResult = await stripeService.createSubscription({
      customerId: stripeCustomerId,
      priceId: stripePriceId,
      trialDays,
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
        trialEnd: stripeResult.trialEnd || null,
      },
    });

    logger.info(`Subscription criada: ${newSub.id} (${planEnum}) para user ${userId}`);

    res.json({
      success: true,
      data: {
        subscriptionId: newSub.id,
        clientSecret: stripeResult.clientSecret,
        clientSecretType: stripeResult.clientSecretType,
        plan: planEnum,
        isTrialActive: isTrialActive(stripeResult.trialEnd),
        trialEndsAt: stripeResult.trialEnd,
      },
      message: `Subscribed to ${template.name}`,
    });
  })
);

/**
 * POST /api/v1/subscriptions/end-trial
 * Encerrar trial agora e ativar/cobrar a assinatura paga.
 */
router.post(
  '/end-trial',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const subscription = await prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE', plan: { not: 'FREE' } },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      throw new AppError('No active paid subscription found', 404, 'NO_PAID_SUBSCRIPTION');
    }

    if (!isTrialActive(subscription.trialEnd)) {
      throw new AppError('Subscription is not in an active trial', 400, 'NOT_IN_TRIAL');
    }

    if (!subscription.stripeSubscriptionId) {
      throw new AppError('Subscription is missing Stripe subscription ID', 400, 'MISSING_STRIPE_SUBSCRIPTION');
    }

    const stripeResult = await stripeService.endSubscriptionTrialNow(subscription.stripeSubscriptionId);

    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: stripeResult.status === 'past_due' ? 'PAST_DUE' : 'ACTIVE',
        currentPeriodStart: stripeResult.currentPeriodStart,
        currentPeriodEnd: stripeResult.currentPeriodEnd,
        trialEnd: null,
      },
    });

    res.json({
      success: true,
      message: 'Trial ended. Paid plan activated.',
      data: {
        ...updated,
        price: Number(updated.price),
        isTrialActive: false,
      },
    });
  })
);

/**
 * POST /api/v1/subscriptions/checkout-session
 * Criar sessão Stripe Checkout para o site público/mobile deep links
 */
router.post(
  '/checkout-session',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const {
      planKey,
      billingPeriod = 'monthly',
      successUrl,
      cancelUrl,
    } = req.body;

    if (!planKey) {
      throw new AppError('planKey is required', 400, 'MISSING_PLAN');
    }

    if (!successUrl || !cancelUrl) {
      throw new AppError('successUrl and cancelUrl are required', 400, 'MISSING_RETURN_URLS');
    }

    const template = await prisma.subscriptionPlanTemplate.findUnique({
      where: { planKey },
    });

    if (!template || !template.isActive) {
      throw new AppError('Plan not found or inactive', 404, 'PLAN_NOT_FOUND');
    }

    const planEnum = planKey.toUpperCase() as 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
    if (planEnum === 'FREE') {
      throw new AppError('Free plan does not require checkout', 400, 'FREE_PLAN_CHECKOUT');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, fullName: true },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const currentSub = await prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    const stripePriceId = getStripePriceId(planKey, billingPeriod);
    if (!stripePriceId) {
      throw new AppError(`Stripe Price ID not configured for plan: ${planKey}`, 500, 'PRICE_NOT_CONFIGURED');
    }

    const stripeCustomerId = await stripeService.getOrCreateCustomer({
      userId,
      email: user.email,
      name: user.fullName,
      existingStripeCustomerId: currentSub?.stripeCustomerId,
    });

    if (currentSub && !currentSub.stripeCustomerId) {
      await prisma.subscription.update({
        where: { id: currentSub.id },
        data: { stripeCustomerId },
      });
    }

    const isFirstPaidSubscription =
      !currentSub || currentSub.plan === 'FREE' || !currentSub.stripeSubscriptionId;
    const hasHadPaidBefore = await prisma.subscription.findFirst({
      where: {
        userId,
        plan: { not: 'FREE' },
        stripeSubscriptionId: { not: null },
        status: { in: ['ACTIVE', 'CANCELLED'] },
      },
    });

    const trialDays = isFirstPaidSubscription && !hasHadPaidBefore
      ? TRIAL_POLICY.TRIAL_DAYS
      : undefined;

    const session = await stripeService.createCheckoutSession({
      customerId: stripeCustomerId,
      priceId: stripePriceId,
      userId,
      planKey,
      successUrl,
      cancelUrl,
      trialDays,
    });

    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        checkoutUrl: session.url,
      },
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

      await prisma.$transaction([
        prisma.vehicleAddOn.updateMany({
          where: { subscriptionId: subscription.id, isActive: true },
          data: { isActive: false, cancelledAt: new Date() },
        }),
        prisma.subscription.create({
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
        }),
      ]);

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
          isTrialActive: false,
          trialEndsAt: null,
          vehicles: { used: 0, limit: 1, effectiveLimit: 1 },
          serviceRequests: { used: 0, limit: 3, effectiveLimit: 3, unlimited: false },
        },
      });
      return;
    }

    // Contar veículos reais
    const vehicleCount = await prisma.vehicle.count({
      where: { userId },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const serviceRequestsThisMonth = await prisma.serviceRequest.count({
      where: {
        userId,
        createdAt: { gte: startOfMonth },
      },
    });

    // Count active vehicle add-ons
    const addOnCount = await prisma.vehicleAddOn.count({
      where: { subscriptionId: subscription.id, isActive: true },
    });

    const addOns = await prisma.vehicleAddOn.findMany({
      where: { subscriptionId: subscription.id, isActive: true },
      select: { id: true, vehicleId: true, monthlyPrice: true },
    });

    const effectiveVehicleLimit = getEffectiveVehicleLimit(
      subscription.plan,
      subscription.maxVehicles,
      subscription.trialEnd,
    );
    const effectiveServiceRequestLimit = getEffectiveServiceRequestLimit(
      subscription.plan,
      subscription.maxServiceRequestsPerMonth,
      subscription.trialEnd,
    );
    const trialActive = isTrialActive(subscription.trialEnd);

    res.json({
      success: true,
      data: {
        plan: subscription.plan,
        isTrialActive: trialActive,
        trialEndsAt: subscription.trialEnd,
        vehicles: {
          used: vehicleCount,
          limit: subscription.maxVehicles,
          effectiveLimit: effectiveVehicleLimit + addOnCount,
          addOns: addOnCount,
        },
        serviceRequests: {
          used: serviceRequestsThisMonth,
          limit: subscription.maxServiceRequestsPerMonth,
          effectiveLimit: effectiveServiceRequestLimit,
          unlimited: effectiveServiceRequestLimit === null,
        },
        period: {
          start: subscription.currentPeriodStart,
          end: subscription.currentPeriodEnd,
        },
        vehicleAddOns: addOns.map((a) => ({
          ...a,
          monthlyPrice: Number(a.monthlyPrice),
        })),
      },
    });
  })
);

// ============================================
// VEHICLE ADD-ON ROUTES
// ============================================

/**
 * POST /api/v1/subscriptions/vehicle-addon
 * Add an extra vehicle slot ($6.99/month)
 */
router.post(
  '/vehicle-addon',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { vehicleId } = req.body;

    if (!vehicleId) {
      throw new AppError('vehicleId is required', 400, 'MISSING_VEHICLE_ID');
    }

    // Verify vehicle belongs to user
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, userId },
    });

    if (!vehicle) {
      throw new AppError('Vehicle not found', 404, 'VEHICLE_NOT_FOUND');
    }

    // Get active subscription
    const subscription = await prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      throw new AppError('No active subscription', 404, 'NO_SUBSCRIPTION');
    }

    const plan = subscription.plan as string;
    if (!(VEHICLE_ADD_ON.AVAILABLE_PLANS as readonly string[]).includes(plan)) {
      throw new AppError(
        'Vehicle add-ons are not available for this plan',
        403,
        'PLAN_NOT_ELIGIBLE',
      );
    }

    // Check if vehicle already has an add-on
    const existingAddOn = await prisma.vehicleAddOn.findFirst({
      where: { vehicleId, subscriptionId: subscription.id, isActive: true },
    });

    if (existingAddOn) {
      throw new AppError('This vehicle already has an active add-on', 400, 'ADDON_EXISTS');
    }

    // Add to Stripe subscription if it exists
    let stripeItemId: string | null = null;
    const addonPriceId = getVehicleAddOnPriceId(plan);

    if (!addonPriceId) {
      throw new AppError(
        `Stripe vehicle add-on Price ID is not configured for plan: ${plan}`,
        500,
        'ADDON_PRICE_NOT_CONFIGURED',
      );
    }

    const addOnPrice = VEHICLE_ADD_ON.PRICE_BY_PLAN[plan] ?? 6.99;

    if (addOnPrice <= 0) {
      throw new AppError(
        'This plan uses custom pricing for extra vehicles. Contact support to add more vehicle slots.',
        400,
        'ADDON_CUSTOM_PRICING',
      );
    }

    if (subscription.stripeSubscriptionId) {
      const result = await stripeService.addSubscriptionItem({
        subscriptionId: subscription.stripeSubscriptionId,
        priceId: addonPriceId,
        metadata: { userId, vehicleId, type: 'vehicle_addon' },
      });
      stripeItemId = result.subscriptionItemId;

      // Create add-on record only after Stripe accepted and charged/invoiced the item.
      const addOn = await prisma.vehicleAddOn.create({
        data: {
          subscriptionId: subscription.id,
          userId,
          vehicleId,
          monthlyPrice: addOnPrice,
          stripeSubscriptionItemId: stripeItemId,
          isActive: true,
        },
      });

      logger.info(`Vehicle add-on created: ${addOn.id} for vehicle ${vehicleId} (user ${userId})`);

      res.json({
        success: true,
        data: { ...addOn, monthlyPrice: Number(addOn.monthlyPrice) },
        message: `Vehicle add-on activated ($${addOnPrice}/month)`,
      });
      return;
    }

    // Free plan has no paid subscription by default, so Checkout must collect
    // the first add-on payment before we create an active local add-on record.
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, fullName: true },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const stripeCustomerId = await stripeService.getOrCreateCustomer({
      userId,
      email: user.email,
      name: user.fullName,
      existingStripeCustomerId: subscription.stripeCustomerId,
    });

    if (!subscription.stripeCustomerId) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { stripeCustomerId },
      });
    }

    const { successUrl, cancelUrl } = getBillingReturnUrls(req, '/subscription');
    const checkout = await stripeService.createVehicleAddOnCheckoutSession({
      customerId: stripeCustomerId,
      priceId: addonPriceId,
      userId,
      vehicleId,
      plan,
      successUrl,
      cancelUrl,
    });

    res.json({
      success: true,
      data: {
        checkoutSessionId: checkout.sessionId,
        checkoutUrl: checkout.url,
        monthlyPrice: addOnPrice,
        pendingCheckout: true,
      },
      message: `Complete checkout to activate the vehicle add-on ($${addOnPrice}/month)`,
    });
  })
);

/**
 * DELETE /api/v1/subscriptions/vehicle-addon/:addOnId
 * Remove a vehicle add-on
 */
router.delete(
  '/vehicle-addon/:addOnId',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { addOnId } = req.params;

    const addOn = await prisma.vehicleAddOn.findFirst({
      where: { id: addOnId, userId, isActive: true },
    });

    if (!addOn) {
      throw new AppError('Add-on not found', 404, 'ADDON_NOT_FOUND');
    }

    const subscription = await prisma.subscription.findUnique({
      where: { id: addOn.subscriptionId },
    });

    const activeAddOnCount = await prisma.vehicleAddOn.count({
      where: { subscriptionId: addOn.subscriptionId, isActive: true },
    });

    // Remove from Stripe. If this Free subscription exists only to bill add-ons
    // and this is the final active add-on, cancel the Stripe subscription and
    // keep the local Free plan active without a Stripe subscription id.
    if (
      subscription?.plan === 'FREE' &&
      subscription.stripeSubscriptionId &&
      activeAddOnCount <= 1
    ) {
      await stripeService.cancelSubscription({
        subscriptionId: subscription.stripeSubscriptionId,
        immediately: true,
      });
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { stripeSubscriptionId: null },
      });
    } else if (addOn.stripeSubscriptionItemId) {
      await stripeService.removeSubscriptionItem(addOn.stripeSubscriptionItemId);
    }

    await prisma.vehicleAddOn.update({
      where: { id: addOnId },
      data: { isActive: false, cancelledAt: new Date() },
    });

    logger.info(`Vehicle add-on cancelled: ${addOnId} (user ${userId})`);

    res.json({
      success: true,
      message: 'Vehicle add-on cancelled',
    });
  })
);

/**
 * GET /api/v1/subscriptions/vehicle-addons
 * List active vehicle add-ons
 */
router.get(
  '/vehicle-addons',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const addOns = await prisma.vehicleAddOn.findMany({
      where: { userId, isActive: true },
      include: {
        vehicle: {
          select: { id: true, make: true, model: true, year: true, plateNumber: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: addOns.map((a) => ({
        ...a,
        monthlyPrice: Number(a.monthlyPrice),
      })),
    });
  })
);

export default router;
