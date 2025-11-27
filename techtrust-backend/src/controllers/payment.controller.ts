/**
 * ============================================
 * PAYMENT CONTROLLER
 * ============================================
 * Gerenciamento de pagamentos
 */

import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error-handler';
import { logger } from '../config/logger';

const MOCK_STRIPE = process.env.MOCK_STRIPE === 'true';

/**
 * POST /api/v1/payments/create-intent
 * Criar payment intent para work order
 */
export const createPaymentIntent = async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const { workOrderId } = req.body;

  const workOrder = await prisma.workOrder.findFirst({
    where: {
      id: workOrderId,
      customerId: customerId,
    },
    include: {
      provider: {
        select: {
          providerProfile: {
            select: {
              stripeAccountId: true,
            },
          },
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

  // Calcular valores
  const serviceAmount = Number(workOrder.finalAmount);
  
  // Comissão da plataforma (15% ou modelo de assinatura)
  const platformFeePercentage = 15; // Pode vir do banco de dados
  const platformFee = (serviceAmount * platformFeePercentage) / 100;
  
  // Taxa do Stripe (2.9% + $0.30)
  const stripeFeePercentage = 2.9;
  const stripeFeeFixed = 0.30;
  const stripeFee = (serviceAmount * stripeFeePercentage) / 100 + stripeFeeFixed;
  
  const totalAmount = serviceAmount + platformFee + stripeFee;
  const providerAmount = serviceAmount - platformFee;

  // Gerar número de pagamento
  const paymentNumber = `PAY-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

  if (MOCK_STRIPE) {
    // MOCK MODE - Simular Stripe
    const payment = await prisma.payment.create({
      data: {
        paymentNumber,
        workOrderId,
        customerId,
        providerId: workOrder.providerId,
        subtotal: serviceAmount,
        platformFee,
        stripeFee,
        totalAmount,
        providerAmount,
        status: 'PENDING',
        stripePaymentIntentId: `mock_pi_${Date.now()}`,
      },
    });

    logger.info(`[MOCK] Payment Intent criado: ${payment.paymentNumber}`);

    return res.json({
      success: true,
      data: {
        paymentId: payment.id,
        paymentNumber: payment.paymentNumber,
        clientSecret: `mock_secret_${Date.now()}`,
        totalAmount,
        breakdown: {
          serviceAmount,
          platformFee,
          stripeFee,
          totalAmount,
          providerWillReceive: providerAmount,
        },
      },
    });
  }

  // REAL STRIPE MODE
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Centavos
      currency: 'usd',
      application_fee_amount: Math.round(platformFee * 100),
      transfer_data: {
        destination: workOrder.provider.providerProfile?.stripeAccountId,
      },
      metadata: {
        workOrderId: workOrder.id,
        orderNumber: workOrder.orderNumber,
      },
    });

    const payment = await prisma.payment.create({
      data: {
        paymentNumber,
        workOrderId,
        customerId,
        providerId: workOrder.providerId,
        subtotal: serviceAmount,
        platformFee,
        stripeFee,
        totalAmount,
        providerAmount,
        status: 'PENDING',
        stripePaymentIntentId: paymentIntent.id,
      },
    });

    logger.info(`Payment Intent criado: ${payment.paymentNumber}`);

    return res.json({
      success: true,
      data: {
        paymentId: payment.id,
        paymentNumber: payment.paymentNumber,
        clientSecret: paymentIntent.client_secret,
        totalAmount,
        breakdown: {
          serviceAmount,
          platformFee,
          stripeFee,
          totalAmount,
          providerWillReceive: providerAmount,
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
 * Confirmar pagamento bem-sucedido
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

  // Atualizar pagamento e work order
  await prisma.$transaction([
    prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'CAPTURED',
      },
    }),
    prisma.workOrder.update({
      where: { id: payment.workOrderId },
      data: {
        status: 'COMPLETED',
      },
    }),
    prisma.serviceRequest.update({
      where: { id: payment.workOrder.serviceRequestId },
      data: {
        status: 'COMPLETED',
      },
    }),
  ]);

  logger.info(`Pagamento confirmado: ${payment.paymentNumber}`);

  res.json({
    success: true,
    message: 'Pagamento confirmado com sucesso!',
  });
};

/**
 * GET /api/v1/payments/history
 * Histórico de pagamentos
 */
export const getPaymentHistory = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const userRole = req.user!.role;

  const where: any = userRole === 'CLIENT' 
    ? { customerId: userId }
    : { providerId: userId };

  const payments = await prisma.payment.findMany({
    where,
    orderBy: {
      createdAt: 'desc',
    },
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
  });

  res.json({
    success: true,
    data: payments,
  });
};