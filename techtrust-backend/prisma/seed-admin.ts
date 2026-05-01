import { logger } from "../src/config/logger";
/**
 * ============================================
 * SEED ADMIN USER
 * ============================================
 * Script para criar usuário administrador
 * Execute: npx ts-node prisma/seed-admin.ts
 */

import { PrismaClient } from '@prisma/client';
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  logger.info('🔧 Criando usuário administrador...\n');

  const adminEmail = 'admin@techtrust.com';
  const adminPhone = '+5511999999999';
  const adminPassword = 'Admin@123';

  // Verificar se já existe
  const existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [
        { email: adminEmail },
        { phone: adminPhone }
      ]
    }
  });

  if (existingAdmin) {
    logger.info('⚠️  Usuário admin já existe!');
    logger.info(`   Email: ${existingAdmin.email}`);
    logger.info(`   Role: ${existingAdmin.role}`);
    
    // Atualizar para ADMIN se não for
    if (existingAdmin.role !== 'ADMIN') {
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { role: 'ADMIN', status: 'ACTIVE' }
      });
      logger.info('✅ Atualizado para role ADMIN');
    }
    return;
  }

  // Criar hash da senha
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  // Criar usuário admin
  const admin = await prisma.user.create({
    data: {
      fullName: 'Administrador TechTrust',
      email: adminEmail,
      phone: adminPhone,
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      phoneVerified: true,
      emailVerified: true,
      language: 'PT'
    }
  });

  logger.info('✅ Usuário administrador criado com sucesso!\n');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('   CREDENCIAIS DE ACESSO');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info(`   📧 Email: ${adminEmail}`);
  logger.info(`   📱 Telefone: ${adminPhone}`);
  logger.info(`   🔑 Senha: ${adminPassword}`);
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  logger.info(`   ID: ${admin.id}`);
  logger.info(`   Role: ${admin.role}`);
  logger.info(`   Status: ${admin.status}`);
}

main()
  .catch((e) => {
    logger.error('❌ Erro ao criar admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
