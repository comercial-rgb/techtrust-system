/**
 * ============================================
 * SERVICE FLOW CONTROLLER
 * ============================================
 * Controlador principal do fluxo de pagamento completo:
 *
 * 1. Cliente aprova orçamento → verificar método de pagamento → criar hold
 * 2. Fornecedor solicita suplemento → notificar cliente → hold adicional
 * 3. Cliente desiste → validação com fornecedor → cancelamento condicional
 * 4. Fornecedor finaliza → upload fotos → notificar cliente
 * 5. Cliente aprova serviço → aceitar termos + fraud disclaimer → capturar pagamento
 * 6. Gerar recibo → processar pagamento final
 * 7. Comparar processadores (Stripe vs Chase) para melhor taxa
 */

import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error-handler';
import { logger } from '../config/logger';
import * as stripeService from '../services/stripe.service';
import * as receiptService from '../services/receipt.service';
import {
  PAYMENT_RULES,
  CANCELLATION_RULES,
  SUPPLEMENT_RULES,
  SERVICE_FLOW,
  calculateProcessorFee,
  calculateCancellationFee,
  compareProcessorFees,
} from '../config/businessRules';

// ============================================
// 1. APROVAÇÃO DE ORÇAMENTO + HOLD NO CARTÃO
// ============================================

/**
 * POST /api/v1/service-flow/approve-quote
 * Cliente aprova orçamento: verifica pagamento, cria hold
 */
