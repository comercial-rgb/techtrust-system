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
  console.log('🔄 Limpando banco de dados de PRODUÇÃO...');
  console.log('📡 Database: Supabase (aws-0-us-east-1)\n');

  try {
    // 1. Primeiro, verifica quantos usuários existem
    const totalUsers = await prisma.user.count();
    console.log(`📊 Total de usuários antes: ${totalUsers}\n`);

    // 2. Deleta todos os dados em ordem para respeitar FKs
    console.log('🗑️  Deletando dados...');

    const deletedChatMessages = await prisma.chatMessage.deleteMany({});
    console.log(`   ✅ ChatMessages: ${deletedChatMessages.count}`);

    const deletedPaymentMethods = await prisma.paymentMethod.deleteMany({});
    console.log(`   ✅ PaymentMethods: ${deletedPaymentMethods.count}`);

    const deletedNotifications = await prisma.notification.deleteMany({});
    console.log(`   ✅ Notifications: ${deletedNotifications.count}`);

    const deletedReviews = await prisma.review.deleteMany({});
    console.log(`   ✅ Reviews: ${deletedReviews.count}`);

    const deletedPayments = await prisma.payment.deleteMany({});
    console.log(`   ✅ Payments: ${deletedPayments.count}`);

    const deletedWorkOrders = await prisma.workOrder.deleteMany({});
    console.log(`   ✅ WorkOrders: ${deletedWorkOrders.count}`);

    const deletedQuotes = await prisma.quote.deleteMany({});
    console.log(`   ✅ Quotes: ${deletedQuotes.count}`);

    const deletedServiceRequests = await prisma.serviceRequest.deleteMany({});
    console.log(`   ✅ ServiceRequests: ${deletedServiceRequests.count}`);

    const deletedMaintenanceSchedules = await prisma.vehicleMaintenanceSchedule.deleteMany({});
    console.log(`   ✅ MaintenanceSchedules: ${deletedMaintenanceSchedules.count}`);

    const deletedVehicles = await prisma.vehicle.deleteMany({});
    console.log(`   ✅ Vehicles: ${deletedVehicles.count}`);

    const deletedSubscriptions = await prisma.subscription.deleteMany({});
    console.log(`   ✅ Subscriptions: ${deletedSubscriptions.count}`);

    const deletedCoverageZones = await prisma.coverageZone.deleteMany({});
    console.log(`   ✅ CoverageZones: ${deletedCoverageZones.count}`);

    const deletedProviderProfiles = await prisma.providerProfile.deleteMany({});
    console.log(`   ✅ ProviderProfiles: ${deletedProviderProfiles.count}`);

    const deletedNotices = await prisma.notice.deleteMany({});
    console.log(`   ✅ Notices: ${deletedNotices.count}`);

    const deletedArticles = await prisma.article.deleteMany({});
    console.log(`   ✅ Articles: ${deletedArticles.count}`);

    const deletedSpecialOffers = await prisma.specialOffer.deleteMany({});
    console.log(`   ✅ SpecialOffers: ${deletedSpecialOffers.count}`);

    const deletedBanners = await prisma.banner.deleteMany({});
    console.log(`   ✅ Banners: ${deletedBanners.count}`);

    // 3. Deleta TODOS os usuários (incluindo ADMIN antigos)
    const deletedUsers = await prisma.user.deleteMany({});
    console.log(`   ✅ Users: ${deletedUsers.count}`);

    // 4. Verifica se está vazio
    const remainingUsers = await prisma.user.count();
    console.log(`\n📊 Total de usuários depois: ${remainingUsers}`);

    console.log('\n✅ BANCO LIMPO COM SUCESSO!');
    console.log('\n📝 Próximos passos:');
    console.log('   1️⃣  Rode: npx prisma db seed');
    console.log('   2️⃣  Faça push para deploy automático no Render');
    console.log('   3️⃣  Teste o app mobile com novos usuários\n');

  } catch (error) {
    console.error('❌ Erro ao limpar banco:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
