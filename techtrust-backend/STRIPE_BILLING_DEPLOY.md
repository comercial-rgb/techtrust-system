# Stripe Billing Deploy

This backend is wired to Stripe for:

- paid plans: Starter, Pro, Enterprise
- yearly plan prices
- extra vehicle add-ons for Free, Starter, and Pro
- request renewal fees
- service holds/captures
- service supplements
- cancellation fees
- Stripe Connect transfers/application fees

## 1. Create or recover Stripe Price IDs

Run this with the live Stripe secret key:

```bash
cd techtrust-backend
STRIPE_SECRET_KEY=sk_live_xxx \
STRIPE_WEBHOOK_URL=https://techtrust-api.onrender.com/api/v1/webhooks/stripe \
npm run stripe:setup-billing
```

The script is idempotent. It uses Stripe `lookup_key`s, so running it again reuses existing active prices.

Copy the printed variables into the production backend environment:

```env
STRIPE_PRICE_STARTER=price_xxx
STRIPE_PRICE_PRO=price_xxx
STRIPE_PRICE_ENTERPRISE=price_xxx
STRIPE_PRICE_STARTER_YEARLY=price_xxx
STRIPE_PRICE_PRO_YEARLY=price_xxx
STRIPE_PRICE_ENTERPRISE_YEARLY=price_xxx
STRIPE_PRICE_VEHICLE_ADDON_FREE=price_xxx
STRIPE_PRICE_VEHICLE_ADDON_STARTER=price_xxx
STRIPE_PRICE_VEHICLE_ADDON_PRO=price_xxx
```

Enterprise extra vehicles are custom pricing and are not self-serve unless you create and configure a paid Enterprise add-on price intentionally.

## 2. Required production env vars

```env
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_WEBHOOK_URL=https://techtrust-api.onrender.com/api/v1/webhooks/stripe
```

Also set all `STRIPE_PRICE_*` values printed by `stripe:setup-billing`.

## 3. Required webhook events

The Stripe webhook endpoint must point to:

```text
https://techtrust-api.onrender.com/api/v1/webhooks/stripe
```

Enable these events:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.payment_succeeded
invoice.payment_failed
payment_intent.amount_capturable_updated
payment_intent.succeeded
payment_intent.canceled
payment_intent.payment_failed
account.updated
transfer.created
charge.refunded
charge.dispute.created
```

## 4. Validate production config

After setting env vars in production, run:

```bash
cd techtrust-backend
npm run stripe:verify-billing
```

With a local shell:

```bash
STRIPE_SECRET_KEY=sk_live_xxx \
STRIPE_PUBLISHABLE_KEY=pk_live_xxx \
STRIPE_WEBHOOK_SECRET=whsec_xxx \
STRIPE_WEBHOOK_URL=https://techtrust-api.onrender.com/api/v1/webhooks/stripe \
STRIPE_PRICE_STARTER=price_xxx \
STRIPE_PRICE_PRO=price_xxx \
STRIPE_PRICE_ENTERPRISE=price_xxx \
STRIPE_PRICE_STARTER_YEARLY=price_xxx \
STRIPE_PRICE_PRO_YEARLY=price_xxx \
STRIPE_PRICE_ENTERPRISE_YEARLY=price_xxx \
STRIPE_PRICE_VEHICLE_ADDON_FREE=price_xxx \
STRIPE_PRICE_VEHICLE_ADDON_STARTER=price_xxx \
STRIPE_PRICE_VEHICLE_ADDON_PRO=price_xxx \
npm run stripe:verify-billing
```

The command fails if any required price is missing, inactive, wrong amount, wrong interval, or if the webhook URL is missing required events.
