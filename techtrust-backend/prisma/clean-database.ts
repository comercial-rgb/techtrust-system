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
  console.log('🧹 Iniciando limpeza do banco de dados...\n');

  try {
    // Limpar dados em ordem (devido às relações)
    console.log('🗑️  Deletando notificações...');
    await prisma.notification.deleteMany({});

    console.log('🗑️  Deletando mensagens de chat...');
    await prisma.chatMessage.deleteMany({});

    console.log('🗑️  Deletando avaliações...');
    await prisma.review.deleteMany({});

    console.log('🗑️  Deletando métodos de pagamento...');
    await prisma.paymentMethod.deleteMany({});

    console.log('🗑️  Deletando pagamentos...');
    await prisma.payment.deleteMany({});

    console.log('🗑️  Deletando ordens de serviço...');
    await prisma.workOrder.deleteMany({});

    console.log('🗑️  Deletando cotações...');
    await prisma.quote.deleteMany({});

    console.log('🗑️  Deletando solicitações de serviço...');
    await prisma.serviceRequest.deleteMany({});

    console.log('🗑️  Deletando agendamentos de manutenção...');
    await prisma.vehicleMaintenanceSchedule.deleteMany({});

    console.log('🗑️  Deletando veículos...');
    await prisma.vehicle.deleteMany({});

    console.log('🗑️  Deletando zonas de cobertura...');
    await prisma.coverageZone.deleteMany({});

    console.log('🗑️  Deletando perfis de fornecedores...');
    await prisma.providerProfile.deleteMany({});

    console.log('🗑️  Deletando assinaturas...');
    await prisma.subscription.deleteMany({});

    console.log('🗑️  Deletando usuários...');
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        // Não deletar admins criados pelo seed
        role: {
          not: 'ADMIN'
        }
      }
    });

    console.log(`✅ ${deletedUsers.count} usuários deletados`);

    console.log('🗑️  Deletando conteúdo (banners, ofertas, artigos, avisos)...');
    await prisma.banner.deleteMany({});
    await prisma.specialOffer.deleteMany({});
    await prisma.article.deleteMany({});
    await prisma.notice.deleteMany({});

    console.log('\n✨ Banco de dados limpo com sucesso!');
    console.log('ℹ️  Usuários ADMIN foram preservados');
    console.log('ℹ️  Você pode agora criar novos usuários com os mesmos e-mails\n');

  } catch (error) {
    console.error('❌ Erro ao limpar banco de dados:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  console.log('⚠️  ATENÇÃO: Este script irá deletar TODOS os dados de teste!');
  console.log('⚠️  Usuários ADMIN serão preservados\n');

  // Verificar se está em produção
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ ERRO: Este script não pode ser executado em produção!');
    process.exit(1);
  }

  // Aguardar 3 segundos para permitir cancelamento
  console.log('⏳ Iniciando em 3 segundos... (Ctrl+C para cancelar)');
  
  setTimeout(() => {
    cleanDatabase()
      .then(() => {
        console.log('✅ Concluído!');
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Falha:', error);
        process.exit(1);
      });
  }, 3000);
}

export { cleanDatabase };
