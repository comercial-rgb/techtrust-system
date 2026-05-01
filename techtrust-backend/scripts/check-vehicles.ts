import { PrismaClient } from "@prisma/client";

import { logger } from "../src/config/logger";
const prisma = new PrismaClient();

async function main() {
  // All vehicles
  const allVehicles = await prisma.vehicle.findMany({
    include: { user: { select: { id: true, fullName: true, email: true } } },
  });

  logger.info("\n=== ALL VEHICLES IN DATABASE ===");
  logger.info("Total:", allVehicles.length);
  allVehicles.forEach((v) => {
    logger.info("---");
    logger.info("  Vehicle ID:", v.id);
    logger.info("  User:", v.user.fullName, "-", v.user.email);
    logger.info("  User ID:", v.user.id);
    logger.info("  Make:", v.make, "| Model:", v.model, "| Year:", v.year);
    logger.info("  Plate:", v.plateNumber, "| VIN:", v.vin);
    logger.info("  isPrimary:", v.isPrimary, "| isActive:", v.isActive);
    logger.info("  Created:", v.createdAt);
  });

  // All users (customers)
  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" as any },
    select: { id: true, fullName: true, email: true },
  });

  logger.info("\n=== ALL CUSTOMERS ===");
  customers.forEach((c) => {
    logger.info("  ", c.id, "-", c.fullName, "-", c.email);
  });

  await prisma.$disconnect();
}

main().catch((e: unknown) => logger.error(String(e)));
