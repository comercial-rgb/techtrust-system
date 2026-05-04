import { PrismaClient } from '@prisma/client';

import { logger } from "../src/config/logger";
import { getRequiredDatabaseUrl } from "./require-database-url";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: getRequiredDatabaseUrl()
    }
  }
});

async function main() {
  logger.info('📋 Lista de TODOS os usuários:\n');

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
    logger.info(`${i + 1}. ${verified} ${user.email} | ${user.status} | ${user.role}`);
  });

  logger.info(`\nTotal: ${users.length} usuários`);
  
  await prisma.$disconnect();
}

main();