export const approveQuoteWithPaymentHold = async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const { quoteId, paymentMethodId, paymentProcessor = 'STRIPE' } = req.body;

  // 1. Buscar e validar orçamento
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      serviceRequest: {
        include: { vehicle: true },
      },
      provider: {
        select: {
          id: true,
          email: true,
          fullName: true,
          providerProfile: {
            select: {
              stripeAccountId: true,
              stripeOnboardingCompleted: true,
              businessName: true,
            },
          },
        },
      },
    },
  });

  if (!quote) throw new AppError('Orçamento não encontrado', 404, 'QUOTE_NOT_FOUND');
  if (quote.serviceRequest.userId !== customerId) {
    throw new AppError('Sem permissão', 403, 'FORBIDDEN');
  }
  if (quote.status !== 'PENDING') {
    throw new AppError('Este orçamento não está mais disponível', 400, 'QUOTE_NOT_AVAILABLE');
  }
  if (new Date() > quote.validUntil) {
    throw new AppError('Orçamento expirou', 400, 'QUOTE_EXPIRED');
  }

  // 2. Verificar método de pagamento válido
  const paymentMethod = await prisma.paymentMethod.findFirst({
    where: { id: paymentMethodId, userId: customerId, isActive: true },
  });

  if (!paymentMethod) {
    throw new AppError(
      'Método de pagamento necessário. Adicione um cartão de crédito ou débito válido.',
      400,
      'PAYMENT_METHOD_REQUIRED'
    );
  }

  if (!paymentMethod.stripePaymentMethodId && paymentProcessor === 'STRIPE') {
    throw new AppError(
      'Método de pagamento não vinculado ao processador. Adicione novamente.',
      400,
      'PAYMENT_METHOD_INVALID'
    );
  }

  // 3. Buscar dados do cliente
  const customer = await prisma.user.findUnique({
    where: { id: customerId },
    select: { email: true, fullName: true },
  });
  if (!customer) throw new AppError('Usuário não encontrado', 404, 'USER_NOT_FOUND');

  // 4. Calcular valores
  const serviceAmount = Number(quote.totalAmount);
  const platformFee = (serviceAmount * PAYMENT_RULES.PLATFORM_FEE_PERCENT) / 100;
  const cardType = (paymentMethod.type as 'credit' | 'debit') || 'credit';
  const processorFee = calculateProcessorFee(serviceAmount, paymentProcessor as 'STRIPE' | 'CHASE', cardType);
  const totalAmount = serviceAmount + platformFee + processorFee.feeAmount;
  const providerAmount = serviceAmount - platformFee;

  try {
    // 5. Criar customer no Stripe se necessário
    const stripeCustomerId = await stripeService.getOrCreateCustomer({
      userId: customerId,
      email: customer.email,
      name: customer.fullName,
    });

    const providerStripeAccountId = quote.provider.providerProfile?.stripeOnboardingCompleted
      ? quote.provider.providerProfile.stripeAccountId
      : null;

    // 6. Criar HOLD (pré-autorização) no cartão
    const holdResult = await stripeService.createPaymentIntent({
      amount: Math.round(totalAmount * 100),
      customerId: stripeCustomerId,
      paymentMethodId: paymentMethod.stripePaymentMethodId || undefined,
      providerStripeAccountId: providerStripeAccountId,
      platformFeeAmount: Math.round(platformFee * 100),
      captureMethod: 'manual', // PRÉ-AUTORIZAÇÃO
      metadata: {
        quoteId: quote.id,
        serviceRequestId: quote.serviceRequestId,
        customerId,
        providerId: quote.providerId,
        type: 'SERVICE',
      },
      description: `TechTrust - ${quote.serviceRequest.title}`,
    });

    // 7. Confirmar o PaymentIntent para criar o hold efetivo
    const confirmResult = await stripeService.confirmPaymentIntent(holdResult.paymentIntentId);

    // 8. Transaction: aceitar quote + criar work order + criar payment
    const paymentNumber = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const orderNumber = `WO-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const result = await prisma.$transaction(async (tx) => {
      // Aceitar orçamento
      await tx.quote.update({
        where: { id: quoteId },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      });

      // Rejeitar outros
      await tx.quote.updateMany({
        where: {
          serviceRequestId: quote.serviceRequestId,
          id: { not: quoteId },
          status: 'PENDING',
        },
        data: { status: 'REJECTED', rejectedAt: new Date() },
      });

      // Atualizar service request
      await tx.serviceRequest.update({
        where: { id: quote.serviceRequestId },
        data: { status: 'QUOTE_ACCEPTED', acceptedQuoteId: quoteId },
      });

      // Criar work order com status PAYMENT_HOLD
      const workOrder = await tx.workOrder.create({
        data: {
          orderNumber,
          serviceRequestId: quote.serviceRequestId,
          quoteId: quote.id,
          customerId,
          providerId: quote.providerId,
          vehicleId: quote.serviceRequest.vehicleId,
          status: SERVICE_FLOW.STATUSES.PAYMENT_HOLD,
          originalAmount: quote.totalAmount,
          finalAmount: quote.totalAmount,
          warrantyMonths: quote.warrantyMonths,
          warrantyMileage: quote.warrantyMileage,
        },
      });

      // Criar payment com status AUTHORIZED
      const payment = await tx.payment.create({
        data: {
          paymentNumber,
          workOrderId: workOrder.id,
          customerId,
          providerId: quote.providerId,
          paymentProcessor: paymentProcessor as any,
          stripePaymentIntentId: holdResult.paymentIntentId,
          stripeChargeId: confirmResult.chargeId || null,
          subtotal: serviceAmount,
          platformFee,
          processingFee: processorFee.feeAmount,
          totalAmount,
          providerAmount,
          status: 'AUTHORIZED',
          authorizedAt: new Date(),
          paymentMethodId: paymentMethodId,
          cardLast4: paymentMethod.cardLast4,
          cardBrand: paymentMethod.cardBrand,
          cardType: paymentMethod.type,
          paymentType: 'SERVICE',
        },
      });

      return { workOrder, payment };
    });

    // 9. Notificar fornecedor
    await prisma.notification.create({
      data: {
        userId: quote.providerId,
        type: 'QUOTE_ACCEPTED',
        title: 'Quote Accepted!',
        message: `${customer.fullName} accepted your quote for "${quote.serviceRequest.title}". Payment of $${serviceAmount.toFixed(2)} has been authorized. You can start the service.`,
        relatedQuoteId: quoteId,
        relatedWorkOrderId: result.workOrder.id,
        data: JSON.stringify({
          workOrderId: result.workOrder.id,
          amount: serviceAmount,
          orderNumber,
        }),
      },
    });

    logger.info(`Quote approved with payment hold: ${quote.quoteNumber} → WO: ${orderNumber} → PAY: ${paymentNumber}`);

    return res.json({
      success: true,
      message: 'Orçamento aprovado! Pagamento autorizado (hold no cartão).',
      data: {
        workOrder: {
          id: result.workOrder.id,
          orderNumber,
          status: SERVICE_FLOW.STATUSES.PAYMENT_HOLD,
        },
        payment: {
          id: result.payment.id,
          paymentNumber,
          status: 'AUTHORIZED',
          breakdown: {
            serviceAmount,
            platformFee,
            processingFee: processorFee.feeAmount,
            totalAmount,
            providerWillReceive: providerAmount,
          },
        },
        holdInfo: {
          message: 'Funds have been placed on hold on your card. They will only be charged when the service is completed and approved.',
          expiresInDays: PAYMENT_RULES.HOLD_EXPIRY_DAYS,
        },
      },
    });
  } catch (error: any) {
    logger.error('Error creating payment hold on quote approval:', error);

    // Se o hold falhou, informar cliente sobre fundos insuficientes
    if (error.code === 'card_declined' || error.type === 'StripeCardError') {
      throw new AppError(
        'Insufficient funds or card declined. Please add another payment method with sufficient funds.',
        402,
        'INSUFFICIENT_FUNDS'
      );
    }

    throw new AppError(`Payment error: ${error.message}`, 500, 'PAYMENT_ERROR');
  }
};

// ============================================
// 2. SUPLEMENTO DE VALOR
// ============================================

/**
 * POST /api/v1/service-flow/request-supplement
 * Fornecedor solicita valor adicional durante o serviço
 */
export const requestSupplement = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const { workOrderId, description, additionalAmount, additionalParts, additionalLabor, reason } = req.body;

  const workOrder = await prisma.workOrder.findFirst({
    where: { id: workOrderId, providerId },
    include: {
      customer: { select: { id: true, fullName: true } },
      quote: { select: { totalAmount: true } },
    },
  });

  if (!workOrder) throw new AppError('Ordem não encontrada', 404, 'ORDER_NOT_FOUND');
  if (workOrder.status !== SERVICE_FLOW.STATUSES.IN_PROGRESS) {
    throw new AppError('Suplemento só pode ser solicitado com serviço em andamento', 400, 'INVALID_STATUS');
  }

  const supplementNumber = `SUP-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const supplement = await prisma.paymentSupplement.create({
    data: {
      supplementNumber,
      workOrderId,
      requestedByProviderId: providerId,
      description,
      additionalAmount,
      additionalParts: additionalParts || [],
      additionalLabor: additionalLabor || 0,
      reason,
      status: 'REQUESTED',
    },
  });

  // Atualizar status da work order
  await prisma.workOrder.update({
    where: { id: workOrderId },
    data: { status: SERVICE_FLOW.STATUSES.SUPPLEMENT_REQUESTED },
  });

  // Notificar cliente
  await prisma.notification.create({
    data: {
      userId: workOrder.customerId,
      type: 'SUPPLEMENT_REQUESTED',
      title: 'Additional Service Requested',
      message: `The provider needs additional work: ${description}. Additional cost: $${Number(additionalAmount).toFixed(2)}. Please approve or decline.`,
      relatedWorkOrderId: workOrderId,
      data: JSON.stringify({
        supplementId: supplement.id,
        additionalAmount: Number(additionalAmount),
        description,
        timeoutHours: SUPPLEMENT_RULES.CUSTOMER_RESPONSE_TIMEOUT_HOURS,
      }),
    },
  });

  logger.info(`Supplement requested: ${supplementNumber} for WO ${workOrder.id}`);

  return res.json({
    success: true,
    message: 'Suplemento solicitado. Cliente será notificado.',
    data: {
      supplementId: supplement.id,
      supplementNumber,
      status: 'REQUESTED',
      customerResponseTimeout: `${SUPPLEMENT_RULES.CUSTOMER_RESPONSE_TIMEOUT_HOURS} hours`,
    },
  });
};

