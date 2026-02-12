/**
 * ============================================
 * ERROR HANDLER MIDDLEWARE
 * ============================================
 * Captura e formata todos os erros da aplicação
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

// Helper para criar erros personalizados
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  code: string;

  constructor(message: string, statusCode: number = 500, code: string = 'ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Default para erro 500
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Erro interno do servidor';
  let errorCode = err.code || 'INTERNAL_SERVER_ERROR';

  // Log do erro
  logger.error(`[${errorCode}] ${message}`, {
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  // Erros específicos do Prisma
  if (err.name === 'PrismaClientKnownRequestError') {
    statusCode = 400;
    
    // @ts-ignore - Prisma error codes
    if (err.code === 'P2002') {
      errorCode = 'DUPLICATE_ENTRY';
      message = 'Este registro já existe no sistema';
    } else if (err.code === 'P2025') {
      errorCode = 'NOT_FOUND';
      message = 'Registro não encontrado';
      statusCode = 404;
    }
  }

  // Prisma validation errors (e.g. invalid enum value)
  if (err.name === 'PrismaClientValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Dados inválidos enviados ao servidor';
  }

  // Erros de validação
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Token inválido';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Token expirado';
  }

  // Não expor detalhes internos em produção
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Erro interno do servidor';
  }

  // Resposta ao cliente
  res.status(statusCode).json({
    success: false,
    error: errorCode,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
