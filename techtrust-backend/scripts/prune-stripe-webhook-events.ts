import { logger } from "../src/config/logger";
/**
 * Remove registros antigos de idempotência de webhooks Stripe (já processados).
 * Agende com cron (ex.: semanal): npm run webhooks:prune-stale
 *
 * Env:
 *   STRIPE_WEBHOOK_RETENTION_DAYS — default 90, mínimo 30
 */
import { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const days = Number.parseInt(
    process.env.STRIPE_WEBHOOK_RETENTION_DAYS || "90",
    10,
  );
  if (Number.isNaN(days) || days < 30) {
    logger.error(
      "STRIPE_WEBHOOK_RETENTION_DAYS must be a number >= 30 (got:",
      process.env.STRIPE_WEBHOOK_RETENTION_DAYS,
      ")",
    );
    process.exit(1);
  }

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const result = await prisma.stripeWebhookEvent.deleteMany({
      where: {
        processedAt: {
          not: null,
          lt: cutoff,
        },
      },
    });

    logger.info(
      `Removed ${result.count} processed stripe_webhook_events older than ${days} days (before ${cutoff.toISOString()})`,
    );
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
      logger.error(
        "Tabela stripe_webhook_events não existe. Rode: npx prisma migrate deploy",
      );
      process.exit(1);
    }
    throw e;
  }
}

main()
  .catch((e) => {
    logger.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
