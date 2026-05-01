import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

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
  const email = process.argv[2] || 'teste4@gmail.com';
  const password = process.argv[3] || 'Winner1995';

  logger.info(`🔍 Testando login para: ${email}`);
  logger.info(`🔑 Senha fornecida: ${password}`);

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      logger.info('❌ Usuário não encontrado!');
      process.exit(1);
    }

    logger.info(`\n👤 Usuário encontrado:`);
    logger.info(`   ID: ${user.id}`);
    logger.info(`   Nome: ${user.fullName}`);
    logger.info(`   Email: ${user.email}`);
    logger.info(`   Status: ${user.status}`);
    logger.info(`   Phone Verified: ${user.phoneVerified}`);
    logger.info(`   Password Hash: ${user.passwordHash.substring(0, 20)}...`);

    // Testar a senha
    logger.info(`\n🔐 Testando senha...`);
    const isValid = await bcrypt.compare(password, user.passwordHash);
    
    if (isValid) {
      logger.info('✅ SENHA CORRETA! O login deveria funcionar.');
    } else {
      logger.info('❌ SENHA INCORRETA! A senha não bate com o hash.');
      
      // Vamos tentar algumas variações
      const variations = [
        password.trim(),
        password.toLowerCase(),
        password.toUpperCase(),
      ];
      
      for (const variation of variations) {
        const test = await bcrypt.compare(variation, user.passwordHash);
        if (test) {
          logger.info(`✅ Variação funciona: "${variation}"`);
        }
      }
    }

  } catch (error) {
    logger.error('❌ Erro:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
