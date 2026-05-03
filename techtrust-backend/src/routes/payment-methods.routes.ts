/**
 * ============================================
 * PAYMENT METHODS ROUTES
 * ============================================
 * CRUD para métodos de pagamento do usuário
 * Permite sincronização cross-device (Android ↔ iOS)
 */

import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error-handler";
import * as stripeService from "../services/stripe.service";
import {
  PIX_RULES,
  validatePixKey,
  normalizePixKey,
  type PixKeyType,
} from "../config/businessRules";

const router = Router();

router.use(authenticate);

/**
 * GET /api/v1/payment-methods
 * Listar todos os métodos de pagamento do usuário
 */
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const methods = await prisma.paymentMethod.findMany({
      where: { userId, isActive: true },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        type: true,
        stripePaymentMethodId: true,
        cardBrand: true,
        cardLast4: true,
        cardExpMonth: true,
        cardExpYear: true,
        holderName: true,
        pixKey: true,
        pixKeyType: true,
        userCountry: true,
        isDefault: true,
        createdAt: true,
      },
    });

    return res.json({
      success: true,
      data: methods,
    });
  }),
);

/**
 * POST /api/v1/payment-methods
 * Adicionar novo método de pagamento (cartão manual ou PIX).
 *
 * Para PIX, o usuário deve ter userCountry = "BR" no corpo da requisição.
 * Body PIX: { type: "pix", pixKey, pixKeyType, userCountry: "BR" }
 * Body Cartão: { type: "credit"|"debit", cardBrand, cardLast4, cardExpMonth, cardExpYear, holderName }
 *
 * Nota: para cartões Stripe, usar POST /payment-methods/stripe (PCI compliant).
 */
router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const {
      type,
      cardBrand,
      cardLast4,
      cardExpMonth,
      cardExpYear,
      holderName,
      pixKey,
      pixKeyType,
      userCountry,
    } = req.body;

    // Validar tipo
    if (!type || !["credit", "debit", "pix"].includes(type)) {
      throw new AppError("Invalid payment method type", 400, "INVALID_TYPE");
    }

    if (type === "pix") {
      // Verificar se PIX está habilitado
      if (!PIX_RULES.ENABLED) {
        throw new AppError("PIX payments are not available", 503, "PIX_DISABLED");
      }

      // PIX só para usuários brasileiros
      const country = (userCountry ?? "US").toUpperCase();
      if (country !== PIX_RULES.ELIGIBLE_USER_COUNTRY) {
        throw new AppError(
          "PIX is only available for Brazilian users (userCountry: BR)",
          403,
          "PIX_NOT_ELIGIBLE",
        );
      }

      if (!pixKey) {
        throw new AppError("PIX key is required", 400, "PIX_KEY_REQUIRED");
      }

      if (!pixKeyType || !PIX_RULES.ACCEPTED_KEY_TYPES.includes(pixKeyType as PixKeyType)) {
        throw new AppError(
          `pixKeyType must be one of: ${PIX_RULES.ACCEPTED_KEY_TYPES.join(", ")}`,
          400,
          "PIX_KEY_TYPE_INVALID",
        );
      }

      // Validar formato da chave PIX
      if (!validatePixKey(pixKey, pixKeyType as PixKeyType)) {
        throw new AppError(
          `Invalid PIX key format for type "${pixKeyType}"`,
          400,
          "PIX_KEY_FORMAT_INVALID",
        );
      }

      const normalizedKey = normalizePixKey(pixKey, pixKeyType as PixKeyType);

      // Verificar duplicata para o mesmo usuário
      const duplicate = await prisma.paymentMethod.findFirst({
        where: { userId, type: "pix", pixKey: normalizedKey, isActive: true },
      });
      if (duplicate) {
        throw new AppError("This PIX key is already registered", 409, "PIX_KEY_DUPLICATE");
      }

      const existingCount = await prisma.paymentMethod.count({
        where: { userId, isActive: true },
      });

      const method = await prisma.paymentMethod.create({
        data: {
          userId,
          type: "pix",
          pixKey: normalizedKey,
          pixKeyType,
          userCountry: country,
          isDefault: existingCount === 0,
        },
        select: {
          id: true,
          type: true,
          pixKey: true,
          pixKeyType: true,
          userCountry: true,
          isDefault: true,
          createdAt: true,
        },
      });

      return res.status(201).json({ success: true, data: method });
    }

    // ── Cartão (crédito / débito) ──
    if (!cardLast4 || !cardBrand) {
      throw new AppError(
        "Card details are required. For Stripe cards use POST /payment-methods/stripe",
        400,
        "CARD_DETAILS_REQUIRED",
      );
    }

    const existingCount = await prisma.paymentMethod.count({
      where: { userId, isActive: true },
    });

    const method = await prisma.paymentMethod.create({
      data: {
        userId,
        type,
        cardBrand,
        cardLast4,
        cardExpMonth: cardExpMonth ? parseInt(cardExpMonth) : null,
        cardExpYear: cardExpYear ? parseInt(cardExpYear) : null,
        holderName: holderName ?? null,
        isDefault: existingCount === 0,
      },
      select: {
        id: true,
        type: true,
        cardBrand: true,
        cardLast4: true,
        cardExpMonth: true,
        cardExpYear: true,
        holderName: true,
        isDefault: true,
        createdAt: true,
      },
    });

    return res.status(201).json({ success: true, data: method });
  }),
);

