import { PrismaClient } from '@prisma/client';

import { logger } from "../src/config/logger";
const PRODUCTION_DB_URL = 'postgresql://postgres.jfwnkgqvlyamigfzgkys:Techtrust2026abc@aws-1-us-east-1.pooler.supabase.com:5432/postgres';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: PRODUCTION_DB_URL
    }
  }
});

async function main() {
  logger.info('🔍 Verificando códigos OTP no banco de dados...\n');

  try {
    // Busca todos os usuários com OTP pendente
    const users = await prisma.user.findMany({
      where: {
        otpCode: {
          not: null
        }
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        otpCode: true,
        otpExpiresAt: true,
        phoneVerified: true,
        status: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (users.length === 0) {
      logger.info('❌ Nenhum usuário com OTP pendente encontrado\n');
      return;
    }

    logger.info(`📋 Encontrados ${users.length} usuário(s) com OTP:\n`);

    users.forEach((user, index) => {
      logger.info(`👤 Usuário ${index + 1}:`);
      logger.info(`   ID: ${user.id}`);
      logger.info(`   Nome: ${user.fullName}`);
      logger.info(`   Email: ${user.email}`);
      logger.info(`   Telefone: ${user.phone}`);
      logger.info(`   🔐 OTP Salvo: ${user.otpCode}`);
      logger.info(`   📅 OTP Expira: ${user.otpExpiresAt}`);
      logger.info(`   ✅ Telefone Verificado: ${user.phoneVerified}`);
      logger.info(`   Status: ${user.status}`);
      logger.info(`   Criado em: ${user.createdAt}`);
      
      // Verifica se expirou
      const now = new Date();
      const expired = user.otpExpiresAt && new Date(user.otpExpiresAt) < now;
      if (expired) {
        logger.info(`   ⚠️  OTP EXPIRADO!`);
      }
      
      logger.info('');
    });

  } catch (error) {
    logger.error('❌ Erro ao verificar OTP:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
