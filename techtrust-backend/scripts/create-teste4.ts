import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

import { logger } from "../src/config/logger";
const prisma = new PrismaClient();

async function main() {
  logger.info("Creating teste4@gmail.com...");

  const hash = await bcrypt.hash("Teste123!", 10);

  const user = await prisma.user.upsert({
    where: { email: "teste4@gmail.com" },
    update: {},
    create: {
      fullName: "Teste 4",
      email: "teste4@gmail.com",
      phone: "+14075554444",
      passwordHash: hash,
      role: "CLIENT",
      status: "ACTIVE",
      language: "PT",
      emailVerified: true,
      phoneVerified: true,
    },
  });

  // Create FREE subscription
  const sub = await prisma.subscription.findFirst({
    where: { userId: user.id },
  });
  if (!sub) {
    await prisma.subscription.create({
      data: {
        userId: user.id,
        plan: "FREE",
        price: 0,
        maxVehicles: 1,
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
    logger.info("FREE subscription created");
  }

  logger.info(
    `✅ User created: ${user.email} | ID: ${user.id} | Status: ${user.status}`,
  );
  logger.info(`🔑 Password: Teste123!`);

  await prisma.$disconnect();
}

main().catch((e) => {
  logger.error("Error:", e);
  process.exit(1);
});
