/**
 * Stripe marketplace / Agentic Commerce registration helpers.
 * Uses the Stripe SDK to complete programmatic setup (webhook registration).
 * Dashboard steps (profile, support/legal links) remain manual per Stripe docs.
 */
import { getStripe } from "@/lib/acp/stripe";

/**
 * Webhook events for payment and ACP. Start with PaymentIntent only so registration
 * works on all Stripe accounts. shared_payment.* / data_management.* may require
 * Agentic Commerce or catalog to be enabled; add them in Dashboard if needed.
 */
export const ACP_WEBHOOK_EVENTS = [
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
] as const;

/** Optional: SPT lifecycle (add in Dashboard if your account supports shared_payment.*) */
export const ACP_SPT_EVENTS = [
  "shared_payment.granted_token.used",
  "shared_payment.granted_token.deactivated",
] as const;

/** Optional: catalog import status (add in Dashboard if using product catalog upload) */
export const CATALOG_WEBHOOK_EVENTS = [
  "data_management.import_set.succeeded",
  "data_management.import_set.failed",
] as const;

export interface EnsureWebhookResult {
  id: string;
  secret: string;
  url: string;
  created: boolean;
}

/**
 * Ensure a webhook endpoint exists for the given URL with ACP-related events.
 * If an endpoint already exists for this URL, returns it (no duplicate).
 * Otherwise creates one and returns the new endpoint with its signing secret.
 * Caller must set STRIPE_WEBHOOK_SECRET from result.secret.
 */
export async function ensureMarketplaceWebhook(
  webhookUrl: string,
  options?: { includeCatalogEvents?: boolean },
): Promise<EnsureWebhookResult> {
  const stripe = getStripe();
  const events = [
    ...ACP_WEBHOOK_EVENTS,
    ...(options?.includeCatalogEvents ? CATALOG_WEBHOOK_EVENTS : []),
  ];

  const list = await stripe.webhookEndpoints.list({ limit: 100 });
  const existing = list.data.find((ep) => ep.url === webhookUrl);
  if (existing) {
    return {
      id: existing.id,
      secret: (existing as { secret?: string }).secret ?? "",
      url: existing.url,
      created: false,
    };
  }

  const endpoint = await stripe.webhookEndpoints.create({
    url: webhookUrl,
    description: "CogniFlow ACP / marketplace (payment_intent, SPT, optional catalog)",
    // SDK EnabledEvent union may lag behind API; cast for 2026-02-25.clover events
    enabled_events: [...events] as unknown as import("stripe").Stripe.WebhookEndpointCreateParams["enabled_events"],
    api_version: "2026-02-25.clover",
  });

  const secret = (endpoint as { secret?: string }).secret;
  if (!secret) {
    throw new Error(
      "Stripe did not return webhook signing secret. Retrieve it from Dashboard → Developers → Webhooks → " +
        endpoint.id,
    );
  }

  return {
    id: endpoint.id,
    secret,
    url: endpoint.url,
    created: true,
  };
}
