/**
 * ============================================
 * AUTH MIDDLEWARE
 * ============================================
 * Protege rotas verificando token JWT
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JWTPayload } from '../utils/jwt';
import { AppError } from './error-handler';
import { prisma } from '../config/database';

// Estender Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload & {
        id: string;
      };
    }
  }
}

/**
 * Middleware de autenticação
 * Verifica se token JWT é válido
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    // Extrair token do header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError('Token não fornecido', 401, 'MISSING_TOKEN');
    }

    // Formato esperado: "Bearer TOKEN"
    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new AppError('Formato de token inválido', 401, 'INVALID_TOKEN_FORMAT');
    }

    const token = parts[1];

    // Verificar token
    const payload = verifyAccessToken(token);

    // Verificar se usuário ainda existe e está ativo
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw new AppError('Usuário não encontrado', 401, 'USER_NOT_FOUND');
    }

    if (user.status !== 'ACTIVE') {
      throw new AppError('Conta não está ativa', 403, 'ACCOUNT_NOT_ACTIVE');
    }

    // Adicionar user ao request
    req.user = {
      ...payload,
      id: user.id,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Token inválido ou expirado', 401, 'INVALID_TOKEN'));
    }
  }
};

/**
 * Middleware para verificar role específica
 */
export const authorize = (...allowedRoles: string[]) => {
 return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError('Não autenticado', 401, 'NOT_AUTHENTICATED');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError('Sem permissão para esta ação', 403, 'FORBIDDEN');
    }

    next();
  };
};

/**
 * Middleware opcional - não falha se não tiver token
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        const token = parts[1];
        const payload = verifyAccessToken(token);
        req.user = {
          ...payload,
          id: payload.userId,
        };
      }
    }

    next();
  } catch (error) {
    // Ignora erro e continua sem user
    next();
  }
};
