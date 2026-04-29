/**
 * ============================================
 * AUTH CONTROLLER
 * ============================================
 * Controla autenticação: cadastro, login, OTP, social login, etc
 */

import { Request, Response } from "express";
import { SubscriptionPlan } from "@prisma/client";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error-handler";
import {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
} from "../utils/password";
import { generateTokens, verifyRefreshToken } from "../utils/jwt";
import {
  generateOTP,
  getOTPExpiration,
  isOTPExpired,
  validateOTPFormat,
} from "../utils/otp";
import {
  sendOTP,
  sendVerifyOTP,
  checkVerifyOTP,
} from "../services/sms.service";
import {
  sendOTPEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from "../services/email.service";
import { randomUUID } from "crypto";
import { logger } from "../config/logger";
import { SUBSCRIPTION_PLANS } from "../config/businessRules";

/**
 * Insere ProviderProfile via SQL direto — imune à versão do Prisma Client.
 * O Prisma Client gerado no Render pode ser de um schema antigo e rejeitar
 * campos novos (bankAccountType, cityBusinessTaxReceiptNumber, etc.) com
 * PrismaClientValidationError antes de qualquer query chegar ao banco.
 */
async function insertProviderProfileRaw(p: {
  userId: string;
  businessName: string;
  businessType: string | null;
  businessTypeCat: string;
  legalName: string | null;
  ein: string | null;
  sunbizDocumentNumber: string | null;
  businessIdentityStatus: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  servicesOffered: unknown[];
  vehicleTypesServed: unknown[];
  sellsParts: boolean;
  payoutMethod: string;
  zelleEmail: string | null;
  zellePhone: string | null;
  bankTransferLabel: string | null;
  bankAccountType: string | null;
  bankAccountNumber: string | null;
  bankRoutingNumber: string | null;
  cityBusinessTaxReceiptNumber: string | null;
  countyBusinessTaxReceiptNumber: string | null;
  businessTaxReceiptStatus: string;
  marketplaceFacilitatorTaxAcknowledged: boolean;
  insuranceDisclosureAcceptedAt: Date | null;
}): Promise<void> {
  const id = randomUUID();
  const svc = JSON.stringify(p.servicesOffered ?? []);
  const veh = JSON.stringify(p.vehicleTypesServed ?? []);
  await prisma.$executeRaw`
    INSERT INTO "provider_profiles" (
      "id", "userId", "businessName", "businessType", "businessTypeCat",
      "legalName", "ein", "sunbizDocumentNumber", "businessIdentityStatus",
      "address", "city", "state", "zipCode",
      "servicesOffered", "vehicleTypesServed", "sellsParts", "specialties",
      "payoutMethod", "zelleEmail", "zellePhone", "bankTransferLabel",
      "bankAccountType", "bankAccountNumber", "bankRoutingNumber",
      "cityBusinessTaxReceiptNumber", "countyBusinessTaxReceiptNumber",
      "businessTaxReceiptStatus", "marketplaceFacilitatorTaxAcknowledged",
      "insuranceDisclosureAcceptedAt",
      "createdAt", "updatedAt"
    ) VALUES (
      ${id}, ${p.userId}, ${p.businessName}, ${p.businessType},
      ${p.businessTypeCat}::"BusinessType",
      ${p.legalName}, ${p.ein}, ${p.sunbizDocumentNumber}, ${p.businessIdentityStatus},
      ${p.address}, ${p.city}, ${p.state}, ${p.zipCode},
      ${svc}::jsonb, ${veh}::jsonb, ${p.sellsParts}, '[]'::jsonb,
      ${p.payoutMethod}, ${p.zelleEmail}, ${p.zellePhone}, ${p.bankTransferLabel},
      ${p.bankAccountType}, ${p.bankAccountNumber}, ${p.bankRoutingNumber},
      ${p.cityBusinessTaxReceiptNumber}, ${p.countyBusinessTaxReceiptNumber},
      ${p.businessTaxReceiptStatus}, ${p.marketplaceFacilitatorTaxAcknowledged},
      ${p.insuranceDisclosureAcceptedAt},
      NOW(), NOW()
    )
    ON CONFLICT ("userId") DO NOTHING
  `;
}

/** Verifica se Twilio Verify está habilitado */
const isVerifyEnabled = () => !!process.env.TWILIO_VERIFY_SERVICE_SID;

const issueSmsOTP = async (
  userId: string,
  phone: string | null | undefined,
  language?: string | null,
): Promise<void> => {
  if (!phone) {
    throw new Error("Telefone não informado para envio de OTP");
  }

  const otpCode = generateOTP();
  const otpExpiresAt = getOTPExpiration();

  await prisma.$executeRaw`
    UPDATE "users"
    SET "otpCode" = ${otpCode},
        "otpExpiresAt" = ${otpExpiresAt},
        "updatedAt" = NOW()
    WHERE "id" = ${userId}
  `;

  if (isVerifyEnabled()) {
    try {
      await sendVerifyOTP(phone, "sms", undefined, otpCode);
      return;
    } catch (verifyError: any) {
      logger.error("Erro ao enviar Verify OTP com código local:", {
        message: verifyError.message,
      });
    }
  }

  await sendOTP(phone, otpCode, language || undefined);
};

const markEmailVerified = async (userId: string) => {
  await prisma.$executeRaw`
    UPDATE "users"
    SET "emailVerified" = true,
        "emailOtpCode" = NULL,
        "emailOtpExpiresAt" = NULL,
        "status" = 'ACTIVE'::"AccountStatus",
        "updatedAt" = NOW()
    WHERE "id" = ${userId}
  `;

  return prisma.user.findUnique({
    where: { id: userId },
    include: { providerProfile: true },
  });
};

const markPhoneVerified = async (userId: string) => {
  await prisma.$executeRaw`
    UPDATE "users"
    SET "phoneVerified" = true,
        "status" = 'ACTIVE'::"AccountStatus",
        "otpCode" = NULL,
        "otpExpiresAt" = NULL,
        "updatedAt" = NOW()
    WHERE "id" = ${userId}
  `;

  return prisma.user.findUnique({
    where: { id: userId },
    include: { providerProfile: true },
  });
};

/**
 * POST /api/v1/auth/signup
 * Cadastro de novo usuário (cliente)
 */
export const signup = async (req: Request, res: Response) => {
  try {
    const {
      fullName,
      email,
      phone,
      password,
      language,
      role,
      accountType, // 'INDIVIDUAL' | 'BUSINESS'
      businessName,
      legalName,
      ein,
      sunbizDocumentNumber,
      businessAddress,
      businessCity,
      businessState,
      businessZipCode,
      servicesOffered,
      vehicleTypesServed,
      sellsParts,
      selectedPlan, // plan selected during registration
      payoutMethod,
      zelleEmail,
      zellePhone,
      bankTransferLabel,
      bankAccountType,
      bankAccountNumber,
      bankRoutingNumber,
      cityBusinessTaxReceiptNumber,
      countyBusinessTaxReceiptNumber,
      insuranceDisclosureAccepted,
      marketplaceFacilitatorTaxAcknowledged,
      marketplaceType, // 'CAR_WASH' | 'AUTO_PARTS' — for MARKETPLACE role signups
      marketplacePlan, // plan selected for marketplace
      preferredOtpMethod, // 'sms' | 'email' — user chooses verification method
    } = req.body;

    void accountType;
    void marketplacePlan;
    const normalizedSelectedPlan =
      typeof selectedPlan === "string" ? selectedPlan.toUpperCase() : "FREE";
    const selectedClientPlan = ["STARTER", "PRO", "ENTERPRISE"].includes(
      normalizedSelectedPlan,
    )
      ? (normalizedSelectedPlan as "STARTER" | "PRO" | "ENTERPRISE")
      : "FREE";

    // Validar role
    const userRole = role === "PROVIDER" ? "PROVIDER" : "CLIENT";
    const syncSelectedClientSubscription = async (userId: string) => {
      const planConfig = SUBSCRIPTION_PLANS[selectedClientPlan];
      const periodEnd =
        selectedClientPlan === "FREE"
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const data = {
        plan: selectedClientPlan as SubscriptionPlan,
        price: planConfig.monthlyPrice,
        maxVehicles: planConfig.maxVehicles,
        maxServiceRequestsPerMonth: planConfig.maxRequestsPerMonth,
        status: "ACTIVE" as const,
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
        trialEnd: selectedClientPlan === "FREE" ? null : periodEnd,
      };
      const currentSub = await prisma.subscription.findFirst({
        where: { userId, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
      });

      if (currentSub && !currentSub.stripeSubscriptionId) {
        await prisma.subscription.update({
          where: { id: currentSub.id },
          data,
        });
        return;
      }

      if (!currentSub) {
        await prisma.subscription.create({
          data: {
            userId,
            ...data,
          },
        });
      }
    };
    const marketplaceBusinessTypeCat =
      marketplaceType === "CAR_WASH" || marketplaceType === "AUTO_PARTS"
        ? marketplaceType
        : undefined;

    // User's preferred OTP method (default: sms)
    const userPreferredMethod: "sms" | "email" = preferredOtpMethod === "email" ? "email" : "sms";

    // Validar força da senha
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      throw new AppError(passwordValidation.message!, 400, "WEAK_PASSWORD");
    }

    // Verificar se email já existe
    const existingEmail = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingEmail) {
      // Se o usuário existe mas NÃO verificou o telefone → reenviar OTP
      if (!existingEmail.phoneVerified) {
        logger.info(`Reenvio de OTP para usuário não verificado: ${email}`);

        // Update role if re-signing up as a different role (e.g., CLIENT → PROVIDER)
        if (existingEmail.role !== userRole) {
          await prisma.user.update({
            where: { id: existingEmail.id },
            data: {
              role: userRole,
              fullName: fullName || existingEmail.fullName,
              passwordHash: await hashPassword(password),
            },
          });
          logger.info(
            `Role atualizado de ${existingEmail.role} para ${userRole} para: ${email}`,
          );
        }

        // Cria ProviderProfile se ainda não existe — SQL direto (imune ao Prisma Client stale)
        if (userRole === "PROVIDER" && businessName) {
          await insertProviderProfileRaw({
            userId: existingEmail.id,
            businessName,
            businessType: marketplaceType || null,
            businessTypeCat: marketplaceBusinessTypeCat || "REPAIR_SHOP",
            legalName: legalName || null,
            ein: ein || null,
            sunbizDocumentNumber: sunbizDocumentNumber || null,
            businessIdentityStatus:
              legalName || ein || sunbizDocumentNumber ? "PROVIDED_UNVERIFIED" : "NOT_PROVIDED",
            address: businessAddress || "",
            city: businessCity || "",
            state: businessState || "FL",
            zipCode: businessZipCode || "",
            servicesOffered: servicesOffered || [],
            vehicleTypesServed: vehicleTypesServed || [],
            sellsParts: sellsParts || false,
            payoutMethod: payoutMethod || "MANUAL",
            zelleEmail: zelleEmail || null,
            zellePhone: zellePhone || null,
            bankTransferLabel: bankTransferLabel || null,
            bankAccountType: bankAccountType || null,
            bankAccountNumber: bankAccountNumber || null,
            bankRoutingNumber: bankRoutingNumber || null,
            cityBusinessTaxReceiptNumber: cityBusinessTaxReceiptNumber || null,
            countyBusinessTaxReceiptNumber: countyBusinessTaxReceiptNumber || null,
            businessTaxReceiptStatus:
              cityBusinessTaxReceiptNumber || countyBusinessTaxReceiptNumber
                ? "PROVIDED_UNVERIFIED" : "NOT_PROVIDED",
            marketplaceFacilitatorTaxAcknowledged: marketplaceFacilitatorTaxAcknowledged !== false,
            insuranceDisclosureAcceptedAt: insuranceDisclosureAccepted ? new Date() : null,
          });
          logger.info(`ProviderProfile upserted (email path): ${email}`);
        }

        if (userRole === "CLIENT") {
          await syncSelectedClientSubscription(existingEmail.id);
        }

        let otpSent = false;
        let otpMethod: "sms" | "email" = userPreferredMethod;

        if (userPreferredMethod === "email") {
          try {
            const otpCode = generateOTP();
            const otpExpiresAt = getOTPExpiration();
            await prisma.user.update({
              where: { id: existingEmail.id },
              data: { emailOtpCode: otpCode, emailOtpExpiresAt: otpExpiresAt },
            });
            await sendOTPEmail(existingEmail.email, otpCode, existingEmail.language);
            otpSent = true;
          } catch (emailError: any) {
            logger.error("Erro ao reenviar OTP via email:", emailError.message);
            try {
              await issueSmsOTP(existingEmail.id, existingEmail.phone, existingEmail.language);
              otpSent = true;
              otpMethod = "sms";
            } catch (smsError: any) {
              logger.error("Erro ao reenviar OTP via SMS (fallback):", smsError.message);
            }
          }
        } else {
          try {
            await issueSmsOTP(existingEmail.id, existingEmail.phone, existingEmail.language);
            otpSent = true;
          } catch (smsError: any) {
            logger.error("Erro ao reenviar OTP via SMS:", smsError.message);
            try {
              const otpCode = generateOTP();
              const otpExpiresAt = getOTPExpiration();
              await prisma.user.update({
                where: { id: existingEmail.id },
                data: { emailOtpCode: otpCode, emailOtpExpiresAt: otpExpiresAt },
              });
              await sendOTPEmail(existingEmail.email, otpCode, existingEmail.language);
              otpSent = true;
              otpMethod = "email";
            } catch (emailError: any) {
              logger.error("Erro ao enviar OTP via email (fallback):", emailError.message);
            }
          }
        }

        return res.status(200).json({
          success: true,
          message: otpSent
            ? otpMethod === "email"
              ? "Código reenviado por email!"
              : "Código de verificação reenviado!"
            : "Conta encontrada. Use 'Reenviar código' para receber o OTP.",
          data: {
            userId: existingEmail.id,
            email: existingEmail.email,
            phone: existingEmail.phone,
            otpSentTo:
              otpMethod === "email" ? existingEmail.email : existingEmail.phone,
            otpMethod,
            otpSent,
            useVerify: isVerifyEnabled(),
            existing: true,
          },
        });
      }

      // Se já está verificado → redirecionar para login
      throw new AppError(
        "Este email já está cadastrado. Faça login.",
        409,
        "EMAIL_ALREADY_EXISTS",
      );
    }

    // Verificar se telefone já existe (only if phone was provided)
    if (phone) {
      const existingPhone = await prisma.user.findUnique({
        where: { phone },
      });

    if (existingPhone) {
      // Se o usuário existe mas NÃO verificou → reenviar OTP
      if (!existingPhone.phoneVerified) {
        logger.info(`Reenvio de OTP para telefone não verificado: ${phone}`);

        // Update role if re-signing up as a different role
        if (existingPhone.role !== userRole) {
          await prisma.user.update({
            where: { id: existingPhone.id },
            data: {
              role: userRole,
              fullName: fullName || existingPhone.fullName,
              passwordHash: await hashPassword(password),
            },
          });
          logger.info(
            `Role atualizado de ${existingPhone.role} para ${userRole} para phone: ${phone}`,
          );
        }

        // Cria ProviderProfile se ainda não existe — SQL direto (imune ao Prisma Client stale)
        if (userRole === "PROVIDER" && businessName) {
          await insertProviderProfileRaw({
            userId: existingPhone.id,
            businessName,
            businessType: marketplaceType || null,
            businessTypeCat: marketplaceBusinessTypeCat || "REPAIR_SHOP",
            legalName: legalName || null,
            ein: ein || null,
            sunbizDocumentNumber: sunbizDocumentNumber || null,
            businessIdentityStatus:
              legalName || ein || sunbizDocumentNumber ? "PROVIDED_UNVERIFIED" : "NOT_PROVIDED",
            address: businessAddress || "",
            city: businessCity || "",
            state: businessState || "FL",
            zipCode: businessZipCode || "",
            servicesOffered: servicesOffered || [],
            vehicleTypesServed: vehicleTypesServed || [],
            sellsParts: sellsParts || false,
            payoutMethod: payoutMethod || "MANUAL",
            zelleEmail: zelleEmail || null,
            zellePhone: zellePhone || null,
            bankTransferLabel: bankTransferLabel || null,
            bankAccountType: bankAccountType || null,
            bankAccountNumber: bankAccountNumber || null,
            bankRoutingNumber: bankRoutingNumber || null,
            cityBusinessTaxReceiptNumber: cityBusinessTaxReceiptNumber || null,
            countyBusinessTaxReceiptNumber: countyBusinessTaxReceiptNumber || null,
            businessTaxReceiptStatus:
              cityBusinessTaxReceiptNumber || countyBusinessTaxReceiptNumber
                ? "PROVIDED_UNVERIFIED" : "NOT_PROVIDED",
            marketplaceFacilitatorTaxAcknowledged: marketplaceFacilitatorTaxAcknowledged !== false,
            insuranceDisclosureAcceptedAt: insuranceDisclosureAccepted ? new Date() : null,
          });
          logger.info(`ProviderProfile upserted (phone path): ${phone}`);
        }

        if (userRole === "CLIENT") {
          await syncSelectedClientSubscription(existingPhone.id);
        }

        let otpSent = false;
        let otpMethod: "sms" | "email" = userPreferredMethod;

        if (userPreferredMethod === "email") {
          try {
            const otpCode = generateOTP();
            const otpExpiresAt = getOTPExpiration();
            await prisma.user.update({
              where: { id: existingPhone.id },
              data: { emailOtpCode: otpCode, emailOtpExpiresAt: otpExpiresAt },
            });
            await sendOTPEmail(existingPhone.email, otpCode, existingPhone.language);
            otpSent = true;
          } catch (emailError: any) {
            logger.error("Erro ao reenviar OTP via email:", emailError.message);
            try {
              await issueSmsOTP(existingPhone.id, phone, existingPhone.language);
              otpSent = true;
              otpMethod = "sms";
            } catch (smsError: any) {
              logger.error("Erro ao reenviar OTP via SMS (fallback):", smsError.message);
            }
          }
        } else {
          try {
            await issueSmsOTP(existingPhone.id, phone, existingPhone.language);
            otpSent = true;
          } catch (smsError: any) {
            logger.error("Erro ao reenviar OTP via SMS:", smsError.message);
            try {
              const otpCode = generateOTP();
              const otpExpiresAt = getOTPExpiration();
              await prisma.user.update({
                where: { id: existingPhone.id },
                data: { emailOtpCode: otpCode, emailOtpExpiresAt: otpExpiresAt },
              });
              await sendOTPEmail(existingPhone.email, otpCode, existingPhone.language);
              otpSent = true;
              otpMethod = "email";
            } catch (emailError: any) {
              logger.error("Erro ao enviar OTP via email (fallback):", emailError.message);
            }
          }
        }

        return res.status(200).json({
          success: true,
          message: otpSent
            ? otpMethod === "email"
              ? "Código reenviado por email!"
              : "Código de verificação reenviado!"
            : "Conta encontrada. Use 'Reenviar código' para receber o OTP.",
          data: {
            userId: existingPhone.id,
            email: existingPhone.email,
            phone: existingPhone.phone,
            otpSentTo:
              otpMethod === "email" ? existingPhone.email : existingPhone.phone,
            otpMethod,
            otpSent,
            useVerify: isVerifyEnabled(),
            existing: true,
          },
        });
      }

      throw new AppError(
        "Este telefone já está cadastrado. Faça login.",
        409,
        "PHONE_ALREADY_EXISTS",
      );
    }
    } // end if (phone)

    // Hash da senha
    const passwordHash = await hashPassword(password);

    // Para legacy (sem Verify): gerar OTP e salvar no DB
    // Para Verify: gerar placeholder (o Twilio gera o código real)
    const otpCode = generateOTP();
    const otpExpiresAt = getOTPExpiration();

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        fullName,
        email: email.toLowerCase(),
        phone: phone || null,
        passwordHash,
        language: language || "EN",
        otpCode: isVerifyEnabled() ? null : otpCode,
        otpExpiresAt: isVerifyEnabled() ? null : otpExpiresAt,
        role: userRole,
        status: "PENDING_VERIFICATION",
      },
    });

    // Cria ProviderProfile — SQL direto (imune ao Prisma Client stale do Render)
    if (userRole === "PROVIDER" && businessName) {
      await insertProviderProfileRaw({
        userId: user.id,
        businessName,
        businessType: marketplaceType || null,
        businessTypeCat: marketplaceBusinessTypeCat || "REPAIR_SHOP",
        legalName: legalName || null,
        ein: ein || null,
        sunbizDocumentNumber: sunbizDocumentNumber || null,
        businessIdentityStatus:
          legalName || ein || sunbizDocumentNumber ? "PROVIDED_UNVERIFIED" : "NOT_PROVIDED",
        address: businessAddress || "",
        city: businessCity || "",
        state: businessState || "FL",
        zipCode: businessZipCode || "",
        servicesOffered: servicesOffered || [],
        vehicleTypesServed: vehicleTypesServed || [],
        sellsParts: sellsParts || false,
        payoutMethod: payoutMethod || "MANUAL",
        zelleEmail: zelleEmail || null,
        zellePhone: zellePhone || null,
        bankTransferLabel: bankTransferLabel || null,
        bankAccountType: bankAccountType || null,
        bankAccountNumber: bankAccountNumber || null,
        bankRoutingNumber: bankRoutingNumber || null,
        cityBusinessTaxReceiptNumber: cityBusinessTaxReceiptNumber || null,
        countyBusinessTaxReceiptNumber: countyBusinessTaxReceiptNumber || null,
        businessTaxReceiptStatus:
          cityBusinessTaxReceiptNumber || countyBusinessTaxReceiptNumber
            ? "PROVIDED_UNVERIFIED" : "NOT_PROVIDED",
        marketplaceFacilitatorTaxAcknowledged: marketplaceFacilitatorTaxAcknowledged !== false,
        insuranceDisclosureAcceptedAt: insuranceDisclosureAccepted ? new Date() : null,
      });
      logger.info(`ProviderProfile criado (new user path): ${email}`);
    }

    // Criar assinatura local com o plano escolhido; checkout captura o cartão após OTP.
    if (userRole === "CLIENT") {
      await syncSelectedClientSubscription(user.id);
    }

    // Enviar OTP — respeita preferência do usuário (sms ou email)
    // If no phone provided, force email verification
    let otpSent = false;
    let otpMethod: "sms" | "email" = !phone ? "email" : userPreferredMethod;

    if (userPreferredMethod === "email") {
      // ── Usuário escolheu receber por EMAIL ──
      try {
        const emailOtpCode = generateOTP();
        const emailOtpExpiresAt = getOTPExpiration();
        await prisma.user.update({
          where: { id: user.id },
          data: { emailOtpCode, emailOtpExpiresAt },
        });
        await sendOTPEmail(email, emailOtpCode, language || "EN");
        otpSent = true;
        otpMethod = "email";
        logger.info(`OTP enviado por EMAIL (preferência do usuário) para: ${email}`);
      } catch (emailError: any) {
        logger.error("Erro ao enviar OTP via email:", emailError.message);
        // Fallback para SMS
        try {
          await issueSmsOTP(user.id, phone, language || "EN");
          otpSent = true;
          otpMethod = "sms";
          logger.info(`OTP enviado por SMS (fallback de email) para: ${phone}`);
        } catch (smsError: any) {
          logger.error("Erro ao enviar OTP via SMS (fallback):", smsError.message);
        }
      }
    } else {
      // ── Usuário escolheu SMS (padrão) ──
      try {
        await issueSmsOTP(user.id, phone, language || "EN");
        otpSent = true;
      } catch (smsError: any) {
        logger.error("Erro ao enviar OTP via SMS:", smsError.message);
        try {
          const emailOtpCode = generateOTP();
          const emailOtpExpiresAt = getOTPExpiration();
          await prisma.user.update({
            where: { id: user.id },
            data: { emailOtpCode, emailOtpExpiresAt },
          });
          await sendOTPEmail(email, emailOtpCode, language || "EN");
          otpSent = true;
          otpMethod = "email";
          logger.info(`OTP enviado por EMAIL (fallback SMS) para: ${email}`);
        } catch (emailError: any) {
          logger.error(
            "Erro ao enviar OTP via email (fallback):",
            emailError.message,
          );
        }
      }
    }

    logger.info(
      `Novo usuário cadastrado: ${email} (OTP sent: ${otpSent}, method: ${otpMethod}, preferred: ${userPreferredMethod}, verify: ${isVerifyEnabled()})`,
    );

    return res.status(201).json({
      success: true,
      message: otpSent
        ? otpMethod === "email"
          ? "Conta criada! Código enviado por email."
          : "Conta criada! Verifique seu telefone."
        : "Conta criada! Não foi possível enviar o código. Use 'Reenviar código'.",
      data: {
        userId: user.id,
        email: user.email,
        phone: user.phone,
        otpSentTo: otpMethod === "email" ? user.email : user.phone,
        otpMethod,
        otpSent,
        useVerify: isVerifyEnabled() && otpMethod === "sms",
      },
    });
  } catch (error) {
    throw error;
  }
};

