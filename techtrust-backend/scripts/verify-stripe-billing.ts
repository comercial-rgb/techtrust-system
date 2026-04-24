/**
 * Validate that the production Stripe billing environment is complete.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_live_... npm run stripe:verify-billing
 *   STRIPE_WEBHOOK_URL=https://api.example.com/api/v1/webhooks/stripe npm run stripe:verify-billing
 */
import dotenv from "dotenv";
import Stripe from "stripe";

dotenv.config();

const requiredEnv = [
  "STRIPE_SECRET_KEY",
  "STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_STARTER",
  "STRIPE_PRICE_PRO",
  "STRIPE_PRICE_ENTERPRISE",
  "STRIPE_PRICE_STARTER_YEARLY",
  "STRIPE_PRICE_PRO_YEARLY",
  "STRIPE_PRICE_ENTERPRISE_YEARLY",
  "STRIPE_PRICE_VEHICLE_ADDON_FREE",
  "STRIPE_PRICE_VEHICLE_ADDON_STARTER",
  "STRIPE_PRICE_VEHICLE_ADDON_PRO",
] as const;

const expectedPrices: Record<string, { amount: number; interval: "month" | "year" }> = {
  STRIPE_PRICE_STARTER: { amount: 999, interval: "month" },
  STRIPE_PRICE_PRO: { amount: 1999, interval: "month" },
  STRIPE_PRICE_ENTERPRISE: { amount: 4999, interval: "month" },
  STRIPE_PRICE_STARTER_YEARLY: { amount: 9999, interval: "year" },
  STRIPE_PRICE_PRO_YEARLY: { amount: 19999, interval: "year" },
  STRIPE_PRICE_ENTERPRISE_YEARLY: { amount: 49999, interval: "year" },
  STRIPE_PRICE_VEHICLE_ADDON_FREE: { amount: 699, interval: "month" },
  STRIPE_PRICE_VEHICLE_ADDON_STARTER: { amount: 599, interval: "month" },
  STRIPE_PRICE_VEHICLE_ADDON_PRO: { amount: 399, interval: "month" },
};

const requiredWebhookEvents = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
  "payment_intent.amount_capturable_updated",
  "payment_intent.succeeded",
  "payment_intent.canceled",
  "payment_intent.payment_failed",
] as const;

function isPlaceholder(value: string | undefined) {
  return !value ||
    value.includes("sua_chave") ||
    value.includes("_id") ||
    value.includes("...") ||
    value === "changeme";
}

async function main() {
  const missing = requiredEnv.filter((key) => isPlaceholder(process.env[key]));
  if (missing.length) {
    throw new Error(`Missing or placeholder env vars: ${missing.join(", ")}`);
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-12-18.acacia" as any,
    typescript: true,
  });

  for (const [envName, expected] of Object.entries(expectedPrices)) {
    const price = await stripe.prices.retrieve(process.env[envName]!);

    if (!price.active) {
      throw new Error(`${envName} (${price.id}) is inactive`);
    }
    if (price.currency !== "usd") {
      throw new Error(`${envName} (${price.id}) must be usd, got ${price.currency}`);
    }
    if (price.unit_amount !== expected.amount) {
      throw new Error(`${envName} (${price.id}) amount mismatch: expected ${expected.amount}, got ${price.unit_amount}`);
    }
    if (price.recurring?.interval !== expected.interval) {
      throw new Error(`${envName} (${price.id}) interval mismatch: expected ${expected.interval}, got ${price.recurring?.interval}`);
    }

    console.log(`ok ${envName}=${price.id}`);
  }

  const webhookUrl = process.env.STRIPE_WEBHOOK_URL;
  if (webhookUrl) {
    const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
    const endpoint = endpoints.data.find((item) => item.url === webhookUrl && item.status === "enabled");
    if (!endpoint) {
      throw new Error(`No enabled Stripe webhook endpoint found for ${webhookUrl}`);
    }

    const enabledEvents = endpoint.enabled_events;
    for (const event of requiredWebhookEvents) {
      if (!enabledEvents.includes(event) && !enabledEvents.includes("*")) {
        throw new Error(`Webhook ${endpoint.id} is missing event ${event}`);
      }
    }

    console.log(`ok STRIPE_WEBHOOK_URL=${webhookUrl}`);
  } else {
    console.log("skipped webhook URL check; set STRIPE_WEBHOOK_URL to validate endpoint events");
  }

  console.log("Stripe billing environment is ready.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
