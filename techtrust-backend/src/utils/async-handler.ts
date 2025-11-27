/**
 * ============================================
 * ASYNC HANDLER
 * ============================================
 * Wrapper para funções async que captura erros automaticamente
 */

import { Request, Response, NextFunction } from 'express';

type AsyncFunction = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

/**
 * Envolve função async e passa erros para o error handler
 */
export const asyncHandler = (fn: AsyncFunction) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