// ============================================
// SOCIAL LOGIN (Google / Apple / Facebook)
// ============================================

/**
 * Verifica token do Google
 */
async function verifyGoogleToken(
  accessToken: string,
): Promise<{ id: string; email: string; name: string; picture?: string }> {
  const response = await fetch("https://www.googleapis.com/userinfo/v2/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new AppError("Invalid Google token", 401, "INVALID_GOOGLE_TOKEN");
  }

  const data: any = await response.json();
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    picture: data.picture,
  };
}

/**
 * Verifica token da Apple (identityToken é um JWT)
 */
async function verifyAppleToken(
  identityToken: string,
  appleUserId: string,
): Promise<{ id: string; email: string | null; name: string | null }> {
  try {
    // Decode the Apple identity token (JWT)
    // Apple tokens are signed JWTs. For production, verify signature with Apple's public keys.
    // For now, we decode and validate the payload.
    const parts = identityToken.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid Apple token format");
    }

    const payload = JSON.parse(
      Buffer.from(parts[1], "base64").toString("utf8"),
    );

    // Verify issuer and audience
    if (payload.iss !== "https://appleid.apple.com") {
      throw new Error("Invalid Apple token issuer");
    }

    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      throw new Error("Apple token expired");
    }

    return {
      id: appleUserId || payload.sub,
      email: payload.email || null,
      name: null, // Apple only sends name on first sign-in
    };
  } catch (error: any) {
    logger.error("Apple token verification failed:", error);
    throw new AppError("Invalid Apple token", 401, "INVALID_APPLE_TOKEN");
  }
}

