/**
 * ============================================
 * AUTH CONTROLLER
 * ============================================
 * Controla autenticação: cadastro, login, OTP, etc
 */

import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error-handler';
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password';
import { generateTokens, verifyRefreshToken } from '../utils/jwt';
import { generateOTP, getOTPExpiration, isOTPExpired, validateOTPFormat } from '../utils/otp';
import { sendOTP } from '../services/sms.service';
import { logger } from '../config/logger';

/**
 * POST /api/v1/auth/signup
 * Cadastro de novo usuário (cliente)
 */
export const signup = async (req: Request, res: Response) => {
  try {
    const { fullName, email, phone, password, language } = req.body;

    // Validar força da senha
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      throw new AppError(passwordValidation.message!, 400, 'WEAK_PASSWORD');
    }

    // Verificar se email já existe
    const existingEmail = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingEmail) {
      throw new AppError('Este email já está cadastrado', 409, 'EMAIL_ALREADY_EXISTS');
    }

    // Verificar se telefone já existe
    const existingPhone = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingPhone) {
      throw new AppError('Este telefone já está cadastrado', 409, 'PHONE_ALREADY_EXISTS');
    }

    // Hash da senha
    const passwordHash = await hashPassword(password);

    // Gerar OTP
    const otpCode = generateOTP();
    const otpExpiresAt = getOTPExpiration();

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        fullName,
        email: email.toLowerCase(),
        phone,
        passwordHash,
        language: language || 'EN',
        otpCode,
        otpExpiresAt,
        role: 'CLIENT',
        status: 'PENDING_VERIFICATION',
      },
    });

    // Criar assinatura FREE
    await prisma.subscription.create({
      data: {
        userId: user.id,
        plan: 'FREE',
        price: 0,
        maxVehicles: 1,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
      },
    });

    // Enviar SMS com OTP
    try {
      // Não bloquear o cadastro aguardando o provedor de SMS.
      // Se o envio falhar (ou travar), o usuário ainda consegue solicitar reenvio.
      sendOTP(phone, otpCode).catch((err) => {
        logger.error('Erro ao enviar OTP:', err);
      });
    } catch (error) {
      logger.error('Erro ao enviar OTP:', error);
      // Não falha o cadastro, mas avisa
    }

    logger.info(`Novo usuário cadastrado: ${email}`);

    res.status(201).json({
      success: true,
      message: 'Conta criada! Verifique seu telefone.',
      data: {
        userId: user.id,
        email: user.email,
        phone: user.phone,
        otpSentTo: user.phone,
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * POST /api/v1/auth/verify-otp
 * Verifica código OTP do telefone
 */
export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { userId, otpCode } = req.body;

    // Trim para garantir que não há espaços
    const cleanOtpCode = otpCode.trim();

    // Validar formato do OTP
    if (!validateOTPFormat(cleanOtpCode)) {
      throw new AppError('Código OTP inválido', 400, 'INVALID_OTP_FORMAT');
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('Usuário não encontrado', 404, 'USER_NOT_FOUND');
    }

    // Verificar se já está verificado
    if (user.phoneVerified) {
      throw new AppError('Telefone já verificado', 400, 'ALREADY_VERIFIED');
    }

    // Verificar se OTP expirou
    if (isOTPExpired(user.otpExpiresAt)) {
      throw new AppError('Código expirado. Solicite um novo.', 400, 'OTP_EXPIRED');
    }

    // Verificar código (comparando ambos com trim para segurança)
    if (user.otpCode?.trim() !== cleanOtpCode) {
      throw new AppError('Código incorreto', 400, 'INVALID_OTP');
    }

    // Atualizar usuário
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        phoneVerified: true,
        status: 'ACTIVE',
        otpCode: null,
        otpExpiresAt: null,
      },
    });

    // Gerar tokens
    const tokens = generateTokens({
      userId: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
    });

    logger.info(`Telefone verificado: ${updatedUser.email}`);

    res.json({
      success: true,
      message: 'Telefone verificado com sucesso!',
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
        },
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * POST /api/v1/auth/resend-otp
 * Reenvia código OTP
 */
export const resendOTP = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('Usuário não encontrado', 404, 'USER_NOT_FOUND');
    }

    if (user.phoneVerified) {
      throw new AppError('Telefone já verificado', 400, 'ALREADY_VERIFIED');
    }

    // Gerar novo OTP
    const otpCode = generateOTP();
    const otpExpiresAt = getOTPExpiration();

    // Atualizar usuário
    await prisma.user.update({
      where: { id: userId },
      data: { otpCode, otpExpiresAt },
    });

    // Enviar SMS
    await sendOTP(user.phone, otpCode);

    logger.info(`OTP reenviado para: ${user.email}`);

    res.json({
      success: true,
      message: 'Novo código enviado por SMS',
      data: {
        otpSentTo: user.phone,
        expiresIn: 600, // 10 minutos em segundos
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

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new AppError('Email ou senha incorretos', 401, 'INVALID_CREDENTIALS');
    }

    // Verificar senha
    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError('Email ou senha incorretos', 401, 'INVALID_CREDENTIALS');
    }

    // Verificar status da conta
    if (user.status === 'SUSPENDED') {
      throw new AppError('Conta suspensa. Entre em contato com o suporte.', 403, 'ACCOUNT_SUSPENDED');
    }

    if (user.status === 'INACTIVE') {
      throw new AppError('Conta inativa', 403, 'ACCOUNT_INACTIVE');
    }

    // Atualizar último login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Gerar tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    logger.info(`Login realizado: ${user.email}`);

    res.json({
      success: true,
      data: {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          language: user.language,
          phoneVerified: user.phoneVerified,
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
      throw new AppError('Refresh token não fornecido', 400, 'MISSING_REFRESH_TOKEN');
    }

    // Verificar refresh token
    const payload = verifyRefreshToken(refreshToken);

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      throw new AppError('Usuário não encontrado', 404, 'USER_NOT_FOUND');
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
    message: 'Logout realizado com sucesso',
  });
};
