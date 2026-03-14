import Stripe from "stripe";

/**
 * Create a Stripe client for server-side use.
 * Use a Restricted API Key (rk_*) in production for agent-scoped access.
 */
export function createStripeClient(apiKey: string): Stripe {
  return new Stripe(apiKey);
}

/**
 * Allowed actions for the stripe_agent executor.
 * Maps operationId from integration template to Stripe API calls.
 */
export const STRIPE_AGENT_OPERATIONS = [
  "createPaymentIntent",
  "confirmPaymentIntent",
  "retrievePaymentIntent",
  "createSharedPaymentToken",
  "listCustomers",
  "createRefund",
  "createPaymentLink",
  "createProduct",
  "createPrice",
  "listPrices",
] as const;

export type StripeAgentOperationId = (typeof STRIPE_AGENT_OPERATIONS)[number];
