/**
 * Load before any other application modules so Sentry can instrument dependencies.
 * See: https://docs.sentry.io/platforms/javascript/guides/express/
 */
import path from "path";

import * as Sentry from "@sentry/node";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const dsn = process.env.SENTRY_DSN?.trim();

if (dsn) {
  const tracesSampleRate = Math.min(
    1,
    Math.max(0, Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1")),
  );

  Sentry.init({
    dsn,
    environment:
      process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
    tracesSampleRate,
  });
}

export function isSentryEnabled(): boolean {
  return Boolean(dsn);
}
