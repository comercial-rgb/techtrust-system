/// <reference types="node" />
/**
 * ============================================
 * SEED - Dados Iniciais de Teste
 * ============================================
 *
 * Execute com: npm run seed
 */

import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed do banco de dados...\n");

  // ===========================================
  // 1. Criar usuário ADMIN
  // ===========================================
  console.log("1️⃣ Criando usuário ADMIN...");

  const adminPassword = await bcrypt.hash("Admin123!", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@techtrust.com" },
    update: {},
    create: {
      fullName: "Administrador TechTrust",
      email: "admin@techtrust.com",
      phone: "+14075550000",
      passwordHash: adminPassword,
      role: "ADMIN",
      status: "ACTIVE",
      language: "PT",
      emailVerified: true,
      phoneVerified: true,
    },
  });
  console.log(`   ✅ Admin criado: ${admin.email}`);

  // ===========================================
  // 1.5 Seed Subscription Plan Templates
  // ===========================================
  console.log("\n📋 Seeding subscription plan templates...");

  const planTemplates = [
    {
      planKey: "free",
      name: "Free",
      description: "Perfect for getting started",
      monthlyPrice: 0,
      yearlyPrice: 0,
      vehicleLimit: 2,
      serviceRequestsPerMonth: 4,
      features: ["2 vehicles (+$6.99/extra)", "4 service requests/month", "VIN decode & NHTSA recalls", "FDACS compliance", "PDF receipts"],
      isActive: true,
      isFeatured: false,
      position: 0,
    },
    {
      planKey: "starter",
      name: "Starter",
      description: "For individuals who want more",
      monthlyPrice: 9.99,
      yearlyPrice: 99.99,
      vehicleLimit: 3,
      serviceRequestsPerMonth: 10,
      features: ["3 vehicles (+$5.99/extra)", "10 service requests/month", "Multi-language support", "Mileage tracker", "Scheduled maintenance", "Quote sharing", "1 oil change/year included", "10% SOS discount"],
      isActive: true,
      isFeatured: false,
      position: 1,
    },
    {
      planKey: "pro",
      name: "Pro",
      description: "Best value for families & growing needs",
      monthlyPrice: 19.99,
      yearlyPrice: 199.99,
      vehicleLimit: 5,
      serviceRequestsPerMonth: null,
      features: ["5 vehicles (+$3.99/extra)", "Unlimited service requests", "OEM parts lookup", "Digital wallet", "Expense reports", "OBD2 basic diagnostics", "2 oil changes + 1 brake inspection/year", "20% SOS discount + priority", "Priority support 24/7"],
      isActive: true,
      isFeatured: true,
      position: 2,
    },
    {
      planKey: "enterprise",
      name: "Enterprise",
      description: "For families, businesses & fleets",
      monthlyPrice: 49.99,
      yearlyPrice: 499.99,
      vehicleLimit: 14,
      serviceRequestsPerMonth: null,
      features: ["14 vehicles (custom pricing)", "Unlimited service requests", "Vehicle dashboard & analytics", "Advanced OBD2 diagnostics", "4 oil changes + unlimited inspections/year", "2 free SOS/month + 30% discount", "All Pro features included", "Dedicated account manager"],
      isActive: true,
      isFeatured: false,
      position: 3,
    },
  ];

  for (const template of planTemplates) {
    await prisma.subscriptionPlanTemplate.upsert({
      where: { planKey: template.planKey },
      update: {
        name: template.name,
        description: template.description,
        monthlyPrice: template.monthlyPrice,
        yearlyPrice: template.yearlyPrice,
        vehicleLimit: template.vehicleLimit,
        serviceRequestsPerMonth: template.serviceRequestsPerMonth,
        features: template.features,
        isActive: template.isActive,
        isFeatured: template.isFeatured,
        position: template.position,
      },
      create: template,
    });
  }
  console.log("   ✅ Plan templates seeded (Free, Starter, Pro, Enterprise)");

  // ===========================================
  // 2. Criar usuário CLIENT de teste
  // ===========================================
  console.log("\n2️⃣ Criando usuário CLIENT de teste...");

  const clientPassword = await bcrypt.hash("Teste123!", 10);

  const client = await prisma.user.upsert({
    where: { email: "cliente@teste.com" },
    update: {},
    create: {
      fullName: "Maria Silva",
      email: "cliente@teste.com",
      phone: "+14075551234",
      passwordHash: clientPassword,
      role: "CLIENT",
      status: "ACTIVE",
      language: "PT",
      emailVerified: true,
      phoneVerified: true,
      address: "123 Main Street",
      city: "Orlando",
      state: "FL",
      zipCode: "32801",
    },
  });
  console.log(`   ✅ Cliente criado: ${client.email}`);

  // Criar assinatura FREE para o cliente
  const existingSubscription = await prisma.subscription.findFirst({
    where: { userId: client.id },
  });

  if (!existingSubscription) {
    await prisma.subscription.create({
      data: {
        userId: client.id,
        plan: "FREE",
        price: 0,
        maxVehicles: 1,
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    console.log("   ✅ Assinatura FREE criada");
  } else {
    console.log("   ⚠️ Assinatura já existe");
  }

  // ===========================================
  // 3. Criar usuário PROVIDER de teste
  // ===========================================
  console.log("\n3️⃣ Criando usuário PROVIDER de teste...");

  const providerPassword = await bcrypt.hash("Teste123!", 10);

  const provider = await prisma.user.upsert({
    where: { email: "fornecedor@teste.com" },
    update: {},
    create: {
      fullName: "João Mecânico",
      email: "fornecedor@teste.com",
      phone: "+14075559999",
      passwordHash: providerPassword,
      role: "PROVIDER",
      status: "ACTIVE",
      language: "PT",
      emailVerified: true,
      phoneVerified: true,
      address: "456 Service Road",
      city: "Orlando",
      state: "FL",
      zipCode: "32802",
    },
  });
  console.log(`   ✅ Fornecedor criado: ${provider.email}`);

  // Criar perfil do fornecedor
  await prisma.providerProfile.upsert({
    where: { userId: provider.id },
    update: {},
    create: {
      userId: provider.id,
      businessName: "Oficina do João",
      businessPhone: "+14075559999",
      businessEmail: "contato@oficinajpao.com",
      address: "456 Service Road",
      city: "Orlando",
      state: "FL",
      zipCode: "32802",
      serviceRadiusKm: 30,
      isVerified: true,
      averageRating: 4.8,
      totalReviews: 15,
      totalServicesCompleted: 50,
      specialties: [
        "oil_change",
        "brake_repair",
        "engine_diagnostic",
        "tire_service",
      ],
      businessHours: {
        monday: { open: "08:00", close: "18:00" },
        tuesday: { open: "08:00", close: "18:00" },
        wednesday: { open: "08:00", close: "18:00" },
        thursday: { open: "08:00", close: "18:00" },
        friday: { open: "08:00", close: "18:00" },
        saturday: { open: "09:00", close: "14:00" },
        sunday: { open: null, close: null },
      },
    },
  });
  console.log("   ✅ Perfil do fornecedor criado");

  // ===========================================
  // 4. Criar veículo de teste para o cliente
  // ===========================================
  console.log("\n4️⃣ Criando veículo de teste...");

  let vehicle = await prisma.vehicle.findFirst({
    where: { userId: client.id, plateNumber: "ABC1234" },
  });
  if (!vehicle) {
    vehicle = await prisma.vehicle.create({
      data: {
        userId: client.id,
        plateNumber: "ABC1234",
        vin: "1HGCM82633A123456",
        make: "Honda",
        model: "Civic",
        year: 2020,
        color: "Prata",
        currentMileage: 45000,
        isPrimary: true,
        isActive: true,
      },
    });
    console.log(
      `   ✅ Veículo criado: ${vehicle.make} ${vehicle.model} - ${vehicle.plateNumber}`,
    );
  } else {
    console.log(`   ⚠️ Veículo já existe: ${vehicle.make} ${vehicle.model}`);
  }

  // ===========================================
  // 5. Criar segundo veículo (opcional)
  // ===========================================
  let vehicle2 = await prisma.vehicle.findFirst({
    where: { userId: client.id, plateNumber: "XYZ5678" },
  });
  if (!vehicle2) {
    vehicle2 = await prisma.vehicle.create({
      data: {
        userId: client.id,
        plateNumber: "XYZ5678",
        make: "Toyota",
        model: "Corolla",
        year: 2022,
        color: "Branco",
        currentMileage: 15000,
        isPrimary: false,
        isActive: true,
      },
    });
  }
  console.log(`   ✅ Veículo 2 criado: ${vehicle2.make} ${vehicle2.model}`);

  // ===========================================
  // 6. Criar solicitação de serviço de exemplo
  // ===========================================
  console.log("\n5️⃣ Criando solicitação de serviço...");

  const requestNumber = `SR-${Date.now()}-SEED`;

  const serviceRequest = await prisma.serviceRequest.create({
    data: {
      requestNumber,
      userId: client.id,
      vehicleId: vehicle.id,
      serviceType: "SCHEDULED_MAINTENANCE",
      title: "Troca de óleo e revisão geral",
      description:
        "Preciso fazer troca de óleo sintético 5W-30, filtro de óleo, filtro de ar e verificar freios. Última revisão foi há 10.000 km.",
      serviceLocationType: "SHOP",
      status: "QUOTES_RECEIVED",
      isUrgent: false,
      maxQuotes: 5,
      quotesCount: 1,
      quoteDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 horas
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
    },
  });
  console.log(`   ✅ Solicitação criada: ${serviceRequest.requestNumber}`);

  // ===========================================
  // 7. Criar orçamento do fornecedor
  // ===========================================
  console.log("\n6️⃣ Criando orçamento...");

  const quoteNumber = `QT-${Date.now()}-SEED`;

  const quote = await prisma.quote.create({
    data: {
      quoteNumber,
      serviceRequestId: serviceRequest.id,
      providerId: provider.id,
      partsCost: 180.0,
      laborCost: 120.0,
      additionalFees: 0,
      taxAmount: 30.0,
      totalAmount: 330.0,
      partsList: [
        {
          name: "Óleo Sintético 5W-30",
          quantity: 5,
          unitPrice: 25.0,
          total: 125.0,
        },
        { name: "Filtro de Óleo", quantity: 1, unitPrice: 35.0, total: 35.0 },
        { name: "Filtro de Ar", quantity: 1, unitPrice: 20.0, total: 20.0 },
      ],
      laborDescription:
        "Troca de óleo, filtros e inspeção de freios com relatório",
      estimatedHours: 1.5,
      status: "PENDING",
      validUntil: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 horas
      warrantyMonths: 3,
      warrantyMileage: 5000,
      warrantyDescription: "Garantia de 3 meses ou 5.000 km para mão de obra",
      notes:
        "Peças originais ou de qualidade equivalente. Tempo estimado: 1h30.",
    },
  });
  console.log(`   ✅ Orçamento criado: ${quote.quoteNumber}`);
  console.log(`   💰 Valor total: R$ ${quote.totalAmount.toFixed(2)}`);

  // ===========================================
  // Resumo Final
  // ===========================================
  console.log("\n" + "=".repeat(50));
  console.log("✅ SEED CONCLUÍDO COM SUCESSO!");
  console.log("=".repeat(50));
  console.log("\n📋 Dados de teste criados:");
  console.log("");
  console.log("👤 ADMIN:");
  console.log("   Email: admin@techtrust.com");
  console.log("   Senha: Admin123!");
  console.log("");
  console.log("👤 CLIENTE:");
  console.log("   Email: cliente@teste.com");
  console.log("   Senha: Teste123!");
  console.log("   Veículos: Honda Civic 2020, Toyota Corolla 2022");
  console.log("");
  console.log("👨‍🔧 FORNECEDOR:");
  console.log("   Email: fornecedor@teste.com");
  console.log("   Senha: Teste123!");
  console.log("   Oficina: Oficina do João");
  console.log("");
  console.log("📝 SOLICITAÇÃO DE TESTE:");
  console.log(`   Request: ${serviceRequest.requestNumber}`);
  console.log(`   Quote: ${quote.quoteNumber}`);
  console.log("");
  console.log("🚀 Backend pronto para uso!");
  console.log("   Execute: npm run dev");
  console.log("");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