/**
 * POST /api/v1/service-flow/respond-supplement
 * Cliente aprova ou rejeita suplemento
 */
export const respondToSupplement = async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const { supplementId, approved, note, paymentMethodId } = req.body;

  const supplement = await prisma.paymentSupplement.findFirst({
    where: { id: supplementId, status: 'REQUESTED' },
    include: {
      workOrder: {
        include: {
          customer: { select: { email: true, fullName: true } },
          provider: {
            select: {
              providerProfile: {
                select: { stripeAccountId: true, stripeOnboardingCompleted: true },
              },
            },
          },
          payments: { where: { status: 'AUTHORIZED', paymentType: 'SERVICE' }, take: 1 },
        },
      },
    },
  });

  if (!supplement) throw new AppError('Suplemento não encontrado', 404, 'NOT_FOUND');
  if (supplement.workOrder.customerId !== customerId) throw new AppError('Sem permissão', 403, 'FORBIDDEN');

  if (!approved) {
    // Cliente rejeitou → prosseguir com orçamento original
    await prisma.$transaction([
      prisma.paymentSupplement.update({
        where: { id: supplementId },
        data: {
          status: 'REJECTED',
          rejectedByCustomerAt: new Date(),
          customerNote: note,
          proceedWithOriginal: true,
        },
      }),
      prisma.workOrder.update({
        where: { id: supplement.workOrderId },
        data: { status: SERVICE_FLOW.STATUSES.IN_PROGRESS },
      }),
    ]);

    // Notificar fornecedor
    await prisma.notification.create({
      data: {
        userId: supplement.requestedByProviderId,
        type: 'SUPPLEMENT_REJECTED',
        title: 'Supplement Declined',
        message: `Customer declined the additional work ($${Number(supplement.additionalAmount).toFixed(2)}). Please continue with the original scope.`,
        relatedWorkOrderId: supplement.workOrderId,
      },
    });

    return res.json({
      success: true,
      message: 'Suplemento rejeitado. Serviço continua com orçamento original.',
    });
  }

  // Cliente aprovou → tentar criar hold adicional
  const additionalAmount = Number(supplement.additionalAmount);
  const platformFee = (additionalAmount * PAYMENT_RULES.PLATFORM_FEE_PERCENT) / 100;
  const processorFee = calculateProcessorFee(additionalAmount, 'STRIPE');
  const totalAdditional = additionalAmount + platformFee + processorFee.feeAmount;

  try {
    // Buscar ou criar customer Stripe
    const existingPayment = supplement.workOrder.payments[0];
    const customer = supplement.workOrder.customer;

    const stripeCustomerId = await stripeService.getOrCreateCustomer({
      userId: customerId,
      email: customer.email,
      name: customer.fullName,
    });

    let stripePaymentMethodId: string | undefined;
    if (paymentMethodId) {
      const pm = await prisma.paymentMethod.findFirst({
        where: { id: paymentMethodId, userId: customerId, isActive: true },
      });
      stripePaymentMethodId = pm?.stripePaymentMethodId || undefined;
    }

    const providerStripeAccountId = supplement.workOrder.provider.providerProfile?.stripeOnboardingCompleted
      ? supplement.workOrder.provider.providerProfile.stripeAccountId
      : null;

    // Criar hold para suplemento
    const holdResult = await stripeService.createPaymentIntent({
      amount: Math.round(totalAdditional * 100),
      customerId: stripeCustomerId,
      paymentMethodId: stripePaymentMethodId,
      providerStripeAccountId,
      platformFeeAmount: Math.round(platformFee * 100),
      captureMethod: 'manual',
      metadata: {
        workOrderId: supplement.workOrderId,
        supplementId: supplement.id,
        type: 'SUPPLEMENT',
      },
      description: `TechTrust - Supplement: ${supplement.description}`,
    });

    // Confirmar o hold
    await stripeService.confirmPaymentIntent(holdResult.paymentIntentId);

    // Atualizar suplemento e work order
    await prisma.$transaction([
      prisma.paymentSupplement.update({
        where: { id: supplementId },
        data: {
          status: 'HOLD_PLACED',
          approvedByCustomerAt: new Date(),
          customerNote: note,
          stripePaymentIntentId: holdResult.paymentIntentId,
          holdPlacedAt: new Date(),
          holdAmount: totalAdditional,
        },
      }),
      prisma.workOrder.update({
        where: { id: supplement.workOrderId },
        data: {
          status: SERVICE_FLOW.STATUSES.IN_PROGRESS,
          additionalAmount: { increment: additionalAmount },
          finalAmount: { increment: additionalAmount },
        },
      }),
    ]);

    // Criar payment record para o suplemento
    const paymentNumber = `PAY-SUP-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    await prisma.payment.create({
      data: {
        paymentNumber,
        workOrderId: supplement.workOrderId,
        customerId,
        providerId: supplement.requestedByProviderId,
        paymentProcessor: 'STRIPE',
        stripePaymentIntentId: holdResult.paymentIntentId,
        subtotal: additionalAmount,
        platformFee,
        processingFee: processorFee.feeAmount,
        totalAmount: totalAdditional,
        providerAmount: additionalAmount - platformFee,
        status: 'AUTHORIZED',
        authorizedAt: new Date(),
        paymentType: 'SUPPLEMENT',
        parentPaymentId: existingPayment?.id,
      },
    });

    // Notificar fornecedor
    await prisma.notification.create({
      data: {
        userId: supplement.requestedByProviderId,
        type: 'SUPPLEMENT_APPROVED',
        title: 'Supplement Approved!',
        message: `Customer approved additional work ($${additionalAmount.toFixed(2)}). Payment has been authorized. You can proceed.`,
        relatedWorkOrderId: supplement.workOrderId,
      },
    });

    logger.info(`Supplement approved and hold placed: ${supplement.supplementNumber}`);

    return res.json({
      success: true,
      message: 'Suplemento aprovado! Valor adicional autorizado no cartão.',
      data: {
        supplementId: supplement.id,
        holdAmount: totalAdditional,
        newWorkOrderTotal: additionalAmount,
      },
    });
  } catch (error: any) {
    // Hold falhou - fundos insuficientes
    logger.error(`Supplement hold failed: ${error.message}`);

    await prisma.paymentSupplement.update({
      where: { id: supplementId },
      data: {
        status: 'HOLD_FAILED',
        holdFailedReason: error.message,
        approvedByCustomerAt: new Date(),
        customerNote: note,
      },
    });

    // Notificar cliente sobre fundos insuficientes
    await prisma.notification.create({
      data: {
        userId: customerId,
        type: 'INSUFFICIENT_FUNDS',
        title: 'Insufficient Funds',
        message: `Unable to place hold for the additional amount ($${additionalAmount.toFixed(2)}). Please add funds or another payment method. The service will continue with the original quote.`,
        relatedWorkOrderId: supplement.workOrderId,
      },
    });

    // Continuar com orçamento original
    await prisma.workOrder.update({
      where: { id: supplement.workOrderId },
      data: { status: SERVICE_FLOW.STATUSES.IN_PROGRESS },
    });

    return res.status(402).json({
      success: false,
      message: 'Fundos insuficientes para o suplemento. Serviço continua com orçamento original.',
      code: 'INSUFFICIENT_FUNDS',
      data: {
        supplementId: supplement.id,
        proceedWithOriginal: true,
      },
    });
  }
};

// ============================================
// 3. CANCELAMENTO COM VALIDAÇÃO DO FORNECEDOR
// ============================================

/**
 * POST /api/v1/service-flow/request-cancellation
 * Cliente solicita cancelamento do serviço
 */
export const requestCancellation = async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const { workOrderId, reason } = req.body;

  const workOrder = await prisma.workOrder.findFirst({
    where: { id: workOrderId, customerId },
    include: {
      quote: { select: { acceptedAt: true, totalAmount: true } },
      payments: { where: { status: { in: ['AUTHORIZED', 'PENDING'] } } },
    },
  });

  if (!workOrder) throw new AppError('Ordem não encontrada', 404, 'ORDER_NOT_FOUND');

  const completedStatuses = ['COMPLETED', 'CANCELLED'];
  if (completedStatuses.includes(workOrder.status)) {
    throw new AppError('Não é possível cancelar uma ordem já finalizada', 400, 'INVALID_STATUS');
  }

  // Se serviço já iniciou → requer validação do fornecedor
  const serviceStarted = !!workOrder.startedAt;

  if (serviceStarted) {
    // Criar request de cancelamento pendente de validação
    const cancellationRequest = await prisma.cancellationRequest.create({
      data: {
        workOrderId,
        requestedByCustomerId: customerId,
        reason,
        status: 'PENDING_PROVIDER_VALIDATION',
      },
    });

    // Notificar fornecedor
    await prisma.notification.create({
      data: {
        userId: workOrder.providerId,
        type: 'CANCELLATION_REQUESTED',
        title: 'Cancellation Request',
        message: `Customer is requesting to cancel the service. Please confirm if any work has been performed or costs incurred. You have ${CANCELLATION_RULES.PROVIDER_VALIDATION_TIMEOUT_HOURS}h to respond.`,
        relatedWorkOrderId: workOrderId,
        data: JSON.stringify({
          cancellationRequestId: cancellationRequest.id,
          timeoutHours: CANCELLATION_RULES.PROVIDER_VALIDATION_TIMEOUT_HOURS,
        }),
      },
    });

    logger.info(`Cancellation request created (pending provider validation): WO ${workOrder.id}`);

    return res.json({
      success: true,
      message: 'Solicitação de cancelamento enviada. Aguardando validação do fornecedor.',
      data: {
        cancellationRequestId: cancellationRequest.id,
        status: 'PENDING_PROVIDER_VALIDATION',
        providerTimeoutHours: CANCELLATION_RULES.PROVIDER_VALIDATION_TIMEOUT_HOURS,
        note: 'Since the service has already started, the provider must confirm if any work was performed or costs incurred before the cancellation can proceed.',
      },
    });
  }

  // Serviço não iniciou → calcular taxa e processar
  const { feePercent, feeAmount } = calculateCancellationFee(
    Number(workOrder.finalAmount),
    false,
    workOrder.quote?.acceptedAt || null,
  );

  // Liberar holds de pagamento
  for (const payment of workOrder.payments) {
    try {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      await stripe.paymentIntents.cancel(payment.stripePaymentIntentId);

      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'CANCELLED', refundReason: reason || 'Service cancelled by customer' },
      });
    } catch (err: any) {
      logger.error(`Error voiding payment ${payment.id}: ${err.message}`);
    }
  }

  // Cancelar work order
  await prisma.$transaction([
    prisma.workOrder.update({
      where: { id: workOrderId },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    }),
    prisma.serviceRequest.update({
      where: { id: workOrder.serviceRequestId },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: reason },
    }),
  ]);

  logger.info(`Work order cancelled (no service started): ${workOrder.orderNumber}, fee: $${feeAmount.toFixed(2)}`);

  return res.json({
    success: true,
    message: feeAmount > 0
      ? `Serviço cancelado. Taxa de cancelamento de ${feePercent}% ($${feeAmount.toFixed(2)}) será cobrada.`
      : 'Serviço cancelado. Nenhuma taxa de cancelamento aplicada.',
    data: {
      cancellationFeePercent: feePercent,
      cancellationFeeAmount: feeAmount,
      holdsReleased: workOrder.payments.length,
    },
  });
};

/**
 * POST /api/v1/service-flow/validate-cancellation
 * Fornecedor valida solicitação de cancelamento
 */
export const validateCancellation = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const { cancellationRequestId, hasIncurredCosts, reportedCosts, validation, evidencePhotos } = req.body;

  const cancellation = await prisma.cancellationRequest.findFirst({
    where: { id: cancellationRequestId, status: 'PENDING_PROVIDER_VALIDATION' },
    include: {
      workOrder: {
        include: {
          payments: { where: { status: 'AUTHORIZED' } },
        },
      },
    },
  });

  if (!cancellation) throw new AppError('Solicitação não encontrada', 404, 'NOT_FOUND');
  if (cancellation.workOrder.providerId !== providerId) throw new AppError('Sem permissão', 403, 'FORBIDDEN');

  const newStatus = hasIncurredCosts ? 'PROVIDER_REPORTED_COSTS' : 'PROVIDER_CONFIRMED_NO_COST';

  await prisma.cancellationRequest.update({
    where: { id: cancellationRequestId },
    data: {
      status: newStatus,
      providerHasIncurredCosts: hasIncurredCosts,
      providerReportedCosts: hasIncurredCosts ? reportedCosts : 0,
      providerValidation: validation,
      providerEvidencePhotos: evidencePhotos || [],
      providerValidatedAt: new Date(),
    },
  });

  if (!hasIncurredCosts) {
    // Fornecedor confirma sem custos → liberar holds e cancelar
    for (const payment of cancellation.workOrder.payments) {
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        await stripe.paymentIntents.cancel(payment.stripePaymentIntentId);

        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'CANCELLED', refundReason: 'Cancellation approved - no costs incurred' },
        });
      } catch (err: any) {
        logger.error(`Error voiding payment: ${err.message}`);
      }
    }

    await prisma.$transaction([
      prisma.cancellationRequest.update({
        where: { id: cancellationRequestId },
        data: { status: 'COMPLETED', resolvedAt: new Date(), resolution: 'FULL_REFUND' },
      }),
      prisma.workOrder.update({
        where: { id: cancellation.workOrderId },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      }),
    ]);

    // Notificar cliente
    await prisma.notification.create({
      data: {
        userId: cancellation.requestedByCustomerId,
        type: 'CANCELLATION_VALIDATED',
        title: 'Cancellation Approved',
        message: 'Your cancellation request has been approved. All payment holds have been released.',
        relatedWorkOrderId: cancellation.workOrderId,
      },
    });

    return res.json({
      success: true,
      message: 'Cancelamento validado. Sem custos. Holds liberados.',
      data: { resolution: 'FULL_REFUND' },
    });
  }

  // Fornecedor reportou custos → notificar admin e cliente para resolução
  await prisma.notification.create({
    data: {
      userId: cancellation.requestedByCustomerId,
      type: 'CANCELLATION_VALIDATED',
      title: 'Cancellation Under Review',
      message: `The provider reported costs of $${Number(reportedCosts).toFixed(2)} for work already performed. Our team will review and contact you.`,
      relatedWorkOrderId: cancellation.workOrderId,
      data: JSON.stringify({
        cancellationRequestId,
        reportedCosts: Number(reportedCosts),
        providerValidation: validation,
      }),
    },
  });

  logger.info(`Cancellation request: provider reported costs $${reportedCosts} for WO ${cancellation.workOrderId}`);

  return res.json({
    success: true,
    message: 'Validação enviada. Custos reportados serão analisados.',
    data: {
      reportedCosts: Number(reportedCosts),
      status: 'PROVIDER_REPORTED_COSTS',
      nextStep: 'Admin review required',
    },
  });
};

// ============================================
// 4. UPLOAD DE FOTOS DO SERVIÇO
// ============================================

/**
 * POST /api/v1/service-flow/upload-service-photos
 * Fornecedor envia fotos durante ou após serviço
 */
export const uploadServicePhotos = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const { workOrderId, photoUrls, photoType } = req.body;
  // photoType: 'before' | 'during' | 'after'

  if (!['before', 'during', 'after'].includes(photoType)) {
    throw new AppError('photoType deve ser: before, during, after', 400, 'INVALID_PHOTO_TYPE');
  }

  const workOrder = await prisma.workOrder.findFirst({
    where: { id: workOrderId, providerId },
  });

  if (!workOrder) throw new AppError('Ordem não encontrada', 404, 'ORDER_NOT_FOUND');

  const photoField = `${photoType}Photos` as 'beforePhotos' | 'duringPhotos' | 'afterPhotos';
  const existingPhotos = (workOrder[photoField] as any[]) || [];
  const updatedPhotos = [...existingPhotos, ...photoUrls.map((url: string) => ({
    url,
    uploadedAt: new Date().toISOString(),
    uploadedBy: providerId,
  }))];

  await prisma.workOrder.update({
    where: { id: workOrderId },
    data: { [photoField]: updatedPhotos },
  });

  // Notificar cliente (especialmente se ausente)
  if (workOrder.clientPresent === false) {
    await prisma.notification.create({
      data: {
        userId: workOrder.customerId,
        type: 'SERVICE_PHOTOS_UPLOADED',
        title: `Service Photos (${photoType})`,
        message: `The provider uploaded ${photoUrls.length} ${photoType} photo(s) for your service. Tap to view.`,
        relatedWorkOrderId: workOrderId,
        data: JSON.stringify({ photoType, count: photoUrls.length }),
      },
    });
  }

  return res.json({
    success: true,
    message: `${photoUrls.length} foto(s) adicionadas (${photoType}).`,
    data: { totalPhotos: updatedPhotos.length },
  });
};

// ============================================
// 5. FORNECEDOR FINALIZA SERVIÇO
// ============================================

/**
 * POST /api/v1/service-flow/complete-service
 * Fornecedor marca serviço como concluído
 */
export const completeService = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const { workOrderId, completionNotes, clientPresent } = req.body;

  const workOrder = await prisma.workOrder.findFirst({
    where: { id: workOrderId, providerId },
  });

  if (!workOrder) throw new AppError('Ordem não encontrada', 404, 'ORDER_NOT_FOUND');
  if (workOrder.status !== SERVICE_FLOW.STATUSES.IN_PROGRESS) {
    throw new AppError('Serviço não está em andamento', 400, 'INVALID_STATUS');
  }

  // Se cliente ausente, verificar fotos mínimas
  if (clientPresent === false && SERVICE_FLOW.REQUIRE_PHOTOS_WHEN_ABSENT) {
    const afterPhotos = (workOrder.afterPhotos as any[]) || [];
    if (afterPhotos.length < SERVICE_FLOW.MIN_COMPLETION_PHOTOS) {
      throw new AppError(
        `When client is absent, at least ${SERVICE_FLOW.MIN_COMPLETION_PHOTOS} completion photos are required. Currently: ${afterPhotos.length}`,
        400,
        'PHOTOS_REQUIRED'
      );
    }
  }

  await prisma.workOrder.update({
    where: { id: workOrderId },
    data: {
      status: SERVICE_FLOW.STATUSES.AWAITING_APPROVAL,
      serviceCompletedByProvider: true,
      serviceCompletionNotes: completionNotes,
      clientPresent: clientPresent,
      completedAt: new Date(),
    },
  });

  // Notificar cliente
  await prisma.notification.create({
    data: {
      userId: workOrder.customerId,
      type: 'SERVICE_COMPLETED',
      title: 'Service Completed!',
      message: clientPresent
        ? 'The provider has completed the service. Please review and approve.'
        : 'The provider has completed the service. Please review the photos and approve.',
      relatedWorkOrderId: workOrderId,
    },
  });

  logger.info(`Service completed by provider: WO ${workOrder.orderNumber}`);

  return res.json({
    success: true,
    message: 'Serviço finalizado! Aguardando aprovação do cliente.',
    data: { status: SERVICE_FLOW.STATUSES.AWAITING_APPROVAL },
  });
};

// ============================================
// 6. CLIENTE APROVA + TERMOS + CAPTURA PAGAMENTO
// ============================================

/**
 * POST /api/v1/service-flow/approve-service
 * Cliente aprova serviço com aceitação de termos legais
 * → Captura pagamento → Gera recibo
 */
export const approveServiceAndProcessPayment = async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const {
    workOrderId,
    termsAccepted,
    fraudDisclaimerAccepted,
    signatureName,
    clientIp,
  } = req.body;

  // Validar aceite de termos
  if (!termsAccepted) {
    throw new AppError(
      'You must accept the Terms of Service to proceed.',
      400,
      'TERMS_NOT_ACCEPTED'
    );
  }
  if (!fraudDisclaimerAccepted) {
    throw new AppError(
      'You must acknowledge the fraud disclaimer to proceed. By continuing, you confirm this is a legitimate transaction and understand that filing a false fraud claim with your bank may result in legal consequences.',
      400,
      'FRAUD_DISCLAIMER_NOT_ACCEPTED'
    );
  }
  if (!signatureName) {
    throw new AppError('Digital signature (your full name) is required.', 400, 'SIGNATURE_REQUIRED');
  }

  // Buscar work order com todos os dados necessários
  const workOrder = await prisma.workOrder.findFirst({
    where: { id: workOrderId, customerId },
    include: {
      customer: { select: { email: true, fullName: true } },
      provider: {
        select: {
          fullName: true,
          providerProfile: { select: { businessName: true } },
        },
      },
      serviceRequest: {
        select: {
          title: true,
          vehicle: { select: { make: true, model: true, year: true, plateNumber: true } },
        },
      },
      payments: {
        where: { status: 'AUTHORIZED' },
        orderBy: { createdAt: 'asc' },
      },
      supplements: {
        where: { status: 'HOLD_PLACED' },
      },
    },
  });

  if (!workOrder) throw new AppError('Ordem não encontrada', 404, 'ORDER_NOT_FOUND');
  if (workOrder.status !== SERVICE_FLOW.STATUSES.AWAITING_APPROVAL) {
    throw new AppError('Serviço não está aguardando aprovação', 400, 'INVALID_STATUS');
  }

  const now = new Date();
  const requestIp = clientIp || req.ip || 'unknown';

  // Salvar aceite de termos na work order
  await prisma.workOrder.update({
    where: { id: workOrderId },
    data: {
      termsAcceptedAt: now,
      termsAcceptedIp: requestIp,
      fraudDisclaimerAcceptedAt: now,
      serviceApprovalSignature: signatureName,
      approvedByCustomerAt: now,
    },
  });

  // Capturar todos os pagamentos autorizados (principal + suplementos)
  const capturedPayments = [];
  let totalCaptured = 0;
  let supplementsTotal = 0;

  for (const payment of workOrder.payments) {
    try {
      const captureResult = await stripeService.capturePaymentIntent(payment.stripePaymentIntentId);

      if (captureResult.status === 'succeeded') {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'CAPTURED',
            capturedAt: now,
            stripeChargeId: captureResult.chargeId || payment.stripeChargeId,
          },
        });

        capturedPayments.push(payment);
        totalCaptured += Number(payment.totalAmount);

        if (payment.paymentType === 'SUPPLEMENT') {
          supplementsTotal += Number(payment.subtotal);
        }
      }
    } catch (error: any) {
      logger.error(`Error capturing payment ${payment.id}: ${error.message}`);
      throw new AppError(`Error processing payment: ${error.message}`, 500, 'CAPTURE_ERROR');
    }
  }

  // Capturar suplementos que tinham hold separado
  for (const supplement of workOrder.supplements) {
    if (supplement.stripePaymentIntentId) {
      try {
        await stripeService.capturePaymentIntent(supplement.stripePaymentIntentId);
        await prisma.paymentSupplement.update({
          where: { id: supplement.id },
          data: { status: 'CAPTURED', capturedAt: now },
        });
      } catch (error: any) {
        logger.error(`Error capturing supplement ${supplement.id}: ${error.message}`);
      }
    }
  }

  // Completar work order e service request
  await prisma.$transaction([
    prisma.workOrder.update({
      where: { id: workOrderId },
      data: { status: SERVICE_FLOW.STATUSES.COMPLETED },
    }),
    prisma.serviceRequest.update({
      where: { id: workOrder.serviceRequestId },
      data: { status: 'COMPLETED', completedAt: now },
    }),
  ]);

  // Gerar recibo
  const mainPayment = capturedPayments[0];
  let receipt = null;

  if (mainPayment) {
    const vehicle = workOrder.serviceRequest.vehicle;
    const vehicleInfo = `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.plateNumber ? ` (${vehicle.plateNumber})` : ''}`;

    receipt = await receiptService.generateReceipt({
      paymentId: mainPayment.id,
      customerName: workOrder.customer.fullName,
      customerEmail: workOrder.customer.email,
      providerName: workOrder.provider.fullName,
      providerBusinessName: workOrder.provider.providerProfile?.businessName,
      serviceDescription: workOrder.serviceRequest.title,
      vehicleInfo,
      orderNumber: workOrder.orderNumber,
      subtotal: Number(mainPayment.subtotal),
      platformFee: Number(mainPayment.platformFee),
      processingFee: Number(mainPayment.processingFee),
      totalAmount: totalCaptured,
      supplementsTotal,
      paymentProcessor: mainPayment.paymentProcessor as 'STRIPE' | 'CHASE',
      paymentMethodInfo: `${mainPayment.cardBrand || 'Card'} ending in ${mainPayment.cardLast4 || '****'}`,
      termsAcceptedAt: now,
      fraudDisclaimerAcceptedAt: now,
    });
  }

  // Notificar fornecedor
  await prisma.notification.create({
    data: {
      userId: workOrder.providerId,
      type: 'PAYMENT_RECEIVED',
      title: 'Payment Processed!',
      message: `Customer approved the service and payment of $${totalCaptured.toFixed(2)} has been processed. Funds will be transferred to your account.`,
      relatedWorkOrderId: workOrderId,
    },
  });

  // Notificar cliente com recibo
  await prisma.notification.create({
    data: {
      userId: customerId,
      type: 'RECEIPT_GENERATED',
      title: 'Payment Receipt',
      message: `Your payment of $${totalCaptured.toFixed(2)} has been processed. Receipt #${receipt?.receiptNumber || 'pending'}.`,
      relatedWorkOrderId: workOrderId,
      data: JSON.stringify({ receiptId: receipt?.id, receiptNumber: receipt?.receiptNumber }),
    },
  });

  logger.info(`Service approved and payment captured: WO ${workOrder.orderNumber}, total: $${totalCaptured.toFixed(2)}`);

  return res.json({
    success: true,
    message: 'Serviço aprovado! Pagamento processado e recibo gerado.',
    data: {
      workOrderStatus: SERVICE_FLOW.STATUSES.COMPLETED,
      paymentsCaptured: capturedPayments.length,
      totalCharged: totalCaptured,
      supplementsTotal,
      receipt: receipt ? {
        id: receipt.id,
        receiptNumber: receipt.receiptNumber,
      } : null,
      termsAccepted: true,
      fraudDisclaimerAccepted: true,
    },
  });
};

