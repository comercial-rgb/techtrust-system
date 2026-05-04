/**
 * Minimal typings for Stripe.js loaded from https://js.stripe.com/v3/
 * (avoids @ts-ignore on window.Stripe in checkout flows).
 */

export type StripeCardElement = {
  mount: (target: string | HTMLElement) => void;
  destroy: () => void;
};

export type StripeElements = {
  create: (type: string, options?: Record<string, unknown>) => StripeCardElement;
};

export type StripeClient = {
  elements: (options?: { clientSecret?: string }) => StripeElements;
  confirmCardSetup: (
    clientSecret: string,
    data?: Record<string, unknown>,
  ) => Promise<{
    setupIntent?: { payment_method?: string | { id?: string } };
    error?: { message?: string };
  }>;
  confirmSetup: (args: {
    elements: StripeElements;
    confirmParams: { return_url: string };
  }) => Promise<{ error?: { message?: string } }>;
  confirmPayment: (args: {
    elements: StripeElements;
    confirmParams: { return_url: string };
  }) => Promise<{ error?: { message?: string } }>;
};

declare global {
  interface Window {
    Stripe?: (publishableKey: string) => StripeClient;
  }
}

export {};
