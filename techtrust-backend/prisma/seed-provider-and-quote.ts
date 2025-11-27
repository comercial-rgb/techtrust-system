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
  console.log('🌱 Criando dados de teste: Provider + Quote\n');

  // ===========================================
  // 1. Criar Usuário PROVIDER
  // ===========================================
  console.log('1️⃣ Criando usuário PROVIDER...');
  
  const providerPassword = await bcrypt.hash('Teste123!', 10);
  
  let provider = await prisma.user.findUnique({
    where: { email: 'joao.mecanico@teste.com' },
  });

  if (provider) {
    console.log('   ⚠️  Usuário já existe!');
    console.log(`   📝 ID: ${provider.id}`);
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
    console.log('   ✅ Usuário PROVIDER criado!');
    console.log(`   📝 ID: ${provider.id}`);
  }

  // ===========================================
  // 2. Criar ProviderProfile
  // ===========================================
  console.log('\n2️⃣ Criando ProviderProfile...');
  
  let providerProfile = await prisma.providerProfile.findUnique({
    where: { userId: provider.id },
  });

  if (providerProfile) {
    console.log('   ⚠️  ProviderProfile já existe!');
    console.log(`   📝 ID: ${providerProfile.id}`);
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
    console.log('   ✅ ProviderProfile criado!');
    console.log(`   📝 ID: ${providerProfile.id}`);
  }

  // ===========================================
  // 3. Buscar ServiceRequest mais recente
  // ===========================================
  console.log('\n3️⃣ Buscando ServiceRequest mais recente...');
  
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
    console.log('   ❌ Nenhuma ServiceRequest aberta encontrada!');
    console.log('   💡 Dica: Crie uma solicitação no app mobile primeiro.');
    return;
  }

  console.log(`   ✅ ServiceRequest encontrada: ${serviceRequest.requestNumber}`);
  console.log(`   📝 ID: ${serviceRequest.id}`);
  console.log(`   🔧 Título: ${serviceRequest.title}`);

  // ===========================================
  // 4. Verificar se já existe Quote
  // ===========================================
  console.log('\n4️⃣ Verificando Quotes existentes...');
  
  const existingQuote = await prisma.quote.findFirst({
    where: {
      serviceRequestId: serviceRequest.id,
      providerId: provider.id,
    },
  });

  if (existingQuote) {
    console.log('   ⚠️  Quote já existe!');
    console.log(`   📝 Quote ID: ${existingQuote.id}`);
    console.log(`   📝 Quote Number: ${existingQuote.quoteNumber}`);
    console.log(`   💰 Valor: R$ ${existingQuote.totalAmount}`);
    return;
  }

  // ===========================================
  // 5. Criar Quote
  // ===========================================
  console.log('\n5️⃣ Criando Quote...');
  
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

  console.log('   ✅ Quote criado!');
  console.log(`   📝 Quote ID: ${quote.id}`);
  console.log(`   📝 Quote Number: ${quote.quoteNumber}`);
  console.log(`   💰 Valor Total: R$ ${quote.totalAmount}`);

  // ===========================================
  // 6. Atualizar ServiceRequest
  // ===========================================
  console.log('\n6️⃣ Atualizando ServiceRequest...');
  
  await prisma.serviceRequest.update({
    where: { id: serviceRequest.id },
    data: {
      quotesCount: { increment: 1 },
      status: 'QUOTES_RECEIVED',
    },
  });

  console.log('   ✅ ServiceRequest atualizada!');
  console.log(`   📊 Status: QUOTES_RECEIVED`);
  console.log(`   📋 Quotes Count: ${serviceRequest.quotesCount + 1}`);

  // ===========================================
  // Resumo Final
  // ===========================================
  console.log('\n' + '='.repeat(60));
  console.log('✅ DADOS DE TESTE CRIADOS COM SUCESSO!');
  console.log('='.repeat(60));
  console.log('\n📋 Resumo:');
  console.log('');
  console.log('👨‍🔧 FORNECEDOR:');
  console.log('   Email: joao.mecanico@teste.com');
  console.log('   Senha: Teste123!');
  console.log('   Oficina: Oficina do João');
  console.log(`   ID: ${provider.id}`);
  console.log('');
  console.log('💰 ORÇAMENTO:');
  console.log(`   Quote Number: ${quote.quoteNumber}`);
  console.log(`   Para Request: ${serviceRequest.requestNumber}`);
  console.log(`   Valor Total: R$ ${quote.totalAmount}`);
  console.log(`   Status: ${quote.status}`);
  console.log('');
  console.log('📱 PRÓXIMOS PASSOS:');
  console.log('   1. Abra o app mobile');
  console.log('   2. Faça login com: cliente@teste.com / Teste123!');
  console.log('   3. Vá para "Início" ou "Serviços"');
  console.log('   4. Abra a solicitação para ver o orçamento');
  console.log('   5. Aceite o orçamento para criar uma Work Order');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
