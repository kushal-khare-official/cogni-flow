import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type {
  AcpCheckoutResponse,
  AcpLineItem,
  AcpTotal,
  AcpFulfillmentOption,
  AcpUpdateCheckoutBody,
} from "@/lib/acp/types";

function sessionToAcpResponse(session: {
  id: string;
  status: string;
  currency: string;
  lineItems: string;
  totals: string;
  metadata: string;
}): AcpCheckoutResponse {
  const lineItems = JSON.parse(session.lineItems || "[]") as AcpLineItem[];
  const totals = JSON.parse(session.totals || "[]") as AcpTotal[];
  const meta = JSON.parse(session.metadata || "{}") as { buyer?: unknown; fulfillment_address?: unknown };
  const fulfillmentOptions: AcpFulfillmentOption[] = [
    { type: "digital", id: "digital_default", title: "Digital delivery", subtitle: "Instant", subtotal: 0, tax: 0, total: 0 },
  ];
  return {
    id: session.id,
    status: session.status,
    currency: session.currency,
    line_items: lineItems,
    fulfillment_options: fulfillmentOptions,
    totals,
    messages: [],
    links: [],
    payment_provider: { provider: "stripe", supported_payment_methods: ["card"] },
    buyer: meta.buyer as AcpCheckoutResponse["buyer"],
    fulfillment_address: meta.fulfillment_address as AcpCheckoutResponse["fulfillment_address"],
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await prisma.agenticCheckoutSession.findUnique({
    where: { id },
  });
  if (!session) {
    return NextResponse.json({ error: "Checkout session not found" }, { status: 404 });
  }
  return NextResponse.json(sessionToAcpResponse(session));
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await prisma.agenticCheckoutSession.findUnique({
    where: { id },
  });
  if (!session) {
    return NextResponse.json({ error: "Checkout session not found" }, { status: 404 });
  }
  if (session.status !== "ready_for_payment" && session.status !== "not_ready_for_payment") {
    return NextResponse.json({ error: "Checkout session cannot be updated" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as AcpUpdateCheckoutBody;
  const meta = JSON.parse(session.metadata || "{}") as { buyer?: unknown; fulfillment_address?: unknown };
  if (body.buyer !== undefined) meta.buyer = body.buyer;
  if (body.fulfillment_address !== undefined) meta.fulfillment_address = body.fulfillment_address;

  let lineItems = JSON.parse(session.lineItems || "[]") as AcpLineItem[];
  let totals = JSON.parse(session.totals || "[]") as AcpTotal[];
  let amount = session.amount;

  if (body.items && body.items.length > 0) {
    lineItems = body.items.map((it) => {
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
    amount = lineItems.reduce((sum, li) => sum + li.total, 0);
    totals = [
      { type: "subtotal", display_text: "Subtotal", amount },
      { type: "total", display_text: "Total", amount },
    ];
  }

  const updated = await prisma.agenticCheckoutSession.update({
    where: { id },
    data: {
      lineItems: JSON.stringify(lineItems),
      totals: JSON.stringify(totals),
      amount,
      metadata: JSON.stringify(meta),
    },
  });

  return NextResponse.json(sessionToAcpResponse(updated));
}
