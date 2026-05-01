import { PrismaClient } from "@prisma/client";

import { logger } from "../src/config/logger";
const prisma = new PrismaClient();

async function checkOffers() {
  try {
    logger.info("Verificando ofertas no banco...\n");

    const allOffers = await prisma.specialOffer.findMany();
    logger.info(`Total de ofertas: ${allOffers.length}`);

    if (allOffers.length === 0) {
      logger.info("\n❌ Nenhuma oferta encontrada no banco!");
    } else {
      logger.info("\nOfertas encontradas:");
      allOffers.forEach((offer) => {
        logger.info(`\n  ID: ${offer.id}`);
        logger.info(`  Title: ${offer.title}`);
        logger.info(`  isActive: ${offer.isActive}`);
        logger.info(`  validFrom: ${offer.validFrom}`);
        logger.info(`  validUntil: ${offer.validUntil}`);
        logger.info(`  isFeatured: ${offer.isFeatured}`);
      });
    }

    // Verificar filtro de datas
    const now = new Date();
    logger.info(`\nData atual: ${now.toISOString()}`);

    const activeOffers = await prisma.specialOffer.findMany({
      where: {
        isActive: true,
        OR: [
          { validFrom: null, validUntil: null },
          { validFrom: { lte: now }, validUntil: null },
          { validFrom: null, validUntil: { gte: now } },
          { validFrom: { lte: now }, validUntil: { gte: now } },
        ],
      },
    });

    logger.info(`\nOfertas que passam no filtro: ${activeOffers.length}`);
  } catch (error) {
    logger.error("Erro:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOffers();
