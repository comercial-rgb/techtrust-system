/**
 * ============================================
 * PRISMA CLIENT
 * ============================================
 * Cliente singleton do Prisma para conexão com DB
 */

import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

// Prevenir múltiplas instâncias em desenvolvimento
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Log de conexão
prisma.$connect()
  .then(() => {
    logger.info('✅ Conectado ao PostgreSQL');
  })
  .catch((error) => {
    logger.error('❌ Erro ao conectar ao PostgreSQL:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  logger.info('Desconectado do PostgreSQL');
});

export default prisma;
