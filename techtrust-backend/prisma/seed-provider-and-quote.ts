import { logger } from "../src/config/logger";
/// <reference types="node" />
/**
 * ============================================
 * SEED - Criar Provider e Quote de Teste
 * ============================================
 * 
 * Execute com: npx ts-node prisma/seed-provider-and-quote.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  logger.info('🌱 Criando dados de teste: Provider + Quote\n');

  // ===========================================
  // 1. Criar Usuário PROVIDER
  // ===========================================
  logger.info('1️⃣ Criando usuário PROVIDER...');
  
  const providerPassword = await bcrypt.hash('Teste123!', 10);
  
  let provider = await prisma.user.findUnique({
    where: { email: 'joao.mecanico@teste.com' },
  });

  if (provider) {
    logger.info('   ⚠️  Usuário já existe!');
    logger.info(`   📝 ID: ${provider.id}`);
  } else {
    provider = await prisma.user.create({
      data: {
        fullName: 'João Mecânico',
        email: 'joao.mecanico@teste.com',
        phone: '+14075559999',
        passwordHash: providerPassword,
        role: 'PROVIDER',
        status: 'ACTIVE',
        language: 'PT',
        emailVerified: true,
        phoneVerified: true,
        address: '456 Service Road',
        city: 'Orlando',
        state: 'FL',
        zipCode: '32802',
      },
    });
    logger.info('   ✅ Usuário PROVIDER criado!');
    logger.info(`   📝 ID: ${provider.id}`);
  }

  // ===========================================
  // 2. Criar ProviderProfile
  // ===========================================
  logger.info('\n2️⃣ Criando ProviderProfile...');
  
  let providerProfile = await prisma.providerProfile.findUnique({
    where: { userId: provider.id },
  });

  if (providerProfile) {
    logger.info('   ⚠️  ProviderProfile já existe!');
    logger.info(`   📝 ID: ${providerProfile.id}`);
  } else {
    providerProfile = await prisma.providerProfile.create({
      data: {
        userId: provider.id,
        businessName: 'Oficina do João',
        address: '456 Service Road',
        city: 'Orlando',
        state: 'FL',
        zipCode: '32802',
        averageRating: 4.8,
        totalReviews: 15,
        totalServicesCompleted: 25,
        specialties: ['oil_change', 'brake_repair', 'engine_diagnostic'],
        serviceRadiusKm: 30,
        isVerified: true,
        businessHours: {
          monday: { open: '08:00', close: '18:00' },
          tuesday: { open: '08:00', close: '18:00' },
          wednesday: { open: '08:00', close: '18:00' },
          thursday: { open: '08:00', close: '18:00' },
          friday: { open: '08:00', close: '18:00' },
          saturday: { open: '09:00', close: '14:00' },
        },
      },
    });
    logger.info('   ✅ ProviderProfile criado!');
    logger.info(`   📝 ID: ${providerProfile.id}`);
  }

  // ===========================================
  // 3. Buscar ServiceRequest mais recente
  // ===========================================
  logger.info('\n3️⃣ Buscando ServiceRequest mais recente...');
  
  const serviceRequest = await prisma.serviceRequest.findFirst({
    where: {
      status: {
        in: ['SEARCHING_PROVIDERS', 'QUOTES_RECEIVED'],
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!serviceRequest) {
    logger.info('   ❌ Nenhuma ServiceRequest aberta encontrada!');
    logger.info('   💡 Dica: Crie uma solicitação no app mobile primeiro.');
    return;
  }

  logger.info(`   ✅ ServiceRequest encontrada: ${serviceRequest.requestNumber}`);
  logger.info(`   📝 ID: ${serviceRequest.id}`);
  logger.info(`   🔧 Título: ${serviceRequest.title}`);

  // ===========================================
  // 4. Verificar se já existe Quote
  // ===========================================
  logger.info('\n4️⃣ Verificando Quotes existentes...');
  
  const existingQuote = await prisma.quote.findFirst({
    where: {
      serviceRequestId: serviceRequest.id,
      providerId: provider.id,
    },
  });

  if (existingQuote) {
    logger.info('   ⚠️  Quote já existe!');
    logger.info(`   📝 Quote ID: ${existingQuote.id}`);
    logger.info(`   📝 Quote Number: ${existingQuote.quoteNumber}`);
    logger.info(`   💰 Valor: R$ ${existingQuote.totalAmount}`);
    return;
  }

  // ===========================================
  // 5. Criar Quote
  // ===========================================
  logger.info('\n5️⃣ Criando Quote...');
  
  const quoteNumber = `QUO-${Date.now()}-TEST`;
  
  const quote = await prisma.quote.create({
    data: {
      quoteNumber,
      serviceRequestId: serviceRequest.id,
      providerId: provider.id,
      partsCost: 200.00,
      laborCost: 150.00,
      additionalFees: 0.00,
      taxAmount: 35.00,
      totalAmount: 385.00,
      partsList: [
        { name: 'Óleo sintético 5W-30', quantity: 5, unitPrice: 25.00, total: 125.00 },
        { name: 'Filtro de óleo', quantity: 1, unitPrice: 35.00, total: 35.00 },
        { name: 'Filtro de ar', quantity: 1, unitPrice: 40.00, total: 40.00 },
      ],
      laborDescription: 'Troca de óleo sintético e filtros',
      estimatedHours: 1.5,
      status: 'PENDING',
      validUntil: new Date('2025-12-31'),
      warrantyMonths: 3,
      warrantyMileage: 5000,
      warrantyDescription: 'Garantia de 3 meses ou 5.000 km para mão de obra',
    },
  });

  logger.info('   ✅ Quote criado!');
  logger.info(`   📝 Quote ID: ${quote.id}`);
  logger.info(`   📝 Quote Number: ${quote.quoteNumber}`);
  logger.info(`   💰 Valor Total: R$ ${quote.totalAmount}`);

  // ===========================================
  // 6. Atualizar ServiceRequest
  // ===========================================
  logger.info('\n6️⃣ Atualizando ServiceRequest...');
  
  await prisma.serviceRequest.update({
    where: { id: serviceRequest.id },
    data: {
      quotesCount: { increment: 1 },
      status: 'QUOTES_RECEIVED',
    },
  });

  logger.info('   ✅ ServiceRequest atualizada!');
  logger.info(`   📊 Status: QUOTES_RECEIVED`);
  logger.info(`   📋 Quotes Count: ${serviceRequest.quotesCount + 1}`);

  // ===========================================
  // Resumo Final
  // ===========================================
  logger.info('\n' + '='.repeat(60));
  logger.info('✅ DADOS DE TESTE CRIADOS COM SUCESSO!');
  logger.info('='.repeat(60));
  logger.info('\n📋 Resumo:');
  logger.info('');
  logger.info('👨‍🔧 FORNECEDOR:');
  logger.info('   Email: joao.mecanico@teste.com');
  logger.info('   Senha: Teste123!');
  logger.info('   Oficina: Oficina do João');
  logger.info(`   ID: ${provider.id}`);
  logger.info('');
  logger.info('💰 ORÇAMENTO:');
  logger.info(`   Quote Number: ${quote.quoteNumber}`);
  logger.info(`   Para Request: ${serviceRequest.requestNumber}`);
  logger.info(`   Valor Total: R$ ${quote.totalAmount}`);
  logger.info(`   Status: ${quote.status}`);
  logger.info('');
  logger.info('📱 PRÓXIMOS PASSOS:');
  logger.info('   1. Abra o app mobile');
  logger.info('   2. Faça login com: cliente@teste.com / Teste123!');
  logger.info('   3. Vá para "Início" ou "Serviços"');
  logger.info('   4. Abra a solicitação para ver o orçamento');
  logger.info('   5. Aceite o orçamento para criar uma Work Order');
  logger.info('');
}

main()
  .catch((e) => {
    logger.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
