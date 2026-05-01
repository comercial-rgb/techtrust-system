/**
 * One-off / idempotent: legacy rows where Notification.data was stored as a JSON string
 * get parsed and written back as a proper JSON object for Prisma Json.
 *
 * Run from repo: cd techtrust-backend && npx ts-node scripts/normalize-notification-json-data.ts
 */

import { PrismaClient } from "@prisma/client";
import { logger } from "../src/config/logger";

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.notification.findMany({
    select: { id: true, data: true },
  });

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const d = row.data as unknown;
    if (typeof d !== "string") {
      skipped++;
      continue;
    }
    try {
      const parsed = JSON.parse(d) as object;
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        skipped++;
        continue;
      }
      await prisma.notification.update({
        where: { id: row.id },
        data: { data: parsed },
      });
      updated++;
    } catch {
      skipped++;
    }
  }

  logger.info(
    `[normalize-notification-json-data] updated=${updated} skippedOrAlreadyObject=${skipped} total=${rows.length}`,
  );
}

main()
  .catch((e) => {
    logger.error(
      `[normalize-notification-json-data] ${e instanceof Error ? e.message : e}`,
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
