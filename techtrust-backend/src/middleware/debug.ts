import { Request, Response, NextFunction } from 'express';

/**
 * Middleware de debug para logar requisições
 * Use apenas em desenvolvimento/debug
 */
export const debugLogger = (req: Request, _res: Response, next: NextFunction) => {
  console.log('🔍 DEBUG REQUEST:', {
    method: req.method,
    url: req.url,
    body: req.body,
    headers: {
      'content-type': req.headers['content-type'],
      'authorization': req.headers['authorization'] ? 'Bearer ***' : 'none'
    }
  });
  next();
};
