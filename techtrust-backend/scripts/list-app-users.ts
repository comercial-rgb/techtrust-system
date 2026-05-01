import { logger } from "../src/config/logger";
/**
 * Lista usuários do app (CUSTOMER e PROVIDER)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listAppUsers() {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: { in: ['CLIENT', 'PROVIDER'] }
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        createdAt: true,
        status: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    logger.info('\n╔══════════════════════════════════════════════════════════╗');
    logger.info('║         USUÁRIOS DO APP MOBILE (CLIENTS & PROVIDERS)    ║');
    logger.info('╚══════════════════════════════════════════════════════════╝\n');
    
    if (users.length === 0) {
      logger.info('❌ Nenhum usuário encontrado.\n');
      return;
    }

    users.forEach((user, index) => {
      logger.info(`${index + 1}. ${user.role === 'CLIENT' ? '👤 CLIENT' : '🔧 PROVIDER'}`);
      logger.info(`   Nome: ${user.fullName || 'N/A'}`);
      logger.info(`   Email: ${user.email}`);
      logger.info(`   Telefone: ${user.phone || 'N/A'}`);
      logger.info(`   Status: ${user.status}`);
      logger.info(`   Criado em: ${new Date(user.createdAt).toLocaleString('pt-BR')}`);
      logger.info('');
    });

    logger.info(`\n📊 Total: ${users.length} usuários\n`);
    logger.info('⚠️  NOTA IMPORTANTE:');
    logger.info('   As senhas estão criptografadas no banco (bcrypt hash).');
    logger.info('   Para login, use a senha que foi definida ao criar cada usuário.\n');
    
    // Contar por tipo
    const clients = users.filter(u => u.role === 'CLIENT').length;
    const providers = users.filter(u => u.role === 'PROVIDER').length;
    
    logger.info('📈 Resumo:');
    logger.info(`   - Clients: ${clients}`);
    logger.info(`   - Providers: ${providers}\n`);

  } catch (error) {
    logger.error('❌ Erro ao listar usuários:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listAppUsers();