/**
 * POST /api/v1/payment-methods/stripe
 * Save a card from Stripe SetupIntent confirmation (PCI compliant)
 * Called by mobile after user confirms SetupIntent with Stripe SDK
 */
router.post(
  "/stripe",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { stripePaymentMethodId } = req.body;

    if (!stripePaymentMethodId) {
      throw new AppError(
        "stripePaymentMethodId is required",
        400,
        "MISSING_STRIPE_PM_ID",
      );
    }

    // Check if this Stripe PM is already saved
    const existing = await prisma.paymentMethod.findUnique({
      where: { stripePaymentMethodId },
    });
    if (existing) {
      return res.json({
        success: true,
        data: existing,
        message: "Already saved",
      });
    }

    // Retrieve card details from Stripe
    const stripeMethod = await stripeService.retrievePaymentMethod(
      stripePaymentMethodId,
    );

    // Count existing methods (for isDefault)
    const existingCount = await prisma.paymentMethod.count({
      where: { userId, isActive: true },
    });

    const method = await prisma.paymentMethod.create({
      data: {
        userId,
        type: stripeMethod.type === "card" ? "credit" : stripeMethod.type,
        stripePaymentMethodId,
        cardBrand: stripeMethod.card?.brand || null,
        cardLast4: stripeMethod.card?.last4 || null,
        cardExpMonth: stripeMethod.card?.expMonth || null,
        cardExpYear: stripeMethod.card?.expYear || null,
        holderName: stripeMethod.billingName || null,
        billingName: stripeMethod.billingName || null,
        billingZip: stripeMethod.billingZip || null,
        isDefault: existingCount === 0,
      },
      select: {
        id: true,
        type: true,
        stripePaymentMethodId: true,
        cardBrand: true,
        cardLast4: true,
        cardExpMonth: true,
        cardExpYear: true,
        holderName: true,
        isDefault: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      success: true,
      data: method,
    });
  }),
);

/**
 * PATCH /api/v1/payment-methods/:id/default
 * Definir método como padrão
 */
router.patch(
  "/:id/default",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;

    // Verificar se pertence ao usuário
    const method = await prisma.paymentMethod.findFirst({
      where: { id, userId, isActive: true },
    });

    if (!method) {
      throw new AppError("Payment method not found", 404, "NOT_FOUND");
    }

    // Remover default de todos e setar no selecionado
    await prisma.$transaction([
      prisma.paymentMethod.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      }),
      prisma.paymentMethod.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);

    return res.json({
      success: true,
      message: "Default payment method updated",
    });
  }),
);

/**
 * DELETE /api/v1/payment-methods/:id
 * Remover método de pagamento (soft delete)
 */
router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;

    const method = await prisma.paymentMethod.findFirst({
      where: { id, userId, isActive: true },
    });

    if (!method) {
      throw new AppError("Payment method not found", 404, "NOT_FOUND");
    }

    // Soft delete
    await prisma.paymentMethod.update({
      where: { id },
      data: { isActive: false, isDefault: false },
    });

    // Se era default, promover outro
    if (method.isDefault) {
      const nextMethod = await prisma.paymentMethod.findFirst({
        where: { userId, isActive: true },
        orderBy: { createdAt: "desc" },
      });
      if (nextMethod) {
        await prisma.paymentMethod.update({
          where: { id: nextMethod.id },
          data: { isDefault: true },
        });
      }
    }

    return res.json({
      success: true,
      message: "Payment method removed",
    });
  }),
);

export default router;
