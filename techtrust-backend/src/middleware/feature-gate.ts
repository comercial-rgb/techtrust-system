/**
 * ============================================
 * FEATURE GATING MIDDLEWARE
 * ============================================
 * Restricts access to features based on the user's subscription plan.
 * Uses businessRules.ts as the single source of truth for plan features.
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from './error-handler';
import { prisma } from '../config/database';
import { isFeatureAvailable, SUBSCRIPTION_PLANS, PlanKey } from '../config/businessRules';

/**
 * Middleware factory: require a specific feature to be enabled for the user's plan.
 * Usage: router.get('/some-route', authenticate, requireFeature('wallet'), handler);
 */
export function requireFeature(featureKey: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    if (!userId) {
      return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
    }

    const subscription = await prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    const plan = subscription?.plan ?? 'FREE';

    if (!isFeatureAvailable(plan, featureKey)) {
      // Find the minimum plan that has this feature
      const upgradeHint = getMinimumPlanForFeature(featureKey);
      return next(
        new AppError(
          `This feature requires a ${upgradeHint} plan or higher. Please upgrade your subscription.`,
          403,
          'FEATURE_NOT_AVAILABLE',
        ),
      );
    }

    next();
  };
}

/**
 * Find the minimum plan tier that includes a given feature.
 */
function getMinimumPlanForFeature(featureKey: string): string {
  const planOrder: PlanKey[] = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'];
  for (const planKey of planOrder) {
    const features = SUBSCRIPTION_PLANS[planKey].features as Record<string, boolean>;
    if (features[featureKey] === true) {
      return SUBSCRIPTION_PLANS[planKey].name;
    }
  }
  return 'Enterprise';
}

/**
 * Middleware: check vehicle limit before adding a new vehicle.
 * Considers both plan limit and active vehicle add-ons.
 */
export async function checkVehicleLimit(req: Request, _res: Response, next: NextFunction) {
  const userId = req.user?.id;
  if (!userId) {
    return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
  }

  const subscription = await prisma.subscription.findFirst({
    where: { userId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  });

  const plan = (subscription?.plan ?? 'FREE') as PlanKey;
  const planLimit = SUBSCRIPTION_PLANS[plan].maxVehicles ?? Infinity;

  // Count active vehicle add-ons
  const addOnCount = subscription
    ? await prisma.vehicleAddOn.count({
        where: { subscriptionId: subscription.id, isActive: true },
      })
    : 0;

  const totalLimit = planLimit + addOnCount;

  const currentVehicles = await prisma.vehicle.count({
    where: { userId, isActive: true },
  });

  if (currentVehicles >= totalLimit) {
    return next(
      new AppError(
        `Vehicle limit reached (${totalLimit}). Add a vehicle add-on ($6.99/mo) or upgrade your plan.`,
        403,
        'VEHICLE_LIMIT_REACHED',
      ),
    );
  }

  next();
}

/**
 * Middleware: check service request limit for the current month.
 */
export async function checkServiceRequestLimit(req: Request, _res: Response, next: NextFunction) {
  const userId = req.user?.id;
  if (!userId) {
    return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
  }

  const subscription = await prisma.subscription.findFirst({
    where: { userId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  });

  const plan = (subscription?.plan ?? 'FREE') as PlanKey;
  const monthlyLimit = SUBSCRIPTION_PLANS[plan].maxRequestsPerMonth;

  // null = unlimited
  if (monthlyLimit === null) {
    return next();
  }

  const used = subscription?.serviceRequestsThisMonth ?? 0;
  if (used >= monthlyLimit) {
    return next(
      new AppError(
        `Monthly service request limit reached (${monthlyLimit}). Upgrade your plan for more requests.`,
        403,
        'SERVICE_REQUEST_LIMIT_REACHED',
      ),
    );
  }

  next();
}
