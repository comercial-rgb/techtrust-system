import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

/**
 * Middleware de debug para logar requisições
 * Use apenas em desenvolvimento/debug
 */
export const debugLogger = (req: Request, _res: Response, next: NextFunction) => {
  logger.debug(
    `DEBUG ${req.method} ${req.url} ct=${req.headers['content-type'] || '-'} auth=${req.headers['authorization'] ? 'yes' : 'no'}`,
  );
  next();
};
