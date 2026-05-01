import { logger } from "../src/config/logger";
/**
 * Script para verificar usuários no banco
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        phoneVerified: true,
        createdAt: true,
      },
    });

    logger.info(`\n📊 Total de usuários: ${allUsers.length}\n`);

    if (allUsers.length > 0) {
      logger.info('Lista de usuários:');
      logger.info('─'.repeat(100));
      allUsers.forEach((user, index) => {
        logger.info(`${index + 1}. ${user.email}`);
        logger.info(`   Telefone: ${user.phone}`);
        logger.info(`   Role: ${user.role}`);
        logger.info(`   Status: ${user.status}`);
        logger.info(`   Verificado: ${user.phoneVerified ? 'Sim' : 'Não'}`);
        logger.info(`   Criado em: ${user.createdAt.toLocaleString('pt-BR')}`);
        logger.info('─'.repeat(100));
      });
    } else {
      logger.info('✅ Nenhum usuário encontrado no banco!');
    }

  } catch (error) {
    logger.error('❌ Erro ao verificar usuários:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
