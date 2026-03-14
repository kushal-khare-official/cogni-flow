import Stripe from "stripe";

const API_VERSION = "2026-02-25.clover";

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(key, { apiVersion: API_VERSION });
}

export async function confirmPaymentIntentWithSPT(
  paymentIntentId: string,
  sharedPaymentGrantedToken: string,
): Promise<{ id: string; status: string; amount: number | null }> {
  const stripe = getStripe();
  const intent = await stripe.paymentIntents.confirm(paymentIntentId, {
    payment_method_options: {
      card: {
        shared_payment_granted_token: sharedPaymentGrantedToken,
      } as Record<string, unknown>,
    },
  });
  return {
    id: intent.id,
    status: intent.status,
    amount: intent.amount,
  };
}
