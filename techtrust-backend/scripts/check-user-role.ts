import { PrismaClient } from "@prisma/client";

import { logger } from "../src/config/logger";
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: "contact@techtrustautosolutions.com" },
    include: { providerProfile: true },
  });

  if (!user) {
    logger.info("User NOT FOUND");
    return;
  }

  logger.info("User ID:", user.id);
  logger.info("Role:", user.role);
  logger.info("Phone Verified:", user.phoneVerified);
  logger.info("Email Verified:", user.emailVerified);
  logger.info("Status:", user.status);
  logger.info("Has Provider Profile:", !!user.providerProfile);
  if (user.providerProfile) {
    logger.info("Business Name:", user.providerProfile.businessName);
  }
}

main()
  .catch((e: unknown) => logger.error(String(e)))
  .finally(() => prisma.$disconnect());
