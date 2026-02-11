/**
 * ============================================
 * AUTH CONTROLLER
 * ============================================
 * Controla autenticação: cadastro, login, OTP, social login, etc
 */

import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error-handler';
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password';
import { generateTokens, verifyRefreshToken } from '../utils/jwt';
import { generateOTP, getOTPExpiration, isOTPExpired, validateOTPFormat } from '../utils/otp';
import { sendOTP } from '../services/sms.service';
import { sendOTPEmail, sendPasswordResetEmail, sendWelcomeEmail } from '../services/email.service';
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

// ============================================
// SOCIAL LOGIN (Google / Apple / Facebook)
// ============================================

/**
 * Verifica token do Google
 */
async function verifyGoogleToken(accessToken: string): Promise<{ id: string; email: string; name: string; picture?: string }> {
  const response = await fetch('https://www.googleapis.com/userinfo/v2/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new AppError('Invalid Google token', 401, 'INVALID_GOOGLE_TOKEN');
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
async function verifyAppleToken(identityToken: string, appleUserId: string): Promise<{ id: string; email: string | null; name: string | null }> {
  try {
    // Decode the Apple identity token (JWT)
    // Apple tokens are signed JWTs. For production, verify signature with Apple's public keys.
    // For now, we decode and validate the payload.
    const parts = identityToken.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid Apple token format');
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));

    // Verify issuer and audience
    if (payload.iss !== 'https://appleid.apple.com') {
      throw new Error('Invalid Apple token issuer');
    }

    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      throw new Error('Apple token expired');
    }

    return {
      id: appleUserId || payload.sub,
      email: payload.email || null,
      name: null, // Apple only sends name on first sign-in
    };
  } catch (error: any) {
    logger.error('Apple token verification failed:', error);
    throw new AppError('Invalid Apple token', 401, 'INVALID_APPLE_TOKEN');
  }
}

/**
 * Verifica token do Facebook
 */
