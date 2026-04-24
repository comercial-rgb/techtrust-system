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
import {
  getEffectiveServiceRequestLimit,
  getEffectiveVehicleLimit,
  isFeatureAvailableForSubscription,
  isFeatureLockedDuringTrial,
  isTrialActive,
  SUBSCRIPTION_PLANS,
  PlanKey,
} from '../config/businessRules';

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
    const trialActive = isTrialActive(subscription?.trialEnd);

    if (!isFeatureAvailableForSubscription(plan, featureKey, subscription?.trialEnd)) {
      // Find the minimum plan that has this feature
      const upgradeHint = getMinimumPlanForFeature(featureKey);
      const message = trialActive && isFeatureLockedDuringTrial(featureKey)
        ? 'This feature unlocks when you activate your paid plan. You can end your trial anytime.'
        : `This feature requires a ${upgradeHint} plan or higher. Please upgrade your subscription.`;

      return next(
        new AppError(
          message,
          403,
          trialActive && isFeatureLockedDuringTrial(featureKey)
            ? 'TRIAL_FEATURE_LOCKED'
            : 'FEATURE_NOT_AVAILABLE',
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
  const planLimit = getEffectiveVehicleLimit(plan, subscription?.maxVehicles, subscription?.trialEnd);

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
  const monthlyLimit = getEffectiveServiceRequestLimit(
    plan,
    subscription?.maxServiceRequestsPerMonth,
    subscription?.trialEnd,
  );

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
