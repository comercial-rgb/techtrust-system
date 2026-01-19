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
  console.log('📋 Lista de TODOS os usuários:\n');

  const users = await prisma.user.findMany({
    select: {
      email: true,
      fullName: true,
      phoneVerified: true,
      status: true,
      role: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  users.forEach((user, i) => {
    const verified = user.phoneVerified ? '✅' : '❌';
    console.log(`${i + 1}. ${verified} ${user.email} | ${user.status} | ${user.role}`);
  });

  console.log(`\nTotal: ${users.length} usuários`);
  
  await prisma.$disconnect();
}

main();
