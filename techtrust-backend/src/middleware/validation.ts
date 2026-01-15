/**
 * ============================================
 * VALIDATION MIDDLEWARE
 * ============================================
 * Valida dados das requisições usando express-validator
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { AppError } from './error-handler';

/**
 * Middleware que executa validações e retorna erros
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      // Executar todas as validações
      for (const validation of validations) {
        await validation.run(req);
      }

      // Verificar erros
      const errors = validationResult(req);

      if (errors.isEmpty()) {
        return next();
      }

      // Formatar erros
      const extractedErrors = errors.array().map((err: any) => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value,
      }));

      return next(
        new AppError(
          extractedErrors[0].message,
          400,
          'VALIDATION_ERROR'
        )
      );
    } catch (error) {
      return next(error);
    }
  };
};
