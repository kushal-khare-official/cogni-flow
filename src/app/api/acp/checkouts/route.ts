import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/acp/stripe";
import type {
  AcpCreateCheckoutBody,
  AcpCheckoutResponse,
  AcpLineItem,
  AcpTotal,
  AcpFulfillmentOption,
} from "@/lib/acp/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as AcpCreateCheckoutBody;
    const items = body.items ?? [];
    if (items.length === 0) {
      return NextResponse.json(
        { error: "items array is required and must not be empty" },
        { status: 400 },
      );
    }

    const currency = "usd";
    const lineItems: AcpLineItem[] = items.map((it) => {
      const unitAmount = it.unit_amount ?? 1000;
      const total = unitAmount * (it.quantity ?? 1);
      return {
        id: it.id,
        item: { id: it.id, quantity: it.quantity ?? 1 },
        base_amount: total,
        discount: 0,
        total,
        subtotal: total,
        tax: 0,
      };
    });
    const totalAmount = lineItems.reduce((sum, li) => sum + li.total, 0);
    const totals: AcpTotal[] = [
      { type: "subtotal", display_text: "Subtotal", amount: totalAmount },
      { type: "total", display_text: "Total", amount: totalAmount },
    ];
    const fulfillmentOptions: AcpFulfillmentOption[] = [
      {
        type: "digital",
        id: "digital_default",
        title: "Digital delivery",
        subtitle: "Instant",
        subtotal: 0,
        tax: 0,
        total: 0,
      },
    ];

    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency,
      automatic_payment_methods: { enabled: true },
    });

    const meta = (body as { metadata?: { workflowId?: string; passportId?: string; mandateId?: string } }).metadata;
    const workflowId = meta?.workflowId ?? process.env.ACP_COMPLETE_WORKFLOW_ID ?? null;
    const session = await prisma.agenticCheckoutSession.create({
      data: {
        status: "ready_for_payment",
        paymentIntentId: paymentIntent.id,
        amount: totalAmount,
        currency,
        lineItems: JSON.stringify(lineItems),
        totals: JSON.stringify(totals),
        workflowId,
        metadata: JSON.stringify({
          buyer: body.buyer,
          fulfillment_address: body.fulfillment_address,
          passportId: meta?.passportId,
          mandateId: meta?.mandateId,
        }),
      },
    });

    const response: AcpCheckoutResponse = {
      id: session.id,
      status: session.status,
      currency: session.currency,
      line_items: lineItems,
      fulfillment_options: fulfillmentOptions,
      totals,
      messages: [],
      links: [],
      payment_provider: { provider: "stripe", supported_payment_methods: ["card"] },
      buyer: body.buyer,
      fulfillment_address: body.fulfillment_address,
    };
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create checkout failed";
    if (message.includes("STRIPE_SECRET_KEY")) {
      return NextResponse.json({ error: message }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
