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
  console.log('🔧 Criando usuário administrador...\n');

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
    console.log('⚠️  Usuário admin já existe!');
    console.log(`   Email: ${existingAdmin.email}`);
    console.log(`   Role: ${existingAdmin.role}`);
    
    // Atualizar para ADMIN se não for
    if (existingAdmin.role !== 'ADMIN') {
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { role: 'ADMIN', status: 'ACTIVE' }
      });
      console.log('✅ Atualizado para role ADMIN');
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

  console.log('✅ Usuário administrador criado com sucesso!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   CREDENCIAIS DE ACESSO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   📧 Email: ${adminEmail}`);
  console.log(`   📱 Telefone: ${adminPhone}`);
  console.log(`   🔑 Senha: ${adminPassword}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`   ID: ${admin.id}`);
  console.log(`   Role: ${admin.role}`);
  console.log(`   Status: ${admin.status}`);
}

main()
  .catch((e) => {
    console.error('❌ Erro ao criar admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
