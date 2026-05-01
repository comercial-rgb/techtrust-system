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
  const email = process.argv[2];
  const newPassword = process.argv[3] || 'Teste123!';

  if (!email) {
    logger.info('Uso: npx ts-node scripts/reset-password.ts <email> [nova_senha]');
    logger.info('Exemplo: npx ts-node scripts/reset-password.ts teste4@gmail.com Teste123!');
    process.exit(1);
  }

  logger.info(`🔄 Resetando senha para: ${email}`);
  logger.info(`🔑 Nova senha: ${newPassword}`);

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      logger.info('❌ Usuário não encontrado!');
      process.exit(1);
    }

    logger.info(`👤 Usuário encontrado: ${user.fullName}`);

    // Gerar hash da nova senha
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Atualizar senha
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });

    logger.info('✅ Senha atualizada com sucesso!');
    logger.info(`\n📱 Use estas credenciais no app:`);
    logger.info(`   Email: ${email}`);
    logger.info(`   Senha: ${newPassword}`);

  } catch (error) {
    logger.error('❌ Erro:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
