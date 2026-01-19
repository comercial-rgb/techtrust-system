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
  const email = process.argv[2];
  const newPassword = process.argv[3] || 'Teste123!';

  if (!email) {
    console.log('Uso: npx ts-node scripts/reset-password.ts <email> [nova_senha]');
    console.log('Exemplo: npx ts-node scripts/reset-password.ts teste4@gmail.com Teste123!');
    process.exit(1);
  }

  console.log(`🔄 Resetando senha para: ${email}`);
  console.log(`🔑 Nova senha: ${newPassword}`);

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      console.log('❌ Usuário não encontrado!');
      process.exit(1);
    }

    console.log(`👤 Usuário encontrado: ${user.fullName}`);

    // Gerar hash da nova senha
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Atualizar senha
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });

    console.log('✅ Senha atualizada com sucesso!');
    console.log(`\n📱 Use estas credenciais no app:`);
    console.log(`   Email: ${email}`);
    console.log(`   Senha: ${newPassword}`);

  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
