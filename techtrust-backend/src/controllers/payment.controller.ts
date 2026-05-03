/**
 * ============================================
 * PAYMENT CONTROLLER
 * ============================================
 * Gerenciamento de pagamentos via Stripe
 */

import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error-handler';
import { logger } from '../config/logger';
import * as stripeService from '../services/stripe.service';
import { REFUND_RULES, calculateFullFeeBreakdown } from '../config/businessRules';

/**
 * POST /api/v1/payments/create-intent
 * Criar payment intent para work order
 */
export const createPaymentIntent = async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const { workOrderId, paymentMethodId } = req.body;

  const workOrder = await prisma.workOrder.findFirst({
    where: {
      id: workOrderId,
      customerId: customerId,
    },
    include: {
      provider: {
        select: {
          email: true,
          fullName: true,
          providerProfile: {
            select: {
              stripeAccountId: true,
              stripeOnboardingCompleted: true,
              providerLevel: true,
            },
          },
        },
      },
      customer: {
        select: {
          email: true,
          fullName: true,
        },
      },
      quote: {
        select: {
          laborCost: true,
          partsCost: true,
          additionalFees: true,
          travelFee: true,
          diagnosticFee: true,
          shopSuppliesFee: true,
          tireFee: true,
          batteryFee: true,
          taxAmount: true,
          totalAmount: true,
        },
      },
    },
  });

  if (!workOrder) {
    throw new AppError('Ordem não encontrada', 404, 'ORDER_NOT_FOUND');
  }

  if (workOrder.status !== 'AWAITING_APPROVAL') {
    throw new AppError('Pagamento só pode ser feito após aprovação do serviço', 400, 'INVALID_STATUS');
  }

  // Verificar se já existe um pagamento pendente para esta ordem
  const existingPayment = await prisma.payment.findFirst({
    where: { workOrderId, status: 'PENDING' },
  });

  if (existingPayment) {
    // Retornar o existente se ainda é válido
    return res.json({
      success: true,
      data: {
        paymentId: existingPayment.id,
        paymentNumber: existingPayment.paymentNumber,
        clientSecret: null, // Cliente deve usar o PaymentIntent existente
        totalAmount: Number(existingPayment.totalAmount),
        breakdown: {
          serviceAmount: Number(existingPayment.subtotal),
          platformFee: Number(existingPayment.platformFee),
          processingFee: Number(existingPayment.processingFee),
          totalAmount: Number(existingPayment.totalAmount),
          providerWillReceive: Number(existingPayment.providerAmount),
        },
        existing: true,
      },
    });
  }

  // Calcular valores com sistema de comissão tiered
  const serviceAmount = Number(workOrder.finalAmount);
  const quote = workOrder.quote;
  const laborAmount = quote ? Number(quote.laborCost) : serviceAmount;
  const partsAmount = quote ? Number(quote.partsCost) : 0;
  const additionalFees = quote ? Number(quote.additionalFees || 0) : 0;

  // Provider level para comissão tiered
  const providerLevel = (workOrder.provider.providerProfile?.providerLevel || 'ENTRY') as any;

  // Client plan para appServiceFee
  const subscription = await prisma.subscription.findFirst({
    where: { userId: customerId, status: 'ACTIVE' },
    select: { plan: true },
  });
  const clientPlan = subscription?.plan || 'FREE';

  const fees = calculateFullFeeBreakdown({
    laborAmount,
    partsAmount,
    additionalFees,
    travelFee: quote ? Number(quote.travelFee || 0) : 0,
    diagnosticFee: quote ? Number(quote.diagnosticFee || 0) : 0,
    shopSuppliesFee: quote ? Number(quote.shopSuppliesFee || 0) : 0,
    tireFee: quote ? Number(quote.tireFee || 0) : 0,
    batteryFee: quote ? Number(quote.batteryFee || 0) : 0,
    taxAmount: quote ? Number(quote.taxAmount || 0) : 0,
    quoteTotal: serviceAmount,
    clientPlan,
    providerLevel,
    processor: 'STRIPE',
  });

  // fees.totalPlatformCommission, fees.totalClientPays, fees.providerReceives used directly below

  // Gerar número de pagamento
  const paymentNumber = `PAY-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

  try {
    // Obter ou criar Stripe Customer
    const stripeCustomerId = await stripeService.getOrCreateCustomer({
      userId: customerId,
      email: workOrder.customer.email,
      name: workOrder.customer.fullName,
    });

    // Verificar se provider tem Stripe Connect configurado
    const providerStripeAccountId = workOrder.provider.providerProfile?.stripeOnboardingCompleted
      ? workOrder.provider.providerProfile.stripeAccountId
      : null;

    // Buscar método de pagamento do Stripe se fornecido
    let stripePaymentMethodId: string | undefined;
    if (paymentMethodId) {
      const paymentMethod = await prisma.paymentMethod.findFirst({
        where: { id: paymentMethodId, userId: customerId, isActive: true },
      });
      if (paymentMethod?.stripePaymentMethodId) {
        stripePaymentMethodId = paymentMethod.stripePaymentMethodId;
      }
    }

    // Criar PaymentIntent via Stripe Service
    const result = await stripeService.createPaymentIntent({
      amount: fees.stripeChargeAmountCents,
      customerId: stripeCustomerId,
      paymentMethodId: stripePaymentMethodId,
      providerStripeAccountId: providerStripeAccountId,
      platformFeeAmount: fees.stripeApplicationFeeCents,
      metadata: {
        workOrderId: workOrder.id,
        orderNumber: workOrder.orderNumber,
        customerId,
        providerId: workOrder.providerId,
      },
      description: `TechTrust - Order ${workOrder.orderNumber}`,
    });

    // Salvar no banco
    const payment = await prisma.payment.create({
      data: {
        paymentNumber,
        workOrderId,
        customerId,
        providerId: workOrder.providerId,
        paymentProcessor: 'STRIPE',
        subtotal: serviceAmount,
        platformFee: fees.totalPlatformCommission,
        processingFee: fees.processorFee,
        totalAmount: fees.totalClientPays,
        providerAmount: fees.providerReceives,
        appServiceFee: fees.appServiceFee,
        serviceCommission: fees.serviceCommission,
        serviceCommissionPercent: fees.serviceCommissionPercent,
        partsFee: fees.partsFee,
        status: 'PENDING',
        stripePaymentIntentId: result.paymentIntentId,
        paymentMethodId: paymentMethodId || null,
      },
    });

    logger.info(`Payment Intent criado: ${payment.paymentNumber} (${result.paymentIntentId})`);

    return res.json({
      success: true,
      data: {
        paymentId: payment.id,
        paymentNumber: payment.paymentNumber,
        clientSecret: result.clientSecret,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        totalAmount: fees.totalClientPays,
        breakdown: {
          quoteTotal: serviceAmount,
          serviceCommissionPercent: fees.serviceCommissionPercent,
          serviceCommission: fees.serviceCommission,
          partsFee: fees.partsFee,
          totalPlatformCommission: fees.totalPlatformCommission,
          appServiceFee: fees.appServiceFee,
          processorFee: fees.processorFee,
          totalClientPays: fees.totalClientPays,
          providerWillReceive: fees.providerReceives,
        },
      },
    });
  } catch (error: any) {
    logger.error('Erro ao criar Payment Intent:', error);
    throw new AppError(`Erro ao processar pagamento: ${error.message}`, 500, 'PAYMENT_ERROR');
  }
};

/**
 * POST /api/v1/payments/:paymentId/confirm
 * Confirmar pagamento — verifica com Stripe API
 */
export const confirmPayment = async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const { paymentId } = req.params;

  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      customerId: customerId,
    },
    include: {
      workOrder: true,
    },
  });

  if (!payment) {
    throw new AppError('Pagamento não encontrado', 404, 'PAYMENT_NOT_FOUND');
  }

  if (payment.status !== 'PENDING') {
    throw new AppError('Pagamento já foi processado', 400, 'ALREADY_PROCESSED');
  }

  // Verificar com Stripe se o pagamento foi autorizado (pré-autorização)
  try {
    const stripeResult = await stripeService.confirmPaymentIntent(payment.stripePaymentIntentId);

    // Com pré-autorização, status após autorização é 'requires_capture'
    if (stripeResult.status !== 'requires_capture' && stripeResult.status !== 'succeeded') {
      res.json({
        success: false,
        message: `Payment status: ${stripeResult.status}. Please complete the payment.`,
        data: {
          stripeStatus: stripeResult.status,
        },
      });
      return;
    }

    // Pagamento autorizado! Atualizar para AUTHORIZED (hold ativo)
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'AUTHORIZED',
          authorizedAt: new Date(),
          stripeChargeId: stripeResult.chargeId || null,
        },
      }),
      // Work order fica IN_PROGRESS até captura
      prisma.workOrder.update({
        where: { id: payment.workOrderId },
        data: { status: 'IN_PROGRESS' },
      }),
    ]);

    // Notificar provider que pagamento foi autorizado
    await prisma.notification.create({
      data: {
        userId: payment.providerId,
        type: 'PAYMENT_RECEIVED',
        title: 'Payment Authorized',
        message: `Payment of $${Number(payment.providerAmount).toFixed(2)} authorized for order ${payment.workOrder.orderNumber}. Funds will be captured upon service completion.`,
        data: {
          paymentId: payment.id,
          amount: Number(payment.providerAmount),
        },
      },
    });

    logger.info(`Pagamento autorizado (hold): ${payment.paymentNumber}`);

    res.json({
      success: true,
      message: 'Payment authorized! Funds are on hold until service completion.',
      data: {
        status: 'AUTHORIZED',
        stripeStatus: stripeResult.status,
      },
    });
  } catch (error: any) {
    logger.error(`Erro ao confirmar pagamento ${paymentId}:`, error);
    throw new AppError(`Error verifying payment: ${error.message}`, 500, 'VERIFICATION_ERROR');
  }
};

/**
 * GET /api/v1/payments/history
 * Histórico de pagamentos
 */
export const getPaymentHistory = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const userRole = req.user!.role;
  const { page = 1, limit = 20, status } = req.query;

  const where: any = userRole === 'CLIENT' 
    ? { customerId: userId }
    : { providerId: userId };

  if (status) {
    where.status = status;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        workOrder: {
          select: {
            orderNumber: true,
            serviceRequest: {
              select: {
                title: true,
                vehicle: {
                  select: {
                    plateNumber: true,
                    make: true,
                    model: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.payment.count({ where }),
  ]);

  res.json({
    success: true,
    data: payments.map((p) => {
      const subtotal        = Number(p.subtotal        || 0);
      const salesTaxAmount  = Number((p as any).salesTaxAmount  || 0);
      const appServiceFee   = Number((p as any).appServiceFee   || 0);
      const processingFee   = Number(p.processingFee   || 0);
      const serviceCommission = Number((p as any).serviceCommission || 0);
      const partsFee        = Number((p as any).partsFee        || 0);
      const platformFee     = Number(p.platformFee     || 0);
      const totalAmount     = Number(p.totalAmount     || 0);
      const providerAmount  = Number(p.providerAmount  || 0);
      return {
        ...p,
        subtotal,
        platformFee,
        processingFee,
        totalAmount,
        providerAmount,
        refundAmount: p.refundAmount ? Number(p.refundAmount) : null,
        // Detailed fee breakdown for client-facing receipt display
        breakdown: {
          serviceSubtotal:    subtotal,
          salesTax:           salesTaxAmount,
          salesTaxRate:       Number((p as any).salesTaxRate || 0),
          salesTaxCounty:     (p as any).salesTaxCounty || null,
          appServiceFee,
          processingFee,
          totalClientPays:    totalAmount,
          // Provider-side (informational)
          serviceCommission,
          partsFee,
          platformFee,
          providerWillReceive: providerAmount,
        },
      };
    }),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
};

/**
 * POST /api/v1/payments/:paymentId/refund
 * Solicitar reembolso
 */
export const requestRefund = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { paymentId } = req.params;
  const { reason } = req.body;

  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      customerId: userId,
      status: 'CAPTURED',
    },
  });

  if (!payment) {
    throw new AppError('Payment not found or not eligible for refund', 404, 'NOT_FOUND');
  }

  // Verificar se foi pago há menos de 48 horas (conforme DISPUTE_RULES)
  const hoursSincePayment = Math.floor(
    (Date.now() - payment.capturedAt!.getTime()) / (1000 * 60 * 60)
  );

  if (hoursSincePayment > REFUND_RULES.REFUND_WINDOW_HOURS) {
    throw new AppError(`Refund window has expired (${REFUND_RULES.REFUND_WINDOW_HOURS} hours). Please open a dispute instead.`, 400, 'REFUND_EXPIRED');
  }

  try {
    const refundResult = await stripeService.createRefund({
      paymentIntentId: payment.stripePaymentIntentId,
      reason: 'requested_by_customer',
    });

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'REFUNDED',
        refundedAt: new Date(),
        refundAmount: Number(payment.totalAmount),
        refundReason: reason || 'Customer requested refund',
      },
    });

    logger.info(`Refund processado: ${payment.paymentNumber} (${refundResult.refundId})`);

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: { refundId: refundResult.refundId },
    });
  } catch (error: any) {
    logger.error(`Erro ao processar refund para ${paymentId}:`, error);
    throw new AppError(`Refund error: ${error.message}`, 500, 'REFUND_ERROR');
  }
};

/**
 * POST /api/v1/payments/setup-intent
 * Criar SetupIntent para salvar cartão de forma segura (PCI compliant)
 */
export const createSetupIntent = async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, fullName: true },
  });

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Buscar stripeCustomerId existente
  const existingSub = await prisma.subscription.findFirst({
    where: { userId },
    select: { stripeCustomerId: true },
  });

  const stripeCustomerId = await stripeService.getOrCreateCustomer({
    userId,
    email: user.email,
    name: user.fullName,
    existingStripeCustomerId: existingSub?.stripeCustomerId,
  });

  const setupIntent = await stripeService.createSetupIntent(stripeCustomerId);

  res.json({
    success: true,
    data: {
      clientSecret: setupIntent.clientSecret,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      stripeCustomerId,
    },
  });
};

/**
 * POST /api/v1/payments/:paymentId/capture
 * Capturar pagamento pré-autorizado (hold → cobrança real)
 * Chamado quando o serviço é concluído
 */
export const capturePayment = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { paymentId } = req.params;

  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      status: 'AUTHORIZED',
    },
    include: {
      workOrder: true,
    },
  });

  if (!payment) {
    throw new AppError('Authorized payment not found', 404, 'NOT_FOUND');
  }

  // Apenas o provider responsável ou admin pode capturar
  // Cliente NÃO pode capturar — evita cobrança prematura antes da conclusão do serviço
  const userRole = req.user!.role;
  if (userRole !== 'ADMIN' && (userRole !== 'PROVIDER' || payment.providerId !== userId)) {
    throw new AppError('Only the assigned provider or admin can capture this payment', 403, 'FORBIDDEN');
  }

  try {
    // Capturar o hold no Stripe
    const captureResult = await stripeService.capturePaymentIntent(
      payment.stripePaymentIntentId
    );

    if (captureResult.status !== 'succeeded') {
      throw new AppError(`Capture failed with status: ${captureResult.status}`, 500, 'CAPTURE_FAILED');
    }

    // Atualizar pagamento, work order e service request
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'CAPTURED',
          capturedAt: new Date(),
          stripeChargeId: captureResult.chargeId || payment.stripeChargeId,
        },
      }),
      prisma.workOrder.update({
        where: { id: payment.workOrderId },
        data: { status: 'COMPLETED' },
      }),
      prisma.serviceRequest.update({
        where: { id: payment.workOrder.serviceRequestId },
        data: { status: 'COMPLETED' },
      }),
    ]);

    // Notificar customer
    await prisma.notification.create({
      data: {
        userId: payment.customerId,
        type: 'PAYMENT_RECEIVED',
        title: 'Payment Captured',
        message: `Your payment of $${Number(payment.totalAmount).toFixed(2)} for order ${payment.workOrder.orderNumber} has been charged. The service is completed.`,
        data: {
          paymentId: payment.id,
          amount: Number(payment.totalAmount),
        },
      },
    });

    // Notificar provider
    await prisma.notification.create({
      data: {
        userId: payment.providerId,
        type: 'PAYMENT_RECEIVED',
        title: 'Payment Received',
        message: `Payment of $${Number(payment.providerAmount).toFixed(2)} has been captured for order ${payment.workOrder.orderNumber}. Funds will be transferred to your account.`,
        data: {
          paymentId: payment.id,
          amount: Number(payment.providerAmount),
        },
      },
    });

    logger.info(`Payment captured: ${payment.paymentNumber}`);

    res.json({
      success: true,
      message: 'Payment captured successfully. Service completed.',
    });
  } catch (error: any) {
    logger.error(`Error capturing payment ${paymentId}:`, error);
    throw new AppError(`Capture error: ${error.message}`, 500, 'CAPTURE_ERROR');
  }
};

/**
 * POST /api/v1/payments/:paymentId/void
 * Cancelar pré-autorização (liberar hold sem cobrar)
 * Para quando o serviço é cancelado antes da captura
 */
export const voidPayment = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { paymentId } = req.params;
  const { reason } = req.body;

  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      status: 'AUTHORIZED',
    },
    include: { workOrder: true },
  });

  if (!payment) {
    throw new AppError('Authorized payment not found', 404, 'NOT_FOUND');
  }

  // Customer, provider ou admin podem cancelar hold
  const userRole = req.user!.role;
  if (userRole !== 'ADMIN' && payment.customerId !== userId && payment.providerId !== userId) {
    throw new AppError('Not authorized to void this payment', 403, 'FORBIDDEN');
  }

  try {
    // Cancelar PaymentIntent no Stripe (libera o hold)
    await stripeService.cancelPaymentIntentIdempotent(payment.stripePaymentIntentId);

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'CANCELLED',
        refundReason: reason || 'Service cancelled - hold released',
      },
    });

    logger.info(`Payment voided (hold released): ${payment.paymentNumber}`);

    res.json({
      success: true,
      message: 'Payment authorization voided. Hold has been released.',
    });
  } catch (error: any) {
    logger.error(`Error voiding payment ${paymentId}:`, error);
    throw new AppError(`Void error: ${error.message}`, 500, 'VOID_ERROR');
  }
};
