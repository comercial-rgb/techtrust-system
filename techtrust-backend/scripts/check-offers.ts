import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOffers() {
  try {
    console.log('Verificando ofertas no banco...\n');
    
    const allOffers = await prisma.specialOffer.findMany();
    console.log(`Total de ofertas: ${allOffers.length}`);
    
    if (allOffers.length === 0) {
      console.log('\n❌ Nenhuma oferta encontrada no banco!');
    } else {
      console.log('\nOfertas encontradas:');
      allOffers.forEach(offer => {
        console.log(`\n  ID: ${offer.id}`);
        console.log(`  Title: ${offer.title}`);
        console.log(`  isActive: ${offer.isActive}`);
        console.log(`  validFrom: ${offer.validFrom}`);
        console.log(`  validUntil: ${offer.validUntil}`);
        console.log(`  isFeatured: ${offer.isFeatured}`);
      });
    }
    
    // Verificar filtro de datas
    const now = new Date();
    console.log(`\nData atual: ${now.toISOString()}`);
    
    const activeOffers = await prisma.specialOffer.findMany({
      where: {
        isActive: true,
        OR: [
          { validFrom: null, validUntil: null },
          { validFrom: { lte: now }, validUntil: null },
          { validFrom: null, validUntil: { gte: now } },
          { validFrom: { lte: now }, validUntil: { gte: now } }
        ]
      }
    });
    
    console.log(`\nOfertas que passam no filtro: ${activeOffers.length}`);
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOffers();