/**
 * Verifica token do Facebook
 */
async function verifyFacebookToken(
  accessToken: string,
): Promise<{ id: string; email: string; name: string; picture?: string }> {
  const response = await fetch(
    `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${accessToken}`,
  );

  if (!response.ok) {
    throw new AppError("Invalid Facebook token", 401, "INVALID_FACEBOOK_TOKEN");
  }

  const data: any = await response.json();
  if (!data.email) {
    throw new AppError(
      "Email permission required from Facebook",
      400,
      "FACEBOOK_EMAIL_REQUIRED",
    );
  }

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    picture: data.picture?.data?.url,
  };
}

/**
 * POST /api/v1/auth/social
 * Login/cadastro via conta social (Google, Apple, Facebook)
 *
 * Flow:
 * 1. Receive provider token
 * 2. Verify with provider API
 * 3. Find existing user by socialId or email
 * 4. If exists and has password → login directly
 * 5. If exists but no social link → link account
 * 6. If new → create account, return NEEDS_PASSWORD status
 */
export const socialLogin = async (req: Request, res: Response) => {
  try {
    const {
      provider,
      token,
      appleUserId,
      fullName: providedName,
      phone,
    } = req.body;

    if (!provider || !token) {
      throw new AppError(
        "Provider and token are required",
        400,
        "MISSING_FIELDS",
      );
    }

    // 1. Verify token with social provider
    let socialUser: {
      id: string;
      email: string | null;
      name: string | null;
      picture?: string;
    };

    switch (provider.toUpperCase()) {
      case "GOOGLE":
        socialUser = await verifyGoogleToken(token);
        break;
      case "APPLE":
        socialUser = await verifyAppleToken(token, appleUserId);
        break;
      case "FACEBOOK":
        socialUser = await verifyFacebookToken(token);
        break;
      default:
        throw new AppError("Unsupported provider", 400, "UNSUPPORTED_PROVIDER");
    }

    if (!socialUser.email) {
      throw new AppError(
        "Email is required from social provider",
        400,
        "EMAIL_REQUIRED",
      );
    }

    const socialIdField = `${provider.toLowerCase()}Id` as
      | "googleId"
      | "appleId"
      | "facebookId";

    // 2. Check if user exists by social ID
    let user = await prisma.user.findFirst({
      where: { [socialIdField]: socialUser.id },
    });

    // 3. Check if user exists by email (link social account)
    if (!user) {
      user = await prisma.user.findUnique({
        where: { email: socialUser.email.toLowerCase() },
      });

      if (user) {
        // Link social account to existing user
        await prisma.user.update({
          where: { id: user.id },
          data: {
            [socialIdField]: socialUser.id,
            avatarUrl: user.avatarUrl || socialUser.picture || undefined,
            emailVerified: true, // Email is verified by social provider
          },
        });
        logger.info(
          `Social account ${provider} linked to existing user: ${user.email}`,
        );
      }
    }

    // 4. If user exists with password set → login directly
    if (user && user.passwordHash && user.status === "ACTIVE") {
      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          avatarUrl: user.avatarUrl || socialUser.picture || undefined,
        },
      });

      const tokens = generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      logger.info(`Social login (${provider}): ${user.email}`);

      return res.json({
        success: true,
        data: {
          status: "AUTHENTICATED",
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            role: user.role,
            language: user.language,
            phoneVerified: user.phoneVerified,
            avatarUrl: user.avatarUrl,
          },
        },
      });
    }

    // 5. If user exists but needs password or verification
    if (
      user &&
      (!user.passwordHash || user.status === "PENDING_VERIFICATION")
    ) {
      // Apple Sign In: auto-activate without requiring password (Apple Guideline 4)
      if (provider.toUpperCase() === "APPLE") {
        // Generate a random password hash so the user can always auth via Apple
        const crypto = await import("crypto");
        const randomPass = crypto.randomBytes(32).toString("hex");
        const randomHash = await hashPassword(randomPass);

        await prisma.user.update({
          where: { id: user.id },
          data: {
            passwordHash: randomHash,
            status: "ACTIVE",
            emailVerified: true,
            lastLoginAt: new Date(),
            avatarUrl: user.avatarUrl || socialUser.picture || undefined,
          },
        });

        const tokens = generateTokens({
          userId: user.id,
          email: user.email,
          role: user.role,
        });

        logger.info(`Apple auto-activated existing user: ${user.email}`);

        return res.json({
          success: true,
          data: {
            status: "AUTHENTICATED",
            token: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
            user: {
              id: user.id,
              fullName: user.fullName,
              email: user.email,
              phone: user.phone,
              role: user.role,
              language: user.language,
              phoneVerified: user.phoneVerified,
              avatarUrl: user.avatarUrl,
            },
          },
        });
      }

      return res.json({
        success: true,
        data: {
          status: "NEEDS_PASSWORD",
          userId: user.id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          provider,
          message: "Please set a password to complete your account setup.",
        },
      });
    }

    // 6. New user → create account
    // Require phone for new accounts (can be sent in request body or set later)
    const newUserPhone = phone || `+0${Date.now()}`; // Temporary placeholder if no phone
    const hasRealPhone = !!phone;
    const isApple = provider.toUpperCase() === "APPLE";

    // Apple Sign In: generate random password and auto-activate (Guideline 4)
    let newPasswordHash = "";
    if (isApple) {
      const crypto = await import("crypto");
      const randomPass = crypto.randomBytes(32).toString("hex");
      newPasswordHash = await hashPassword(randomPass);
    }

    const newUser = await prisma.user.create({
      data: {
        fullName:
          socialUser.name || providedName || socialUser.email.split("@")[0],
        email: socialUser.email.toLowerCase(),
        phone: newUserPhone,
        passwordHash: newPasswordHash,
        authProvider: provider.toUpperCase(),
        [socialIdField]: socialUser.id,
        avatarUrl: socialUser.picture || null,
        emailVerified: true, // Verified by social provider
        phoneVerified: hasRealPhone,
        status: isApple ? "ACTIVE" : "PENDING_VERIFICATION",
        role: "CLIENT",
        language: "EN",
      },
    });

    // Create FREE subscription
    await prisma.subscription.create({
      data: {
        userId: newUser.id,
        plan: "FREE",
        price: 0,
        maxVehicles: 1,
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    logger.info(`New social user created (${provider}): ${newUser.email}`);

    // Apple: return AUTHENTICATED directly (no password screen)
    if (isApple) {
      const tokens = generateTokens({
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
      });

      // Send welcome email
      sendWelcomeEmail(
        newUser.email,
        newUser.fullName,
        newUser.language,
      ).catch((err) => {
        logger.error("Failed to send welcome email:", err);
      });

      return res.status(201).json({
        success: true,
        data: {
          status: "AUTHENTICATED",
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          user: {
            id: newUser.id,
            fullName: newUser.fullName,
            email: newUser.email,
            phone: hasRealPhone ? newUser.phone : null,
            role: newUser.role,
            language: newUser.language,
            phoneVerified: hasRealPhone,
            avatarUrl: newUser.avatarUrl,
          },
        },
      });
    }

    return res.status(201).json({
      success: true,
      data: {
        status: "NEEDS_PASSWORD",
        userId: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        phone: hasRealPhone ? newUser.phone : null,
        provider,
        message: "Account created. Please set a password and phone number.",
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * POST /api/v1/auth/social/complete
 * Complete social login registration (set password + phone)
 */
export const completeSocialSignup = async (req: Request, res: Response) => {
  try {
    const { userId, password, phone } = req.body;

    if (!userId) {
      throw new AppError(
        "User ID is required",
        400,
        "MISSING_FIELDS",
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    // Prepare update data
    const updateData: any = {
      status: "ACTIVE",
    };

    // Hash password if provided (optional for Apple users)
    if (password) {
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        throw new AppError(passwordValidation.message!, 400, "WEAK_PASSWORD");
      }
      updateData.passwordHash = await hashPassword(password);
    } else if (!user.passwordHash || user.passwordHash === "") {
      // No password provided and no existing password — generate random one
      const crypto = await import("crypto");
      const randomPass = crypto.randomBytes(32).toString("hex");
      updateData.passwordHash = await hashPassword(randomPass);
    }

    // Update phone if provided
    if (phone) {
      // Check phone uniqueness
      const existingPhone = await prisma.user.findUnique({ where: { phone } });
      if (existingPhone && existingPhone.id !== userId) {
        throw new AppError(
          "This phone number is already registered",
          409,
          "PHONE_ALREADY_EXISTS",
        );
      }
      updateData.phone = phone;

      if (isVerifyEnabled()) {
        // Twilio Verify: send OTP via Verify API (no DB storage needed)
        sendVerifyOTP(phone, "sms").catch((err) => {
          logger.error("Error sending Verify OTP after social signup:", err);
        });
      } else {
        // Legacy: generate OTP, store in DB, send via Messages API
        const otpCode = generateOTP();
        const otpExpiresAt = getOTPExpiration();
        updateData.otpCode = otpCode;
        updateData.otpExpiresAt = otpExpiresAt;

        sendOTP(phone, otpCode).catch((err) => {
          logger.error("Error sending OTP after social signup:", err);
        });
      }
    } else if (user.phone && !user.phone.startsWith("+0")) {
      // Has valid phone, set active
      updateData.status = "ACTIVE";
      updateData.phoneVerified = true;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // If phone needs verification, return pending state
    if (phone && !user.phoneVerified) {
      return res.json({
        success: true,
        data: {
          status: "NEEDS_PHONE_VERIFICATION",
          userId: updatedUser.id,
          phone: updatedUser.phone,
          message: "Password set. Please verify your phone number.",
        },
      });
    }

    // Generate tokens
    const tokens = generateTokens({
      userId: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
    });

    // Send welcome email
    sendWelcomeEmail(
      updatedUser.email,
      updatedUser.fullName,
      updatedUser.language,
    ).catch((err) => {
      logger.error("Failed to send welcome email:", err);
    });

    logger.info(`Social signup completed: ${updatedUser.email}`);

    return res.json({
      success: true,
      data: {
        status: "AUTHENTICATED",
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        user: {
          id: updatedUser.id,
          fullName: updatedUser.fullName,
          email: updatedUser.email,
          phone: updatedUser.phone,
          role: updatedUser.role,
          language: updatedUser.language,
          phoneVerified: updatedUser.phoneVerified,
          avatarUrl: updatedUser.avatarUrl,
        },
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * POST /api/v1/auth/verify-otp
 * Verifica código OTP do telefone ou email
 */
export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { userId, otpCode, code, method } = req.body;

    // Aceita tanto 'otpCode' quanto 'code' para compatibilidade
    const receivedCode = otpCode || code;
    const verifyMethod = method || "sms"; // 'sms' or 'email'

    console.log("📥 Recebido verify-otp:", {
      userId,
      otpCode,
      code,
      receivedCode,
      method: verifyMethod,
      body: req.body,
    });

    // Trim para garantir que não há espaços
    const cleanOtpCode = receivedCode?.trim();

    // Validar formato do OTP
    if (!validateOTPFormat(cleanOtpCode)) {
      throw new AppError("Código OTP inválido", 400, "INVALID_OTP_FORMAT");
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("Usuário não encontrado", 404, "USER_NOT_FOUND");
    }

    // Check based on verification method
    if (verifyMethod === "email") {
      // Verify email OTP
      if (isOTPExpired(user.emailOtpExpiresAt)) {
        throw new AppError(
          "Código expirado. Solicite um novo.",
          400,
          "OTP_EXPIRED",
        );
      }
      if (user.emailOtpCode?.trim() !== cleanOtpCode) {
        throw new AppError("Código incorreto", 400, "INVALID_OTP");
      }

      const updatedUser = await markEmailVerified(userId);
      if (!updatedUser) {
        throw new AppError("Usuário não encontrado", 404, "USER_NOT_FOUND");
      }

      const tokens = generateTokens({
        userId: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
      });

      logger.info(`Email verificado: ${updatedUser.email}`);

      return res.json({
        success: true,
        message: "Email verificado com sucesso!",
        data: {
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          user: {
            id: updatedUser.id,
            fullName: updatedUser.fullName,
            email: updatedUser.email,
            phone: updatedUser.phone,
            role: updatedUser.role,
            language: updatedUser.language,
            phoneVerified: updatedUser.phoneVerified,
            emailVerified: updatedUser.emailVerified,
            providerProfile: updatedUser.providerProfile
              ? {
                  id: updatedUser.providerProfile.id,
                  businessName: updatedUser.providerProfile.businessName,
                  businessType: updatedUser.providerProfile.businessType,
                  servicesOffered: updatedUser.providerProfile.servicesOffered,
                  vehicleTypesServed:
                    updatedUser.providerProfile.vehicleTypesServed,
                  sellsParts: updatedUser.providerProfile.sellsParts,
                  isVerified: updatedUser.providerProfile.isVerified,
                  averageRating: Number(updatedUser.providerProfile.averageRating || 0),
                  totalReviews: updatedUser.providerProfile.totalReviews,
                  website: updatedUser.providerProfile.website,
                  address: updatedUser.providerProfile.address,
                  city: updatedUser.providerProfile.city,
                  state: updatedUser.providerProfile.state,
                  zipCode: updatedUser.providerProfile.zipCode,
                  fdacsRegistrationNumber:
                    updatedUser.providerProfile.fdacsRegistrationNumber,
                }
              : undefined,
          },
        },
      });
    }

    // SMS OTP verification (default)
    if (user.phoneVerified) {
      throw new AppError("Telefone já verificado", 400, "ALREADY_VERIFIED");
    }

    const hasLocalSmsCode = !!user.otpCode;
    let smsApprovedByLocalCode = false;

    if (hasLocalSmsCode) {
      if (isOTPExpired(user.otpExpiresAt)) {
        throw new AppError(
          "Código expirado. Solicite um novo.",
          400,
          "OTP_EXPIRED",
        );
      }
      smsApprovedByLocalCode = user.otpCode?.trim() === cleanOtpCode;
    }

    // Verificar código salvo localmente primeiro; se não existir, usa Twilio Verify.
    if (smsApprovedByLocalCode) {
      logger.info(`SMS OTP validado localmente para: ${user.email}`);
    } else if (isVerifyEnabled() && !hasLocalSmsCode) {
      const verifyResult = await checkVerifyOTP(user.phone || "", cleanOtpCode);
      if (!verifyResult.valid) {
        if (verifyResult.status === "expired") {
          throw new AppError(
            "Código expirado. Solicite um novo.",
            400,
            "OTP_EXPIRED",
          );
        }
        throw new AppError("Código incorreto", 400, "INVALID_OTP");
      }
    } else if (!smsApprovedByLocalCode) {
      throw new AppError("Código incorreto", 400, "INVALID_OTP");
    }

    const updatedUser = await markPhoneVerified(userId);
    if (!updatedUser) {
      throw new AppError("Usuário não encontrado", 404, "USER_NOT_FOUND");
    }

    // Gerar tokens
    const tokens = generateTokens({
      userId: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
    });

    logger.info(`Telefone verificado: ${updatedUser.email}`);

    return res.json({
      success: true,
      message: "Telefone verificado com sucesso!",
      data: {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        user: {
          id: updatedUser.id,
          fullName: updatedUser.fullName,
          email: updatedUser.email,
          phone: updatedUser.phone,
          role: updatedUser.role,
          language: updatedUser.language,
          phoneVerified: updatedUser.phoneVerified,
          emailVerified: updatedUser.emailVerified,
          providerProfile: updatedUser.providerProfile
            ? {
                id: updatedUser.providerProfile.id,
                businessName: updatedUser.providerProfile.businessName,
                businessType: updatedUser.providerProfile.businessType,
                servicesOffered: updatedUser.providerProfile.servicesOffered,
                vehicleTypesServed:
                  updatedUser.providerProfile.vehicleTypesServed,
                sellsParts: updatedUser.providerProfile.sellsParts,
                isVerified: updatedUser.providerProfile.isVerified,
                averageRating: Number(updatedUser.providerProfile.averageRating || 0),
                totalReviews: updatedUser.providerProfile.totalReviews,
                website: updatedUser.providerProfile.website,
                address: updatedUser.providerProfile.address,
                city: updatedUser.providerProfile.city,
                state: updatedUser.providerProfile.state,
                zipCode: updatedUser.providerProfile.zipCode,
                fdacsRegistrationNumber: updatedUser.providerProfile.fdacsRegistrationNumber,
              }
            : undefined,
        },
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * POST /api/v1/auth/resend-otp
 * Reenvia código OTP (SMS ou Email)
 */
export const resendOTP = async (req: Request, res: Response) => {
  try {
    const { userId, method } = req.body; // method: 'sms' | 'email' (default: 'sms')

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("Usuário não encontrado", 404, "USER_NOT_FOUND");
    }

    if (user.phoneVerified && method !== "email") {
      throw new AppError("Telefone já verificado", 400, "ALREADY_VERIFIED");
    }

    const deliveryMethod = method === "email" ? "email" : "sms";

    // Gera e persiste OTP antes de qualquer envio
    const otpCode = generateOTP();
    const otpExpiresAt = getOTPExpiration();

    if (deliveryMethod === "email") {
      // ── Email OTP ──
      await prisma.user.update({
        where: { id: userId },
        data: { emailOtpCode: otpCode, emailOtpExpiresAt: otpExpiresAt },
      });

      try {
        await sendOTPEmail(user.email, otpCode, user.language);
        logger.info(`OTP sent via email to: ${user.email}`);
        return res.json({
          success: true,
          message: "Novo código enviado por email",
          data: { method: "email", otpSentTo: user.email, expiresIn: 600 },
        });
      } catch (emailErr: any) {
        logger.error(`Resend failed for ${user.email}:`, emailErr.message);
        // OTP já está salvo no DB — usuário pode tentar digitar se receber depois
        return res.json({
          success: true,
          message: "Código gerado. Verifique sua caixa de spam ou tente novamente em alguns minutos.",
          data: { method: "email", otpSentTo: user.email, expiresIn: 600, deliveryWarning: true },
        });
      }
    }

    // ── SMS OTP (com fallback email) ──
    let actualMethod: "sms" | "email" = "sms";
    let smsFailed = false;

    try {
      await issueSmsOTP(userId, user.phone, user.language);
      logger.info(`OTP reenviado via SMS para: ${user.phone}`);
    } catch (smsError: any) {
      smsFailed = true;
      logger.error(`SMS failed (${user.phone}): ${smsError.message}`);

      // Tenta email como fallback
      await prisma.user.update({
        where: { id: userId },
        data: { emailOtpCode: otpCode, emailOtpExpiresAt: otpExpiresAt },
      });

      try {
        await sendOTPEmail(user.email, otpCode, user.language);
        actualMethod = "email";
        logger.info(`OTP sent via EMAIL fallback to: ${user.email}`);
      } catch (emailError: any) {
        logger.error(`Email fallback also failed for ${user.email}: ${emailError.message}`);
        // Ambos falharam — OTP já está no DB, retorna 200 com aviso
        return res.json({
          success: false,
          message: "SMS indisponível para este número. Verifique sua caixa de email (incluindo spam) ou cadastre um número de celular válido.",
          data: { method: "email", otpSentTo: user.email, expiresIn: 600, deliveryWarning: true },
        });
      }
    }

    return res.json({
      success: true,
      message: smsFailed
        ? "SMS indisponível para este número. Código enviado por email."
        : "Novo código enviado por SMS",
      data: {
        method: actualMethod,
        otpSentTo: actualMethod === "email" ? user.email : user.phone,
        expiresIn: 600,
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * POST /api/v1/auth/login
 * Login de usuário
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    console.log("🔐 Tentativa de login:", { email });

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { providerProfile: true },
    });

    if (!user) {
      console.log("❌ Usuário não encontrado:", email);
      throw new AppError(
        "Email ou senha incorretos",
        401,
        "INVALID_CREDENTIALS",
      );
    }

    console.log("👤 Usuário encontrado:", {
      id: user.id,
      status: user.status,
      phoneVerified: user.phoneVerified,
    });

    // Verificar senha
    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      console.log("❌ Senha inválida para:", email);
      throw new AppError(
        "Email ou senha incorretos",
        401,
        "INVALID_CREDENTIALS",
      );
    }

    console.log("✅ Senha válida para:", email);

    // Verificar status da conta
    if (user.status === "SUSPENDED") {
      throw new AppError(
        "Conta suspensa. Entre em contato com o suporte.",
        403,
        "ACCOUNT_SUSPENDED",
      );
    }

    if (user.status === "INACTIVE") {
      throw new AppError("Conta inativa", 403, "ACCOUNT_INACTIVE");
    }

    // Verificar se telefone foi verificado (usuário precisa completar cadastro)
    // Skip phone verification check if user has no real phone (phone is optional per Guideline 5.1.1v)
    const hasRealPhone = user.phone && !user.phone.startsWith("+0");
    if (
      hasRealPhone &&
      (user.status === "PENDING_VERIFICATION" || !user.phoneVerified)
    ) {
      console.log("⚠️ Telefone não verificado para:", email);

      let otpSent = false;

      try {
        await issueSmsOTP(user.id, user.phone, user.language);
        otpSent = true;
      } catch (err) {
        logger.error("Erro ao enviar OTP no login:", err);
      }

      return res.status(403).json({
        success: false,
        message: otpSent
          ? "Verifique seu telefone para continuar. Código enviado!"
          : "Verifique seu telefone para continuar.",
        code: "PHONE_NOT_VERIFIED",
        data: {
          userId: user.id,
          phone: user.phone,
          otpSentTo: user.phone,
          otpSent,
          useVerify: isVerifyEnabled(),
          needsVerification: true,
        },
      });
    }

    // Auto-activate PENDING_VERIFICATION users without a real phone (they passed password check)
    if (user.status === "PENDING_VERIFICATION" && !hasRealPhone) {
      await prisma.user.update({
        where: { id: user.id },
        data: { status: "ACTIVE" },
      });
    }

    // Atualizar último login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // D30 — Create login session record
    try {
      const ua = req.headers['user-agent'] || '';
      const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || '';
      // Mark all previous sessions as not current
      await prisma.loginSession.updateMany({
        where: { userId: user.id, isCurrentSession: true },
        data: { isCurrentSession: false },
      });
      await prisma.loginSession.create({
        data: {
          userId: user.id,
          deviceName: ua.includes('Expo') || ua.includes('okhttp') ? 'TechTrust App' : (ua.includes('iPhone') ? 'iPhone' : (ua.includes('Android') ? 'Android' : 'Browser')),
          deviceType: ua.includes('Mobile') || ua.includes('Expo') || ua.includes('okhttp') ? 'mobile' : 'desktop',
          ipAddress: ip,
          userAgent: ua.substring(0, 500),
          isCurrentSession: true,
          lastActiveAt: new Date(),
        },
      });
    } catch (sessionErr) {
      logger.warn('Failed to create login session:', sessionErr);
    }

    // Gerar tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    logger.info(`Login realizado: ${user.email}`);

    return res.json({
      success: true,
      data: {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          language: user.language,
          phoneVerified: user.phoneVerified,
          providerProfile: user.providerProfile
            ? {
                id: user.providerProfile.id,
                businessName: user.providerProfile.businessName,
                businessType: user.providerProfile.businessType,
                servicesOffered: user.providerProfile.servicesOffered,
                vehicleTypesServed: user.providerProfile.vehicleTypesServed,
                sellsParts: user.providerProfile.sellsParts,
                isVerified: user.providerProfile.isVerified,
                averageRating: Number(user.providerProfile.averageRating || 0),
                totalReviews: user.providerProfile.totalReviews,
                website: user.providerProfile.website,
                address: user.providerProfile.address,
                city: user.providerProfile.city,
                state: user.providerProfile.state,
                zipCode: user.providerProfile.zipCode,
                fdacsRegistrationNumber: user.providerProfile.fdacsRegistrationNumber,
              }
            : undefined,
        },
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * POST /api/v1/auth/refresh
 * Renova token de acesso
 */
export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError(
        "Refresh token não fornecido",
        400,
        "MISSING_REFRESH_TOKEN",
      );
    }

    // Verificar refresh token
    const payload = verifyRefreshToken(refreshToken);

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      throw new AppError("Usuário não encontrado", 404, "USER_NOT_FOUND");
    }

    // Gerar novos tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      data: {
        token: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * POST /api/v1/auth/logout
 * Logout (na prática, cliente descarta tokens)
 */
export const logout = async (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Logout realizado com sucesso",
  });
};

/**
 * POST /api/v1/auth/forgot-password
 * Envia link de recuperação de senha por email
 */
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError("Email é obrigatório", 400, "MISSING_EMAIL");
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Por segurança, sempre retornar sucesso mesmo se usuário não existir
    // Isso previne enumeração de emails
    if (!user) {
      logger.info(
        `Tentativa de recuperação para email não cadastrado: ${email}`,
      );
      return res.json({
        success: true,
        message: "Se o email existir, você receberá um link de recuperação.",
      });
    }

    // Gerar token de recuperação (6 dígitos, validade 1 hora)
    const resetToken = generateOTP();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Salvar token no banco
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: resetToken,
        otpExpiresAt: expiresAt,
      },
    });

    // Enviar email de recuperação
    try {
      await sendPasswordResetEmail(email, resetToken, user.language);
      logger.info(`Password reset email sent to: ${email}`);
    } catch (emailError) {
      logger.error(
        `Failed to send password reset email to ${email}:`,
        emailError,
      );
      // Don't fail the request - log and continue
    }

    return res.json({
      success: true,
      message: "Se o email existir, você receberá um código de recuperação.",
    });
  } catch (error) {
    throw error;
  }
};

/**
 * POST /api/v1/auth/reset-password
 * Redefine a senha usando o token recebido
 */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      throw new AppError(
        "Email, token e nova senha são obrigatórios",
        400,
        "MISSING_FIELDS",
      );
    }

    // Validar força da senha
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      throw new AppError(passwordValidation.message!, 400, "WEAK_PASSWORD");
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new AppError("Token inválido ou expirado", 400, "INVALID_TOKEN");
    }

    // Verificar token
    if (user.otpCode !== token) {
      throw new AppError("Token inválido", 400, "INVALID_TOKEN");
    }

    // Verificar expiração
    if (!user.otpExpiresAt || isOTPExpired(user.otpExpiresAt)) {
      throw new AppError(
        "Token expirado. Solicite um novo link de recuperação.",
        400,
        "EXPIRED_TOKEN",
      );
    }

    // Criptografar nova senha
    const hashedPassword = await hashPassword(newPassword);

    // Atualizar senha e limpar token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        otpCode: null,
        otpExpiresAt: null,
      },
    });

    logger.info(`Senha redefinida com sucesso para usuário: ${user.email}`);

    res.json({
      success: true,
      message: "Senha redefinida com sucesso! Faça login com sua nova senha.",
    });
  } catch (error) {
    throw error;
  }
};
