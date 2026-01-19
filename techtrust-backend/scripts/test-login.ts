import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

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

  console.log(`🔍 Testando login para: ${email}`);
  console.log(`🔑 Senha fornecida: ${password}`);

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      console.log('❌ Usuário não encontrado!');
      process.exit(1);
    }

    console.log(`\n👤 Usuário encontrado:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Nome: ${user.fullName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Status: ${user.status}`);
    console.log(`   Phone Verified: ${user.phoneVerified}`);
    console.log(`   Password Hash: ${user.passwordHash.substring(0, 20)}...`);

    // Testar a senha
    console.log(`\n🔐 Testando senha...`);
    const isValid = await bcrypt.compare(password, user.passwordHash);
    
    if (isValid) {
      console.log('✅ SENHA CORRETA! O login deveria funcionar.');
    } else {
      console.log('❌ SENHA INCORRETA! A senha não bate com o hash.');
      
      // Vamos tentar algumas variações
      const variations = [
        password.trim(),
        password.toLowerCase(),
        password.toUpperCase(),
      ];
      
      for (const variation of variations) {
        const test = await bcrypt.compare(variation, user.passwordHash);
        if (test) {
          console.log(`✅ Variação funciona: "${variation}"`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
