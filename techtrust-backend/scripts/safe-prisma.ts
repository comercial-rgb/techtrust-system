import { logger } from "../src/config/logger";
/**
 * ============================================
 * SAFE PRISMA MIGRATION WRAPPER
 * ============================================
 *
 * This script prevents accidental data loss from dangerous Prisma commands
 * on production databases. It wraps common prisma commands with safety checks.
 *
 * Usage:
 *   npx ts-node scripts/safe-prisma.ts migrate      → runs prisma migrate dev (safe)
 *   npx ts-node scripts/safe-prisma.ts push          → runs prisma db push (safe, NO --force-reset)
 *   npx ts-node scripts/safe-prisma.ts generate      → runs prisma generate
 *
 * NEVER use these commands directly on production:
 *   ❌ prisma db push --force-reset
 *   ❌ prisma migrate reset
 *   ❌ prisma db execute with DROP statements
 */

import { execSync } from "child_process";

const PRODUCTION_DB_PATTERNS = [
  "supabase.com",
  "pooler.supabase.com",
  "render.com",
  "amazonaws.com",
  "azure.com",
  "neon.tech",
  "railway.app",
];

function isProductionDatabase(): boolean {
  const dbUrl = process.env.DATABASE_URL || "";
  return PRODUCTION_DB_PATTERNS.some((pattern) => dbUrl.includes(pattern));
}

function getDatabaseHost(): string {
  const dbUrl = process.env.DATABASE_URL || "";
  try {
    const match = dbUrl.match(/@([^:\/]+)/);
    return match ? match[1] : "unknown";
  } catch {
    return "unknown";
  }
}

const command = process.argv[2];

if (!command) {
  logger.info(`
╔══════════════════════════════════════════════════════╗
║           🔒 SAFE PRISMA MIGRATION TOOL             ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  Available commands:                                 ║
║    migrate   → prisma migrate dev (safe)             ║
║    push      → prisma db push (NO force-reset)       ║
║    generate  → prisma generate                       ║
║    status    → prisma migrate status                 ║
║                                                      ║
║  ⚠️  NEVER use --force-reset on production!          ║
║  ⚠️  NEVER use prisma migrate reset on production!   ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
  `);
  process.exit(0);
}

const isProd = isProductionDatabase();
const dbHost = getDatabaseHost();

logger.info(`\n🔍 Database: ${dbHost}`);
logger.info(`🔍 Environment: ${isProd ? "🔴 PRODUCTION" : "🟢 LOCAL/DEV"}\n`);

switch (command) {
  case "migrate": {
    if (isProd) {
      logger.info("⚠️  WARNING: Running migration on PRODUCTION database!");
      logger.info("   This will create a migration and apply it.");
      logger.info("   Data will NOT be lost, but schema will change.\n");
      logger.info(
        '   Use "prisma migrate deploy" for production deployments.\n',
      );

      try {
        execSync("npx prisma migrate deploy", { stdio: "inherit" });
      } catch (error) {
        logger.error("❌ Migration deploy failed");
        process.exit(1);
      }
    } else {
      logger.info("✅ Running prisma migrate dev (safe for development)...\n");
      try {
        execSync("npx prisma migrate dev", { stdio: "inherit" });
      } catch (error) {
        logger.error("❌ Migration failed");
        process.exit(1);
      }
    }
    break;
  }

  case "push": {
    if (isProd) {
      logger.info(
        "⚠️  Running prisma db push on PRODUCTION (no --force-reset)...",
      );
      logger.info("   This will update the schema without data loss.\n");
    } else {
      logger.info("✅ Running prisma db push (safe)...\n");
    }

    try {
      // NEVER add --force-reset here
      execSync("npx prisma db push", { stdio: "inherit" });
    } catch (error) {
      logger.error(
        "❌ Push failed. If there are breaking changes, create a migration instead.",
      );
      logger.error("   Run: npm run prisma:safe-migrate");
      process.exit(1);
    }
    break;
  }

  case "generate": {
    logger.info("✅ Running prisma generate...\n");
    try {
      execSync("npx prisma generate", { stdio: "inherit" });
    } catch (error) {
      logger.error("❌ Generate failed");
      process.exit(1);
    }
    break;
  }

  case "status": {
    logger.info("📋 Checking migration status...\n");
    try {
      execSync("npx prisma migrate status", { stdio: "inherit" });
    } catch (error) {
      // Status command may fail if no migrations exist yet
      logger.info("ℹ️  No migrations found or could not check status.");
    }
    break;
  }

  default: {
    logger.error(`❌ Unknown command: ${command}`);
    logger.error("   Available: migrate, push, generate, status");
    process.exit(1);
  }
}

logger.info("\n✅ Done!\n");
