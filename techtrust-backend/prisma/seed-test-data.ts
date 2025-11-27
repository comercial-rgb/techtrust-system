/// <reference types="node" />
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Criando dados de teste...\n');

  // 1. Criar usuário PROVIDER (João Mecânico)
  console.log('1️⃣ Criando usuário PROVIDER...');
  
  const existingProvider = await prisma.user.findFirst({
    where: { 
      OR: [
        { email: 'joao.mecanico@teste.com' },
        { phone: '+14075559999' }
      ]
    }
  });

  let provider;
  if (existingProvider) {
    console.log('   ⚠️  Usuário João Mecânico já existe!');
    console.log(`   📝 ID: ${existingProvider.id}`);
    provider = existingProvider;
  } else {
    provider = await prisma.user.create({
      data: {
        fullName: 'João Mecânico',
        email: 'joao.mecanico@teste.com',
        phone: '+14075559999',
        passwordHash: '$2b$10$abcdefghijklmnopqrstuv', // hash placeholder
        role: 'PROVIDER',
        status: 'ACTIVE',
        language: 'PT',
        emailVerified: true,
        phoneVerified: true,
      },
    });
    console.log('   ✅ Usuário PROVIDER criado!');
    console.log(`   📝 ID: ${provider.id}`);
  }

  // 2. Criar ProviderProfile
  console.log('\n2️⃣ Criando ProviderProfile...');
  
  const existingProfile = await prisma.providerProfile.findUnique({
    where: { userId: provider.id }
  });

  let providerProfile;
  if (existingProfile) {
    console.log('   ⚠️  ProviderProfile já existe!');
    providerProfile = existingProfile;
  } else {
    providerProfile = await prisma.providerProfile.create({
      data: {
        userId: provider.id,
        businessName: 'Oficina do João',
        address: '123 Main St',
        city: 'Orlando',
        state: 'FL',
        zipCode: '32801',
        averageRating: 4.8,
        totalReviews: 15,
        totalServicesCompleted: 25,
        specialties: ['oil_change', 'brake_repair', 'engine_diagnostic'],
      },
    });
    console.log('   ✅ ProviderProfile criado!');
    console.log(`   📝 ID: ${providerProfile.id}`);
  }

  // 3. Buscar uma ServiceRequest existente para criar o Quote
  console.log('\n3️⃣ Buscando ServiceRequest existente...');
  
  const serviceRequest = await prisma.serviceRequest.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  if (!serviceRequest) {
    console.log('   ⚠️  Nenhuma ServiceRequest encontrada!');
    console.log('   ℹ️  Criando uma ServiceRequest de teste...');
    
    // Buscar um usuário CLIENT existente
    let clientUser = await prisma.user.findFirst({
      where: { role: 'CLIENT' }
    });

    if (!clientUser) {
      // Criar um usuário CLIENT se não existir
      clientUser = await prisma.user.create({
        data: {
          fullName: 'Cliente Teste',
          email: 'cliente.teste@teste.com',
          phone: '+14075551234',
          passwordHash: '$2b$10$abcdefghijklmnopqrstuv',
          role: 'CLIENT',
          status: 'ACTIVE',
          language: 'PT',
          emailVerified: true,
          phoneVerified: true,
        },
      });
      console.log('   ✅ Usuário CLIENT criado!');
    }

    // Buscar ou criar um veículo
    let vehicle = await prisma.vehicle.findFirst({
      where: { userId: clientUser.id }
    });

    if (!vehicle) {
      vehicle = await prisma.vehicle.create({
        data: {
          userId: clientUser.id,
          plateNumber: 'ABC1234',
          make: 'Honda',
          model: 'Civic',
          year: 2020,
          color: 'Prata',
          isPrimary: true,
        },
      });
      console.log('   ✅ Veículo criado!');
    }

    // Criar ServiceRequest
    const newServiceRequest = await prisma.serviceRequest.create({
      data: {
        requestNumber: `REQ-${Date.now()}`,
        userId: clientUser.id,
        vehicleId: vehicle.id,
        serviceType: 'SCHEDULED_MAINTENANCE',
        title: 'Troca de óleo e filtros',
        description: 'Preciso fazer troca de óleo sintético e trocar os filtros de óleo e ar.',
        serviceLocationType: 'SHOP',
        status: 'QUOTES_RECEIVED',
        isUrgent: false,
        quoteDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
      },
    });
    console.log('   ✅ ServiceRequest criada!');
    console.log(`   📝 ID: ${newServiceRequest.id}`);

    // Criar o Quote para esta ServiceRequest
    await createQuote(newServiceRequest.id, provider.id);
  } else {
    console.log(`   ✅ ServiceRequest encontrada: ${serviceRequest.id}`);
    console.log(`   📝 Request Number: ${serviceRequest.requestNumber}`);
    
    // Verificar se já existe um Quote para este provider e request
    const existingQuote = await prisma.quote.findFirst({
      where: {
        serviceRequestId: serviceRequest.id,
        providerId: provider.id,
      }
    });

    if (existingQuote) {
      console.log('\n4️⃣ Quote já existe!');
      console.log(`   📝 Quote ID: ${existingQuote.id}`);
      console.log(`   📝 Quote Number: ${existingQuote.quoteNumber}`);
    } else {
      await createQuote(serviceRequest.id, provider.id);
    }
  }

  console.log('\n✅ Dados de teste criados com sucesso!');
}

async function createQuote(serviceRequestId: string, providerId: string) {
  console.log('\n4️⃣ Criando Quote...');
  
  const quote = await prisma.quote.create({
    data: {
      quoteNumber: 'QUO-123456-TEST',
      serviceRequestId: serviceRequestId,
      providerId: providerId,
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

  // Atualizar o contador de quotes na ServiceRequest
  await prisma.serviceRequest.update({
    where: { id: serviceRequestId },
    data: { 
      quotesCount: { increment: 1 },
      status: 'QUOTES_RECEIVED'
    },
  });

  console.log('   ✅ Quote criado!');
  console.log(`   📝 ID: ${quote.id}`);
  console.log(`   📝 Quote Number: ${quote.quoteNumber}`);
  console.log(`   💰 Total: $${quote.totalAmount}`);
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