// ============================================
// 7. COMPARAR PROCESSADORES DE PAGAMENTO
// ============================================

/**
 * POST /api/v1/service-flow/compare-processors
 * Compara taxas entre Stripe e Chase para o valor dado
 */
export const comparePaymentProcessors = async (req: Request, res: Response) => {
  const { amount, cardType = 'credit' } = req.body;

  if (!amount || amount <= 0) {
    throw new AppError('Valor inválido', 400, 'INVALID_AMOUNT');
  }

  const comparison = compareProcessorFees(Number(amount), cardType as 'credit' | 'debit');

  return res.json({
    success: true,
    data: {
      serviceAmount: Number(amount),
      cardType,
      processors: {
        stripe: {
          name: 'Stripe',
          ...comparison.stripe,
          available: true,
        },
        chase: {
          name: 'Chase Payment Solutions',
          ...comparison.chase,
          available: process.env.CHASE_ENABLED === 'true',
          note: cardType === 'debit'
            ? '✨ Lower fees for debit cards with Chase!'
            : null,
        },
      },
      recommendation: {
        processor: comparison.recommended,
        savings: comparison.savings,
        description: comparison.savingsDescription,
      },
    },
  });
};

// ============================================
// 8. CONSULTAR ORÇAMENTO APROVADO (não perder)
// ============================================

