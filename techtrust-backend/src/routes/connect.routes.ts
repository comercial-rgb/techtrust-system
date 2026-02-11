/**
 * ============================================
 * STRIPE CONNECT ROUTES
 * ============================================
 * Onboarding e gestão de contas Connect para providers
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
 * POST /api/v1/connect/onboard
 * Iniciar onboarding do Stripe Connect para provider
 */
router.post(
  '/onboard',
  asyncHandler(async (req: Request, res: Response): Promise<any> => {
    const userId = req.user!.id;

    // Verificar se é provider
    if (req.user!.role !== 'PROVIDER') {
      throw new AppError('Only providers can create Connect accounts', 403, 'NOT_PROVIDER');
    }

    // Buscar provider profile
    const profile = await prisma.providerProfile.findUnique({
      where: { userId },
      include: { user: { select: { email: true, fullName: true } } },
    });

    if (!profile) {
      throw new AppError('Provider profile not found', 404, 'PROFILE_NOT_FOUND');
    }

    let accountId = profile.stripeAccountId;

    // Se ainda não tem account, criar
    if (!accountId) {
      const result = await stripeService.createConnectAccount({
        email: profile.user.email,
        businessName: profile.businessName || profile.user.fullName,
        userId,
      });
      accountId = result.accountId;

      // Salvar no profile
      await prisma.providerProfile.update({
        where: { id: profile.id },
        data: { stripeAccountId: accountId },
      });

      logger.info(`Connect Account criado para provider ${userId}: ${accountId}`);
    }

    // Gerar link de onboarding
    const baseUrl = process.env.FRONTEND_URL || process.env.PROVIDER_DASHBOARD_URL || 'https://techtrust-provider.vercel.app';
    const onboardingUrl = await stripeService.createAccountLink({
      accountId,
      refreshUrl: `${baseUrl}/stripe/refresh`,
      returnUrl: `${baseUrl}/stripe/return`,
    });

    res.json({
      success: true,
      data: {
        onboardingUrl,
        accountId,
      },
    });
  })
);

/**
 * GET /api/v1/connect/status
 * Verificar status da conta Connect
 */
router.get(
  '/status',
  asyncHandler(async (req: Request, res: Response): Promise<any> => {
    const userId = req.user!.id;

    const profile = await prisma.providerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new AppError('Provider profile not found', 404, 'PROFILE_NOT_FOUND');
    }

    if (!profile.stripeAccountId) {
      return res.json({
        success: true,
        data: {
          hasAccount: false,
          onboardingCompleted: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          requirements: [],
        },
      });
    }

    const status = await stripeService.getConnectAccountStatus(profile.stripeAccountId);

    // Atualizar flag de onboarding se mudou
    const isComplete = status.chargesEnabled && status.payoutsEnabled && status.detailsSubmitted;
    if (isComplete !== profile.stripeOnboardingCompleted) {
      await prisma.providerProfile.update({
        where: { id: profile.id },
        data: { stripeOnboardingCompleted: isComplete },
      });
    }

    res.json({
      success: true,
      data: {
        hasAccount: true,
        accountId: profile.stripeAccountId,
        onboardingCompleted: isComplete,
        chargesEnabled: status.chargesEnabled,
        payoutsEnabled: status.payoutsEnabled,
        detailsSubmitted: status.detailsSubmitted,
        requirements: status.requirements,
      },
    });
  })
);

/**
 * GET /api/v1/connect/dashboard
 * Gerar link para o dashboard Express do Stripe
 */
router.get(
  '/dashboard',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const profile = await prisma.providerProfile.findUnique({
      where: { userId },
    });

    if (!profile?.stripeAccountId) {
      throw new AppError('Stripe account not found. Please complete onboarding first.', 404, 'NO_STRIPE_ACCOUNT');
    }

    if (!profile.stripeOnboardingCompleted) {
      throw new AppError('Please complete Stripe onboarding first', 400, 'ONBOARDING_INCOMPLETE');
    }

    const dashboardUrl = await stripeService.createLoginLink(profile.stripeAccountId);

    res.json({
      success: true,
      data: { dashboardUrl },
    });
  })
);

/**
 * GET /api/v1/connect/balance
 * Obter saldo da conta Connect (para exibir ao provider)
 */
router.get(
  '/balance',
  asyncHandler(async (req: Request, res: Response): Promise<any> => {
    const userId = req.user!.id;

    const profile = await prisma.providerProfile.findUnique({
      where: { userId },
    });

    if (!profile?.stripeAccountId || !profile.stripeOnboardingCompleted) {
      return res.json({
        success: true,
        data: {
          available: 0,
          pending: 0,
          currency: 'usd',
        },
      });
    }

    // Calcular a partir dos pagamentos no banco
    const [received, pending] = await Promise.all([
      prisma.payment.aggregate({
        where: { providerId: userId, status: 'CAPTURED' },
        _sum: { providerAmount: true },
      }),
      prisma.payment.aggregate({
        where: { providerId: userId, status: 'PENDING' },
        _sum: { providerAmount: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        available: Number(received._sum?.providerAmount || 0),
        pending: Number(pending._sum?.providerAmount || 0),
        currency: 'usd',
      },
    });
  })
);

export default router;
