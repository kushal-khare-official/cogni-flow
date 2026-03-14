import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const key = process.env.STRIPE_SECRET_KEY;

  if (!secret || !sig) {
    return NextResponse.json(
      { error: "Missing webhook secret or signature" },
      { status: 400 },
    );
  }

  if (!key) {
    return NextResponse.json(
      { error: "STRIPE_SECRET_KEY not configured" },
      { status: 500 },
    );
  }

  const stripe = new Stripe(key, { apiVersion: "2026-02-25.clover" });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        // Optionally log to AgentAuditLog if we have a mapping from payment_intent to agentPassportId
        break;
      }
      case "charge.refunded": {
        const ch = event.data.object as Stripe.Charge;
        // Optionally update mandate or audit
        break;
      }
      case "issuing_card.updated": {
        const card = event.data.object as Stripe.Issuing.Card;
        if (card.status === "inactive" || card.status === "canceled") {
          // Card was deactivated; could revoke associated mandate or update audit
        }
        break;
      }
      default:
        // SPT events (Stripe API 2026+); type may not be in Stripe.Event yet
        if ((event as { type: string }).type === "shared_payment.granted_token.used") {
          const token = event.data.object as { id?: string };
          if (token?.id) console.info("[stripe/webhook] SPT used:", token.id);
        } else if ((event as { type: string }).type === "shared_payment.granted_token.deactivated") {
          const token = event.data.object as { id?: string; deactivated_reason?: string };
          if (token?.id) console.info("[stripe/webhook] SPT deactivated:", token.id, token.deactivated_reason);
        }
        break;
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[stripe/webhook]", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }
}