/**
 * GET /api/v1/service-flow/approved-quote/:workOrderId
 * Consultar orçamento aprovado e valores provisionados
 */
export const getApprovedQuoteDetails = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { workOrderId } = req.params;

  const workOrder = await prisma.workOrder.findFirst({
    where: {
      id: workOrderId,
      OR: [{ customerId: userId }, { providerId: userId }],
    },
    include: {
      quote: {
        include: {
          provider: {
            select: {
              fullName: true,
              providerProfile: { select: { businessName: true, averageRating: true } },
            },
          },
        },
      },
      serviceRequest: {
        select: {
          title: true,
          description: true,
          serviceType: true,
          vehicle: { select: { make: true, model: true, year: true, plateNumber: true } },
        },
      },
      payments: {
        select: {
          id: true,
          paymentNumber: true,
          status: true,
          totalAmount: true,
          authorizedAt: true,
          capturedAt: true,
          paymentType: true,
          paymentProcessor: true,
        },
        orderBy: { createdAt: 'asc' },
      },
      supplements: {
        orderBy: { createdAt: 'asc' },
      },
      cancellationRequests: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!workOrder) throw new AppError('Ordem não encontrada', 404, 'ORDER_NOT_FOUND');

  // Calcular totais
  const originalAmount = Number(workOrder.originalAmount);
  const additionalAmount = Number(workOrder.additionalAmount);
  const totalAuthorized = workOrder.payments
    .filter(p => p.status === 'AUTHORIZED')
    .reduce((sum, p) => sum + Number(p.totalAmount), 0);
  const totalCaptured = workOrder.payments
    .filter(p => p.status === 'CAPTURED')
    .reduce((sum, p) => sum + Number(p.totalAmount), 0);

  return res.json({
    success: true,
    data: {
      workOrder: {
        id: workOrder.id,
        orderNumber: workOrder.orderNumber,
        status: workOrder.status,
        clientPresent: workOrder.clientPresent,
        serviceCompletedByProvider: workOrder.serviceCompletedByProvider,
        termsAccepted: !!workOrder.termsAcceptedAt,
        photos: {
          before: workOrder.beforePhotos,
          during: workOrder.duringPhotos,
          after: workOrder.afterPhotos,
        },
        dates: {
          created: workOrder.createdAt,
          started: workOrder.startedAt,
          completed: workOrder.completedAt,
          approved: workOrder.approvedByCustomerAt,
        },
      },
      quote: {
        id: workOrder.quote.id,
        quoteNumber: workOrder.quote.quoteNumber,
        partsCost: Number(workOrder.quote.partsCost),
        laborCost: Number(workOrder.quote.laborCost),
        travelFee: Number(workOrder.quote.travelFee),
        totalAmount: Number(workOrder.quote.totalAmount),
        partsList: workOrder.quote.partsList,
        warranty: {
          months: workOrder.quote.warrantyMonths,
          mileage: workOrder.quote.warrantyMileage,
          description: workOrder.quote.warrantyDescription,
        },
        provider: workOrder.quote.provider,
      },
      financials: {
        originalAmount,
        additionalAmount,
        finalAmount: Number(workOrder.finalAmount),
        totalAuthorized,
        totalCaptured,
        holdActive: totalAuthorized > 0,
      },
      payments: workOrder.payments,
      supplements: workOrder.supplements.map(s => ({
        id: s.id,
        supplementNumber: s.supplementNumber,
        description: s.description,
        additionalAmount: Number(s.additionalAmount),
        status: s.status,
        approvedAt: s.approvedByCustomerAt,
        rejectedAt: s.rejectedByCustomerAt,
      })),
      cancellation: workOrder.cancellationRequests[0] || null,
      vehicle: workOrder.serviceRequest.vehicle,
      service: {
        title: workOrder.serviceRequest.title,
        description: workOrder.serviceRequest.description,
        type: workOrder.serviceRequest.serviceType,
      },
    },
  });
};

/**
 * GET /api/v1/service-flow/receipt/:paymentId
 * Consultar recibo de pagamento
 */
export const getReceipt = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { paymentId } = req.params;

  // Verificar que o payment pertence ao usuário
  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      OR: [{ customerId: userId }, { providerId: userId }],
    },
  });

  if (!payment) throw new AppError('Pagamento não encontrado', 404, 'NOT_FOUND');

  const receipt = await receiptService.getReceiptByPaymentId(paymentId);
  if (!receipt) throw new AppError('Recibo não encontrado', 404, 'RECEIPT_NOT_FOUND');

  return res.json({
    success: true,
    data: {
      receipt,
      html: receiptService.formatReceiptHtml(receipt),
    },
  });
};
