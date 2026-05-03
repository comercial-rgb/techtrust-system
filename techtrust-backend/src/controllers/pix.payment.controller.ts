/**
 * ============================================
 * PIX PAYMENT CONTROLLER
 * ============================================
 * Pagamentos via PIX para usuários brasileiros viajando nos EUA.
 *
 * Rotas:
 *   POST /api/v1/payments/pix/create-charge  → Emite QR Code PIX
 *   POST /api/v1/payments/pix/:paymentId/confirm → Verifica se PIX foi pago
 *   POST /api/v1/payments/pix/:paymentId/cancel → Cancela cobrança PIX
 * ============================================
 */

import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error-handler';
import { logger } from '../config/logger';
import { PIX_RULES, calculateFullFeeBreakdown } from '../config/businessRules';
import * as pixService from '../services/pix.service';

// ─── CREATE PIX CHARGE ───────────────────────────────────────────────────────

/**
 * POST /api/v1/payments/pix/create-charge
 *
 * Cria uma cobrança PIX para uma work order.
 * Só disponível para usuários com userCountry = "BR".
 *
 * Body: { workOrderId, paymentMethodId, cpfCnpj }
 *   - paymentMethodId: ID do PaymentMethod do tipo "pix" cadastrado pelo usuário
 *   - cpfCnpj: CPF ou CNPJ do pagador (exigido pelo Asaas para emitir cobrança)
 */
