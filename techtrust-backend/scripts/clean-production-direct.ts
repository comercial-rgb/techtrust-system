import { PrismaClient } from '@prisma/client';

import { logger } from "../src/config/logger";
const PRODUCTION_DB_URL = 'postgresql://postgres.jfwnkgqvlyamigfzgkys:Techtrust2026abc@aws-1-us-east-1.pooler.supabase.com:5432/postgres';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: PRODUCTION_DB_URL
    }
  }
});

async function main() {
  logger.info('🔄 Limpando banco de dados de PRODUÇÃO...');
  logger.info('📡 Database: Supabase (aws-0-us-east-1)\n');

  try {
    // 1. Primeiro, verifica quantos usuários existem
    const totalUsers = await prisma.user.count();
    logger.info(`📊 Total de usuários antes: ${totalUsers}\n`);

    // 2. Deleta todos os dados em ordem para respeitar FKs
    logger.info('🗑️  Deletando dados...');

    const deletedChatMessages = await prisma.chatMessage.deleteMany({});
    logger.info(`   ✅ ChatMessages: ${deletedChatMessages.count}`);

    const deletedPaymentMethods = await prisma.paymentMethod.deleteMany({});
    logger.info(`   ✅ PaymentMethods: ${deletedPaymentMethods.count}`);

    const deletedNotifications = await prisma.notification.deleteMany({});
    logger.info(`   ✅ Notifications: ${deletedNotifications.count}`);

    const deletedReviews = await prisma.review.deleteMany({});
    logger.info(`   ✅ Reviews: ${deletedReviews.count}`);

    const deletedPayments = await prisma.payment.deleteMany({});
    logger.info(`   ✅ Payments: ${deletedPayments.count}`);

    const deletedWorkOrders = await prisma.workOrder.deleteMany({});
    logger.info(`   ✅ WorkOrders: ${deletedWorkOrders.count}`);

    const deletedQuotes = await prisma.quote.deleteMany({});
    logger.info(`   ✅ Quotes: ${deletedQuotes.count}`);

    const deletedServiceRequests = await prisma.serviceRequest.deleteMany({});
    logger.info(`   ✅ ServiceRequests: ${deletedServiceRequests.count}`);

    const deletedMaintenanceSchedules = await prisma.vehicleMaintenanceSchedule.deleteMany({});
    logger.info(`   ✅ MaintenanceSchedules: ${deletedMaintenanceSchedules.count}`);

    const deletedVehicles = await prisma.vehicle.deleteMany({});
    logger.info(`   ✅ Vehicles: ${deletedVehicles.count}`);

    const deletedSubscriptions = await prisma.subscription.deleteMany({});
    logger.info(`   ✅ Subscriptions: ${deletedSubscriptions.count}`);

    const deletedCoverageZones = await prisma.coverageZone.deleteMany({});
    logger.info(`   ✅ CoverageZones: ${deletedCoverageZones.count}`);

    const deletedProviderProfiles = await prisma.providerProfile.deleteMany({});
    logger.info(`   ✅ ProviderProfiles: ${deletedProviderProfiles.count}`);

    const deletedNotices = await prisma.notice.deleteMany({});
    logger.info(`   ✅ Notices: ${deletedNotices.count}`);

    const deletedArticles = await prisma.article.deleteMany({});
    logger.info(`   ✅ Articles: ${deletedArticles.count}`);

    const deletedSpecialOffers = await prisma.specialOffer.deleteMany({});
    logger.info(`   ✅ SpecialOffers: ${deletedSpecialOffers.count}`);

    const deletedBanners = await prisma.banner.deleteMany({});
    logger.info(`   ✅ Banners: ${deletedBanners.count}`);

    // 3. Deleta TODOS os usuários (incluindo ADMIN antigos)
    const deletedUsers = await prisma.user.deleteMany({});
    logger.info(`   ✅ Users: ${deletedUsers.count}`);

    // 4. Verifica se está vazio
    const remainingUsers = await prisma.user.count();
    logger.info(`\n📊 Total de usuários depois: ${remainingUsers}`);

    logger.info('\n✅ BANCO LIMPO COM SUCESSO!');
    logger.info('\n📝 Próximos passos:');
    logger.info('   1️⃣  Rode: npx prisma db seed');
    logger.info('   2️⃣  Faça push para deploy automático no Render');
    logger.info('   3️⃣  Teste o app mobile com novos usuários\n');

  } catch (error) {
    logger.error('❌ Erro ao limpar banco:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
