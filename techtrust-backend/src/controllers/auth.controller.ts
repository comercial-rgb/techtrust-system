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
      logger.warn(`Tentativa de cadastro com email duplicado: ${email}`);
      throw new AppError('Este email já está cadastrado', 409, 'EMAIL_ALREADY_EXISTS');
    }

    // Verificar se telefone já existe
    const existingPhone = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingPhone) {
      logger.warn(`Tentativa de cadastro com telefone duplicado: ${phone}`);
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
    const { userId, otpCode, code } = req.body;
    
    // Aceita tanto 'otpCode' quanto 'code' para compatibilidade
    const receivedCode = otpCode || code;
    
    console.log('📥 Recebido verify-otp:', { 
      userId, 
      otpCode,
      code,
      receivedCode,
      body: req.body 
    });

    // Trim para garantir que não há espaços
    const cleanOtpCode = receivedCode?.trim();
    
    console.log('🧹 Após trim:', { cleanOtpCode, length: cleanOtpCode?.length });

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

    console.log('🔍 Comparando OTPs:', {
      userOtpCode: user.otpCode,
      userOtpTrimmed: user.otpCode?.trim(),
      receivedOtp: cleanOtpCode,
      areEqual: user.otpCode?.trim() === cleanOtpCode
    });

    // Verificar código (comparando ambos com trim para segurança)
    if (user.otpCode?.trim() !== cleanOtpCode) {
      console.log('❌ OTP não coincide!');
      throw new AppError('Código incorreto', 400, 'INVALID_OTP');
    }
    
    console.log('✅ OTP correto! Atualizando usuário...');

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
    
    console.log('🔐 Tentativa de login:', { email });

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      console.log('❌ Usuário não encontrado:', email);
      throw new AppError('Email ou senha incorretos', 401, 'INVALID_CREDENTIALS');
    }
    
    console.log('👤 Usuário encontrado:', { id: user.id, status: user.status, phoneVerified: user.phoneVerified });

    // Verificar senha
    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      console.log('❌ Senha inválida para:', email);
      throw new AppError('Email ou senha incorretos', 401, 'INVALID_CREDENTIALS');
    }
    
    console.log('✅ Senha válida para:', email);

    // Verificar status da conta
    if (user.status === 'SUSPENDED') {
      throw new AppError('Conta suspensa. Entre em contato com o suporte.', 403, 'ACCOUNT_SUSPENDED');
    }

    if (user.status === 'INACTIVE') {
      throw new AppError('Conta inativa', 403, 'ACCOUNT_INACTIVE');
    }

    // Verificar se telefone foi verificado (usuário precisa completar cadastro)
    if (user.status === 'PENDING_VERIFICATION' || !user.phoneVerified) {
      console.log('⚠️ Telefone não verificado para:', email);
      throw new AppError('Verifique seu telefone para continuar', 403, 'PHONE_NOT_VERIFIED');
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
          phone: user.phone,
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

/**
 * POST /api/v1/auth/forgot-password
 * Envia link de recuperação de senha por email
 */
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError('Email é obrigatório', 400, 'MISSING_EMAIL');
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Por segurança, sempre retornar sucesso mesmo se usuário não existir
    // Isso previne enumeração de emails
    if (!user) {
      logger.info(`Tentativa de recuperação para email não cadastrado: ${email}`);
      return res.json({
        success: true,
        message: 'Se o email existir, você receberá um link de recuperação.',
      });
    }

    // Gerar token de recuperação (usando mesma função do OTP, mas com validade maior)
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

    // TODO: Enviar email com link de recuperação
    // Por enquanto, vamos apenas logar o token (em produção, enviar por email)
    logger.info(`Token de recuperação para ${email}: ${resetToken}`);
    
    // Em desenvolvimento, retornar o token na resposta (REMOVER EM PRODUÇÃO)
    if (process.env.NODE_ENV === 'development') {
      return res.json({
        success: true,
        message: 'Link de recuperação enviado!',
        resetToken, // REMOVER EM PRODUÇÃO
      });
    }

    return res.json({
      success: true,
      message: 'Se o email existir, você receberá um link de recuperação.',
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
      throw new AppError('Email, token e nova senha são obrigatórios', 400, 'MISSING_FIELDS');
    }

    // Validar força da senha
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      throw new AppError(passwordValidation.message!, 400, 'WEAK_PASSWORD');
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new AppError('Token inválido ou expirado', 400, 'INVALID_TOKEN');
    }

    // Verificar token
    if (user.otpCode !== token) {
      throw new AppError('Token inválido', 400, 'INVALID_TOKEN');
    }

    // Verificar expiração
    if (!user.otpExpiresAt || isOTPExpired(user.otpExpiresAt)) {
      throw new AppError('Token expirado. Solicite um novo link de recuperação.', 400, 'EXPIRED_TOKEN');
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
      message: 'Senha redefinida com sucesso! Faça login com sua nova senha.',
    });
  } catch (error) {
    throw error;
  }
};
