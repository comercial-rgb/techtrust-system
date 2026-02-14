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

import { execSync } from 'child_process';

const PRODUCTION_DB_PATTERNS = [
  'supabase.com',
  'pooler.supabase.com',
  'render.com',
  'amazonaws.com',
  'azure.com',
  'neon.tech',
  'railway.app',
];

function isProductionDatabase(): boolean {
  const dbUrl = process.env.DATABASE_URL || '';
  return PRODUCTION_DB_PATTERNS.some(pattern => dbUrl.includes(pattern));
}

function getDatabaseHost(): string {
  const dbUrl = process.env.DATABASE_URL || '';
  try {
    const match = dbUrl.match(/@([^:\/]+)/);
    return match ? match[1] : 'unknown';
  } catch {
    return 'unknown';
  }
}

const command = process.argv[2];

if (!command) {
  console.log(`
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

console.log(`\n🔍 Database: ${dbHost}`);
console.log(`🔍 Environment: ${isProd ? '🔴 PRODUCTION' : '🟢 LOCAL/DEV'}\n`);

switch (command) {
  case 'migrate': {
    if (isProd) {
      console.log('⚠️  WARNING: Running migration on PRODUCTION database!');
      console.log('   This will create a migration and apply it.');
      console.log('   Data will NOT be lost, but schema will change.\n');
      console.log('   Use "prisma migrate deploy" for production deployments.\n');
      
      try {
        execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      } catch (error) {
        console.error('❌ Migration deploy failed');
        process.exit(1);
      }
    } else {
      console.log('✅ Running prisma migrate dev (safe for development)...\n');
      try {
        execSync('npx prisma migrate dev', { stdio: 'inherit' });
      } catch (error) {
        console.error('❌ Migration failed');
        process.exit(1);
      }
    }
    break;
  }

  case 'push': {
    if (isProd) {
      console.log('⚠️  Running prisma db push on PRODUCTION (no --force-reset)...');
      console.log('   This will update the schema without data loss.\n');
    } else {
      console.log('✅ Running prisma db push (safe)...\n');
    }
    
    try {
      // NEVER add --force-reset here
      execSync('npx prisma db push', { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ Push failed. If there are breaking changes, create a migration instead.');
      console.error('   Run: npm run prisma:safe-migrate');
      process.exit(1);
    }
    break;
  }

  case 'generate': {
    console.log('✅ Running prisma generate...\n');
    try {
      execSync('npx prisma generate', { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ Generate failed');
      process.exit(1);
    }
    break;
  }

  case 'status': {
    console.log('📋 Checking migration status...\n');
    try {
      execSync('npx prisma migrate status', { stdio: 'inherit' });
    } catch (error) {
      // Status command may fail if no migrations exist yet
      console.log('ℹ️  No migrations found or could not check status.');
    }
    break;
  }

  default: {
    console.error(`❌ Unknown command: ${command}`);
    console.error('   Available: migrate, push, generate, status');
    process.exit(1);
  }
}

console.log('\n✅ Done!\n');
