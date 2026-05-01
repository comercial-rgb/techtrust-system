import { logger } from "../src/config/logger";
/**
 * Script para limpar banco de dados de testes
 * Permite reutilizar e-mails e limpar dados de teste
 * 
 * USO:
 * npm run clean-db
 * ou
 * npx ts-node prisma/clean-database.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanDatabase() {
  logger.info('🧹 Iniciando limpeza do banco de dados...\n');

  try {
    // Limpar dados em ordem (devido às relações)
    logger.info('🗑️  Deletando notificações...');
    await prisma.notification.deleteMany({});

    logger.info('🗑️  Deletando mensagens de chat...');
    await prisma.chatMessage.deleteMany({});

    logger.info('🗑️  Deletando avaliações...');
    await prisma.review.deleteMany({});

    logger.info('🗑️  Deletando métodos de pagamento...');
    await prisma.paymentMethod.deleteMany({});

    logger.info('🗑️  Deletando pagamentos...');
    await prisma.payment.deleteMany({});

    logger.info('🗑️  Deletando ordens de serviço...');
    await prisma.workOrder.deleteMany({});

    logger.info('🗑️  Deletando cotações...');
    await prisma.quote.deleteMany({});

    logger.info('🗑️  Deletando solicitações de serviço...');
    await prisma.serviceRequest.deleteMany({});

    logger.info('🗑️  Deletando agendamentos de manutenção...');
    await prisma.vehicleMaintenanceSchedule.deleteMany({});

    logger.info('🗑️  Deletando veículos...');
    await prisma.vehicle.deleteMany({});

    logger.info('🗑️  Deletando zonas de cobertura...');
    await prisma.coverageZone.deleteMany({});

    logger.info('🗑️  Deletando perfis de fornecedores...');
    await prisma.providerProfile.deleteMany({});

    logger.info('🗑️  Deletando assinaturas...');
    await prisma.subscription.deleteMany({});

    logger.info('🗑️  Deletando usuários...');
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        // Não deletar admins criados pelo seed
        role: {
          not: 'ADMIN'
        }
      }
    });

    logger.info(`✅ ${deletedUsers.count} usuários deletados`);

    logger.info('🗑️  Deletando conteúdo (banners, ofertas, artigos, avisos)...');
    await prisma.banner.deleteMany({});
    await prisma.specialOffer.deleteMany({});
    await prisma.article.deleteMany({});
    await prisma.notice.deleteMany({});

    logger.info('\n✨ Banco de dados limpo com sucesso!');
    logger.info('ℹ️  Usuários ADMIN foram preservados');
    logger.info('ℹ️  Você pode agora criar novos usuários com os mesmos e-mails\n');

  } catch (error) {
    logger.error('❌ Erro ao limpar banco de dados:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  logger.info('⚠️  ATENÇÃO: Este script irá deletar TODOS os dados de teste!');
  logger.info('⚠️  Usuários ADMIN serão preservados\n');

  // Verificar se está em produção
  if (process.env.NODE_ENV === 'production') {
    logger.error('❌ ERRO: Este script não pode ser executado em produção!');
    process.exit(1);
  }

  // Aguardar 3 segundos para permitir cancelamento
  logger.info('⏳ Iniciando em 3 segundos... (Ctrl+C para cancelar)');
  
  setTimeout(() => {
    cleanDatabase()
      .then(() => {
        logger.info('✅ Concluído!');
        process.exit(0);
      })
      .catch((error) => {
        logger.error('❌ Falha:', error);
        process.exit(1);
      });
  }, 3000);
}

export { cleanDatabase };
