/**
 * Create or retrieve the Stripe Products/Prices required by TechTrust billing.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_live_... npm run stripe:setup-billing
 *   STRIPE_SECRET_KEY=sk_live_... STRIPE_WEBHOOK_URL=https://api.example.com/api/v1/webhooks/stripe npm run stripe:setup-billing
 *
 * The script is idempotent through Stripe lookup_keys and prints the env vars
 * that must be copied into the production backend environment.
 */
import dotenv from "dotenv";
import Stripe from "stripe";

dotenv.config();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookUrl = process.env.STRIPE_WEBHOOK_URL;

if (!stripeSecretKey) {
  console.error("Missing STRIPE_SECRET_KEY. Export it before running this script.");
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2024-12-18.acacia" as any,
  typescript: true,
});

type RecurringInterval = "month" | "year";

const priceCatalog = [
  {
    env: "STRIPE_PRICE_STARTER",
    lookupKey: "techtrust_plan_starter_monthly",
    productName: "TechTrust Starter",
    amount: 999,
    interval: "month" as RecurringInterval,
  },
  {
    env: "STRIPE_PRICE_PRO",
    lookupKey: "techtrust_plan_pro_monthly",
    productName: "TechTrust Pro",
    amount: 1999,
    interval: "month" as RecurringInterval,
  },
  {
    env: "STRIPE_PRICE_ENTERPRISE",
    lookupKey: "techtrust_plan_enterprise_monthly",
    productName: "TechTrust Enterprise",
    amount: 4999,
    interval: "month" as RecurringInterval,
  },
  {
    env: "STRIPE_PRICE_STARTER_YEARLY",
    lookupKey: "techtrust_plan_starter_yearly",
    productName: "TechTrust Starter",
    amount: 9999,
    interval: "year" as RecurringInterval,
  },
  {
    env: "STRIPE_PRICE_PRO_YEARLY",
    lookupKey: "techtrust_plan_pro_yearly",
    productName: "TechTrust Pro",
    amount: 19999,
    interval: "year" as RecurringInterval,
  },
  {
    env: "STRIPE_PRICE_ENTERPRISE_YEARLY",
    lookupKey: "techtrust_plan_enterprise_yearly",
    productName: "TechTrust Enterprise",
    amount: 49999,
    interval: "year" as RecurringInterval,
  },
  {
    env: "STRIPE_PRICE_VEHICLE_ADDON_FREE",
    lookupKey: "techtrust_vehicle_addon_free_monthly",
    productName: "TechTrust Extra Vehicle - Free Plan",
    amount: 699,
    interval: "month" as RecurringInterval,
  },
  {
    env: "STRIPE_PRICE_VEHICLE_ADDON_STARTER",
    lookupKey: "techtrust_vehicle_addon_starter_monthly",
    productName: "TechTrust Extra Vehicle - Starter Plan",
    amount: 599,
    interval: "month" as RecurringInterval,
  },
  {
    env: "STRIPE_PRICE_VEHICLE_ADDON_PRO",
    lookupKey: "techtrust_vehicle_addon_pro_monthly",
    productName: "TechTrust Extra Vehicle - Pro Plan",
    amount: 399,
    interval: "month" as RecurringInterval,
  },
];

const webhookEvents = [
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
  "account.updated",
  "transfer.created",
  "charge.refunded",
  "charge.dispute.created",
];

async function getOrCreateProduct(name: string): Promise<string> {
  const existing = await stripe.products.search({
    query: `name:'${name.replace(/'/g, "\\'")}' AND active:'true'`,
    limit: 1,
  });

  if (existing.data[0]) return existing.data[0].id;

  const product = await stripe.products.create({ name });
  return product.id;
}

async function getOrCreatePrice(item: typeof priceCatalog[number]): Promise<string> {
  const existing = await stripe.prices.list({
    lookup_keys: [item.lookupKey],
    active: true,
    limit: 1,
  });

  if (existing.data[0]) return existing.data[0].id;

  const productId = await getOrCreateProduct(item.productName);
  const price = await stripe.prices.create({
    product: productId,
    currency: "usd",
    unit_amount: item.amount,
    recurring: { interval: item.interval },
    lookup_key: item.lookupKey,
  });

  return price.id;
}

async function setupWebhook(): Promise<string | null> {
  if (!webhookUrl) return null;

  const existing = await stripe.webhookEndpoints.list({ limit: 100 });
  const match = existing.data.find((endpoint) => endpoint.url === webhookUrl);

  if (match) {
    console.log(`# Existing webhook endpoint found: ${match.id}`);
    console.log("# Stripe only reveals STRIPE_WEBHOOK_SECRET when the endpoint is first created.");
    return null;
  }

  const endpoint = await stripe.webhookEndpoints.create({
    url: webhookUrl,
    enabled_events: webhookEvents as Stripe.WebhookEndpointCreateParams.EnabledEvent[],
  });

  return endpoint.secret || null;
}

async function main() {
  const envLines: string[] = [];

  for (const item of priceCatalog) {
    const priceId = await getOrCreatePrice(item);
    envLines.push(`${item.env}=${priceId}`);
  }

  const webhookSecret = await setupWebhook();
  if (webhookSecret) {
    envLines.push(`STRIPE_WEBHOOK_SECRET=${webhookSecret}`);
  }

  console.log("\n# Copy these into the production backend environment:\n");
  for (const line of envLines) console.log(line);

  console.log("\n# Notes:");
  console.log("# STRIPE_PRICE_VEHICLE_ADDON_ENTERPRISE is intentionally not created.");
  console.log("# Enterprise extra vehicles are custom pricing and should not self-activate without a paid Stripe price.");
  console.log("# Also set STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY from the Stripe dashboard.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
