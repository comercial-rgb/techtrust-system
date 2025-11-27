/**
 * ============================================
 * LOGGER - Winston Configuration
 * ============================================
 * Sistema de logs da aplicação
 */

import winston from 'winston';
import path from 'path';

// Níveis de log
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Cores para cada nível
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Formato customizado
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Transports
const transports = [
  // Console
  new winston.transports.Console(),
  
  // Arquivo de erros
  new winston.transports.File({
    filename: path.join('logs', 'error.log'),
    level: 'error',
  }),
  
  // Arquivo de todos os logs
  new winston.transports.File({
    filename: path.join('logs', 'all.log'),
  }),
];

// Criar logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  levels,
  format,
  transports,
});

// Se não estiver em produção, não logar no console em formato JSON
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

export default logger;
