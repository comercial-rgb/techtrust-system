import path from "path";

import dotenv from "dotenv";

import { logger } from "../src/config/logger";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

export function getRequiredDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    logger.error(
      "DATABASE_URL is required (e.g. in .env). Operational scripts do not embed connection strings.",
    );
    process.exit(1);
  }
  return url;
}