async function verifyFacebookToken(accessToken: string): Promise<{ id: string; email: string; name: string; picture?: string }> {
  const response = await fetch(
    `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${accessToken}`
  );

  if (!response.ok) {
    throw new AppError('Invalid Facebook token', 401, 'INVALID_FACEBOOK_TOKEN');
  }

  const data: any = await response.json();
  if (!data.email) {
    throw new AppError('Email permission required from Facebook', 400, 'FACEBOOK_EMAIL_REQUIRED');
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
    const { provider, token, appleUserId, fullName: providedName, phone } = req.body;

    if (!provider || !token) {
      throw new AppError('Provider and token are required', 400, 'MISSING_FIELDS');
    }

    // 1. Verify token with social provider
    let socialUser: { id: string; email: string | null; name: string | null; picture?: string };

    switch (provider.toUpperCase()) {
      case 'GOOGLE':
        socialUser = await verifyGoogleToken(token);
        break;
      case 'APPLE':
        socialUser = await verifyAppleToken(token, appleUserId);
        break;
      case 'FACEBOOK':
        socialUser = await verifyFacebookToken(token);
        break;
      default:
        throw new AppError('Unsupported provider', 400, 'UNSUPPORTED_PROVIDER');
    }

    if (!socialUser.email) {
      throw new AppError('Email is required from social provider', 400, 'EMAIL_REQUIRED');
    }

    const socialIdField = `${provider.toLowerCase()}Id` as 'googleId' | 'appleId' | 'facebookId';

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
        logger.info(`Social account ${provider} linked to existing user: ${user.email}`);
      }
    }

    // 4. If user exists with password set → login directly
    if (user && user.passwordHash && user.status === 'ACTIVE') {
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
          status: 'AUTHENTICATED',
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
    if (user && (!user.passwordHash || user.status === 'PENDING_VERIFICATION')) {
      return res.json({
        success: true,
        data: {
          status: 'NEEDS_PASSWORD',
          userId: user.id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          provider,
          message: 'Please set a password to complete your account setup.',
        },
      });
    }

    // 6. New user → create account
    // Require phone for new accounts (can be sent in request body or set later)
    const newUserPhone = phone || `+0${Date.now()}`; // Temporary placeholder if no phone
    const hasRealPhone = !!phone;

    const newUser = await prisma.user.create({
      data: {
        fullName: socialUser.name || providedName || socialUser.email.split('@')[0],
        email: socialUser.email.toLowerCase(),
        phone: newUserPhone,
        passwordHash: '', // Will be set when user defines password
        authProvider: provider.toUpperCase(),
        [socialIdField]: socialUser.id,
        avatarUrl: socialUser.picture || null,
        emailVerified: true, // Verified by social provider
        phoneVerified: hasRealPhone,
        status: 'PENDING_VERIFICATION', // Needs password setup
        role: 'CLIENT',
        language: 'EN',
      },
    });

    // Create FREE subscription
    await prisma.subscription.create({
      data: {
        userId: newUser.id,
        plan: 'FREE',
        price: 0,
        maxVehicles: 1,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    logger.info(`New social user created (${provider}): ${newUser.email}`);

    return res.status(201).json({
      success: true,
      data: {
        status: 'NEEDS_PASSWORD',
        userId: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        phone: hasRealPhone ? newUser.phone : null,
        provider,
        message: 'Account created. Please set a password and phone number.',
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

    if (!userId || !password) {
      throw new AppError('User ID and password are required', 400, 'MISSING_FIELDS');
    }

    // Validate password
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      throw new AppError(passwordValidation.message!, 400, 'WEAK_PASSWORD');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Prepare update data
    const updateData: any = {
      passwordHash,
      status: 'ACTIVE',
    };

    // Update phone if provided
    if (phone) {
      // Check phone uniqueness
      const existingPhone = await prisma.user.findUnique({ where: { phone } });
      if (existingPhone && existingPhone.id !== userId) {
        throw new AppError('This phone number is already registered', 409, 'PHONE_ALREADY_EXISTS');
      }
      updateData.phone = phone;
      
      // Generate OTP for phone verification
      const otpCode = generateOTP();
      const otpExpiresAt = getOTPExpiration();
      updateData.otpCode = otpCode;
      updateData.otpExpiresAt = otpExpiresAt;
      
      // Send SMS
      sendOTP(phone, otpCode).catch(err => {
        logger.error('Error sending OTP after social signup:', err);
      });
    } else if (user.phone && !user.phone.startsWith('+0')) {
      // Has valid phone, set active
      updateData.status = 'ACTIVE';
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
          status: 'NEEDS_PHONE_VERIFICATION',
          userId: updatedUser.id,
          phone: updatedUser.phone,
          message: 'Password set. Please verify your phone number.',
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
    sendWelcomeEmail(updatedUser.email, updatedUser.fullName, updatedUser.language).catch(err => {
      logger.error('Failed to send welcome email:', err);
    });

    logger.info(`Social signup completed: ${updatedUser.email}`);

    return res.json({
      success: true,
      data: {
        status: 'AUTHENTICATED',
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
    const verifyMethod = method || 'sms'; // 'sms' or 'email'
    
    console.log('📥 Recebido verify-otp:', { 
      userId, 
      otpCode,
      code,
      receivedCode,
      method: verifyMethod,
      body: req.body 
    });

    // Trim para garantir que não há espaços
    const cleanOtpCode = receivedCode?.trim();

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

    // Check based on verification method
    if (verifyMethod === 'email') {
      // Verify email OTP
      if (isOTPExpired(user.emailOtpExpiresAt)) {
        throw new AppError('Código expirado. Solicite um novo.', 400, 'OTP_EXPIRED');
      }
      if (user.emailOtpCode?.trim() !== cleanOtpCode) {
        throw new AppError('Código incorreto', 400, 'INVALID_OTP');
      }

      // Update - email verified
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          emailVerified: true,
          emailOtpCode: null,
          emailOtpExpiresAt: null,
          // If phone was already verified, set active
          status: user.phoneVerified ? 'ACTIVE' : user.status,
        },
      });

      // If account is now fully active, generate tokens
      if (updatedUser.status === 'ACTIVE') {
        const tokens = generateTokens({
          userId: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
        });

        logger.info(`Email verificado: ${updatedUser.email}`);

        return res.json({
          success: true,
          message: 'Email verificado com sucesso!',
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
            },
          },
        });
      }

      return res.json({
        success: true,
        message: 'Email verificado! Verifique seu telefone para continuar.',
        data: { emailVerified: true, phoneVerified: updatedUser.phoneVerified },
      });
    }

    // SMS OTP verification (default)
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

    return res.json({
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
          emailVerified: updatedUser.emailVerified,
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
      throw new AppError('Usuário não encontrado', 404, 'USER_NOT_FOUND');
    }

    if (user.phoneVerified && method !== 'email') {
      throw new AppError('Telefone já verificado', 400, 'ALREADY_VERIFIED');
    }

    // Gerar novo OTP
    const otpCode = generateOTP();
    const otpExpiresAt = getOTPExpiration();

    const deliveryMethod = method === 'email' ? 'email' : 'sms';

    if (deliveryMethod === 'email') {
      // Store in email OTP fields
      await prisma.user.update({
        where: { id: userId },
        data: { emailOtpCode: otpCode, emailOtpExpiresAt: otpExpiresAt },
      });
      
      // Send OTP via email
      await sendOTPEmail(user.email, otpCode, user.language);
      
      logger.info(`OTP sent via email to: ${user.email}`);
      
      return res.json({
        success: true,
        message: 'Novo código enviado por email',
        data: {
          method: 'email',
          otpSentTo: user.email,
          expiresIn: 600,
        },
      });
    } else {
      // Store in phone OTP fields
      await prisma.user.update({
        where: { id: userId },
        data: { otpCode, otpExpiresAt },
      });

      // Send via SMS
      await sendOTP(user.phone, otpCode);

      logger.info(`OTP reenviado via SMS para: ${user.email}`);

      return res.json({
        success: true,
        message: 'Novo código enviado por SMS',
        data: {
          method: 'sms',
          otpSentTo: user.phone,
          expiresIn: 600,
        },
      });
    }
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
      logger.error(`Failed to send password reset email to ${email}:`, emailError);
      // Don't fail the request - log and continue
    }

    return res.json({
      success: true,
      message: 'Se o email existir, você receberá um código de recuperação.',
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