export const createPixPaymentCharge = async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const { workOrderId, paymentMethodId, cpfCnpj } = req.body;

  if (!workOrderId || !paymentMethodId || !cpfCnpj) {
    throw new AppError('workOrderId, paymentMethodId e cpfCnpj são obrigatórios', 400, 'MISSING_FIELDS');
  }

  // Verificar se usuário é brasileiro
  const pixMethod = await prisma.paymentMethod.findFirst({
    where: { id: paymentMethodId, userId: customerId, type: 'pix', isActive: true },
  });

  if (!pixMethod) {
    throw new AppError('Método de pagamento PIX não encontrado', 404, 'PIX_METHOD_NOT_FOUND');
  }

  if (pixMethod.userCountry !== PIX_RULES.ELIGIBLE_USER_COUNTRY) {
    throw new AppError(
      'PIX está disponível somente para usuários brasileiros',
      403,
      'PIX_NOT_ELIGIBLE',
    );
  }

  // Buscar work order
  const workOrder = await prisma.workOrder.findFirst({
    where: { id: workOrderId, customerId },
    include: {
      customer: { select: { email: true, fullName: true } },
      provider: {
        select: {
          providerProfile: {
            select: { providerLevel: true },
          },
        },
      },
      quote: {
        select: {
          laborCost: true, partsCost: true, additionalFees: true,
          travelFee: true, diagnosticFee: true, shopSuppliesFee: true,
          tireFee: true, batteryFee: true, taxAmount: true, totalAmount: true,
        },
      },
    },
  });

  if (!workOrder) {
    throw new AppError('Ordem não encontrada', 404, 'ORDER_NOT_FOUND');
  }

  if (workOrder.status !== 'AWAITING_APPROVAL') {
    throw new AppError(
      'Pagamento só pode ser feito após aprovação do serviço',
      400,
      'INVALID_STATUS',
    );
  }

  // Verificar se já há um pagamento PIX pendente para esta ordem
  const existing = await prisma.payment.findFirst({
    where: { workOrderId, status: 'PENDING' },
  });

  if (existing) {
    // Se o QR code ainda não expirou, retornar o existente
    if (existing.pixExpiresAt && existing.pixExpiresAt > new Date()) {
      return res.json({
        success: true,
        data: {
          paymentId: existing.id,
          paymentNumber: existing.paymentNumber,
          pixQrCode: existing.pixQrCode,
          pixCopyPaste: existing.pixCopyPaste,
          pixExpiresAt: existing.pixExpiresAt,
          pixAmountBrl: Number(existing.pixAmountBrl),
          totalAmountUsd: Number(existing.totalAmount),
          existing: true,
        },
      });
    }

    // QR code expirado — cancelar no Asaas e criar novo
    if (existing.pixPaymentId) {
      try {
        await pixService.cancelPixCharge(existing.pixPaymentId);
      } catch (e) {
        logger.warn(`Falha ao cancelar PIX expirado ${existing.pixPaymentId}: ${e}`);
      }
    }

    await prisma.payment.update({
      where: { id: existing.id },
      data: { status: 'CANCELLED' },
    });
  }

  // Calcular taxas em USD
  const quote = workOrder.quote;
  const serviceAmount = Number(workOrder.finalAmount);
  const laborAmount = quote ? Number(quote.laborCost) : serviceAmount;
  const partsAmount = quote ? Number(quote.partsCost) : 0;
  const providerLevel = (workOrder.provider.providerProfile?.providerLevel ?? 'ENTRY') as any;

  const subscription = await prisma.subscription.findFirst({
    where: { userId: customerId, status: 'ACTIVE' },
    select: { plan: true },
  });
  const clientPlan = subscription?.plan ?? 'FREE';

  const fees = calculateFullFeeBreakdown({
    laborAmount,
    partsAmount,
    additionalFees: quote ? Number(quote.additionalFees ?? 0) : 0,
    travelFee: quote ? Number(quote.travelFee ?? 0) : 0,
    diagnosticFee: quote ? Number(quote.diagnosticFee ?? 0) : 0,
    shopSuppliesFee: quote ? Number(quote.shopSuppliesFee ?? 0) : 0,
    tireFee: quote ? Number(quote.tireFee ?? 0) : 0,
    batteryFee: quote ? Number(quote.batteryFee ?? 0) : 0,
    taxAmount: quote ? Number(quote.taxAmount ?? 0) : 0,
    quoteTotal: serviceAmount,
    clientPlan,
    providerLevel,
    // PIX não tem taxa de processador — o spread de câmbio já cobre
    processor: 'STRIPE', // usado somente para calcular os outros fees; processorFee não é cobrado em PIX
  });

  // Para PIX, zeramos o processorFee (substituído pelo spread de câmbio)
  const totalUsd = fees.totalClientPays - fees.processorFee;

  // Validar CPF (11 dígitos) ou CNPJ (14 dígitos)
  const cpfCnpjDigits = String(cpfCnpj).replace(/\D/g, '');
  if (cpfCnpjDigits.length !== 11 && cpfCnpjDigits.length !== 14) {
    throw new AppError(
      'CPF deve ter 11 dígitos e CNPJ deve ter 14 dígitos',
      400,
      'INVALID_CPF_CNPJ',
    );
  }

  // Criar/recuperar customer no Asaas
  const asaasCustomer = await pixService.getOrCreateAsaasCustomer({
    userId: customerId,
    name: workOrder.customer.fullName,
    email: workOrder.customer.email,
    cpfCnpj: cpfCnpjDigits,
  });

  // Gerar número de pagamento e ID reservado único para o campo stripePaymentIntentId
  // (campo único obrigatório — usamos prefixo "pix_" para distinguir de PaymentIntents Stripe)
  const paymentNumber = `PAY-PIX-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
  const pixIntentPlaceholder = `pix_${paymentNumber}`;

  // Criar registro de pagamento ANTES de chamar a API Asaas.
  // Se a chamada Asaas falhar, o registro fica com status PENDING sem pixPaymentId.
  // O cliente pode tentar novamente e o código de reuso de QR acima cuidará do caso.
  const payment = await prisma.payment.create({
    data: {
      paymentNumber,
      workOrderId,
      customerId,
      providerId: workOrder.providerId,
      paymentProcessor: 'STRIPE', // campo obrigatório; PIX é identificado por cardType='pix'
      subtotal: serviceAmount,
      platformFee: fees.totalPlatformCommission,
      processingFee: 0, // PIX não tem fee de processador (spread no câmbio cobre)
      totalAmount: totalUsd,
      providerAmount: fees.providerReceives,
      appServiceFee: fees.appServiceFee,
      serviceCommission: fees.serviceCommission,
      serviceCommissionPercent: fees.serviceCommissionPercent,
      partsFee: fees.partsFee,
      status: 'PENDING',
      stripePaymentIntentId: pixIntentPlaceholder, // único por pagamento; atualizado ao confirmar
      paymentMethodId,
      cardType: 'pix',
    },
  });

  // Emitir cobrança PIX no Asaas (pode falhar; payment está salvo como PENDING sem pixPaymentId)
  let charge: Awaited<ReturnType<typeof pixService.createPixCharge>>;
  try {
    charge = await pixService.createPixCharge({
      amountUsd: totalUsd,
      asaasCustomerId: asaasCustomer.id,
      paymentId: payment.id,
      orderNumber: workOrder.orderNumber,
    });
  } catch (err) {
    // Marcar payment como CANCELLED para não bloquear nova tentativa
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'CANCELLED' },
    });
    logger.error(`Falha ao criar cobrança PIX no Asaas para ${payment.paymentNumber}: ${err}`);
    throw new AppError('Falha ao gerar cobrança PIX. Tente novamente.', 502, 'PIX_CHARGE_FAILED');
  }

  // Atualizar payment com dados PIX retornados pelo Asaas
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      pixPaymentId: charge.pixPaymentId,
      pixQrCode: charge.pixQrCode,
      pixCopyPaste: charge.pixCopyPaste,
      pixExpiresAt: charge.pixExpiresAt,
      pixAmountBrl: charge.amountBrl,
      pixExchangeRate: charge.exchangeRate,
    },
  });

  logger.info(`PIX charge emitido: ${payment.paymentNumber} | R$ ${charge.amountBrl} | USD ${totalUsd}`);

  return res.json({
    success: true,
    data: {
      paymentId: payment.id,
      paymentNumber: payment.paymentNumber,
      pixQrCode: charge.pixQrCode,
      pixCopyPaste: charge.pixCopyPaste,
      pixExpiresAt: charge.pixExpiresAt,
      pixAmountBrl: charge.amountBrl,
      pixExchangeRate: charge.exchangeRate,
      totalAmountUsd: totalUsd,
      breakdown: {
        quoteTotal: serviceAmount,
        appServiceFee: fees.appServiceFee,
        processorFee: 0,
        totalUsd,
        pixAmountBrl: charge.amountBrl,
        exchangeRateUsed: charge.exchangeRate,
        spreadPercent: PIX_RULES.CONVERSION_SPREAD_PERCENT,
        providerWillReceive: fees.providerReceives,
      },
    },
  });
};

// ─── CONFIRM PIX (polling manual) ────────────────────────────────────────────

/**
 * POST /api/v1/payments/pix/:paymentId/confirm
 *
 * Verifica se o PIX foi pago (polling do app cliente).
 * A confirmação automática é feita via webhook Asaas.
 * Este endpoint é um fallback para o cliente verificar manualmente.
 */
export const confirmPixPayment = async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const { paymentId } = req.params;

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, customerId, cardType: 'pix' },
  });

  if (!payment) {
    throw new AppError('Pagamento PIX não encontrado', 404, 'PAYMENT_NOT_FOUND');
  }

  if (payment.status === 'CAPTURED') {
    return res.json({
      success: true,
      data: { status: 'CAPTURED', confirmed: true },
    });
  }

  if (payment.status !== 'PENDING') {
    throw new AppError(`Pagamento em status inválido: ${payment.status}`, 400, 'INVALID_STATUS');
  }

  if (!payment.pixPaymentId) {
    throw new AppError('Dados PIX não encontrados', 500, 'PIX_DATA_MISSING');
  }

  // Verificar expiração
  if (payment.pixExpiresAt && payment.pixExpiresAt < new Date()) {
    throw new AppError(
      'QR Code PIX expirado. Crie uma nova cobrança.',
      400,
      'PIX_EXPIRED',
    );
  }

  const { confirmed, status } = await pixService.verifyPixPayment(payment.pixPaymentId);

  if (confirmed) {
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'CAPTURED',
          authorizedAt: new Date(),
          capturedAt: new Date(),
          pixPaidAt: new Date(),
          stripePaymentIntentId: payment.pixPaymentId, // sobrescreve o placeholder
        },
      }),
      prisma.workOrder.update({
        where: { id: payment.workOrderId },
        data: { status: 'COMPLETED' },
      }),
    ]);

    logger.info(`PIX confirmado manualmente: ${payment.paymentNumber}`);
  }

  return res.json({
    success: true,
    data: {
      confirmed,
      status,
      paymentStatus: confirmed ? 'CAPTURED' : 'PENDING',
    },
  });
};

// ─── CANCEL PIX ──────────────────────────────────────────────────────────────

/**
 * POST /api/v1/payments/pix/:paymentId/cancel
 * Cancela uma cobrança PIX pendente (antes de ser paga).
 */
export const cancelPixPayment = async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const { paymentId } = req.params;

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, customerId, cardType: 'pix', status: 'PENDING' },
  });

  if (!payment) {
    throw new AppError('Pagamento PIX pendente não encontrado', 404, 'PAYMENT_NOT_FOUND');
  }

  if (payment.pixPaymentId) {
    try {
      await pixService.cancelPixCharge(payment.pixPaymentId);
    } catch (e) {
      logger.warn(`Falha ao cancelar PIX no Asaas ${payment.pixPaymentId}: ${e}`);
    }
  }

  await prisma.payment.update({
    where: { id: paymentId },
    data: { status: 'CANCELLED' },
  });

  return res.json({
    success: true,
    message: 'Cobrança PIX cancelada',
  });
};
