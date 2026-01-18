import { PrismaClient } from '@prisma/client';

const PRODUCTION_DB_URL = 'postgresql://postgres.jfwnkgqvlyamigfzgkys:Techtrust2026abc@aws-1-us-east-1.pooler.supabase.com:5432/postgres';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: PRODUCTION_DB_URL
    }
  }
});

async function main() {
  console.log('🔍 Verificando códigos OTP no banco de dados...\n');

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
      console.log('❌ Nenhum usuário com OTP pendente encontrado\n');
      return;
    }

    console.log(`📋 Encontrados ${users.length} usuário(s) com OTP:\n`);

    users.forEach((user, index) => {
      console.log(`👤 Usuário ${index + 1}:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Nome: ${user.fullName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Telefone: ${user.phone}`);
      console.log(`   🔐 OTP Salvo: ${user.otpCode}`);
      console.log(`   📅 OTP Expira: ${user.otpExpiresAt}`);
      console.log(`   ✅ Telefone Verificado: ${user.phoneVerified}`);
      console.log(`   Status: ${user.status}`);
      console.log(`   Criado em: ${user.createdAt}`);
      
      // Verifica se expirou
      const now = new Date();
      const expired = user.otpExpiresAt && new Date(user.otpExpiresAt) < now;
      if (expired) {
        console.log(`   ⚠️  OTP EXPIRADO!`);
      }
      
      console.log('');
    });

  } catch (error) {
    console.error('❌ Erro ao verificar OTP:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
