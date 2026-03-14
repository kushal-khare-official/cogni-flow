import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { executeWorkflow } from "@/lib/execution/runtime";
import { confirmPaymentIntentWithSPT } from "@/lib/acp/stripe";
import type { AcpCompleteCheckoutBody, AcpCheckoutResponse } from "@/lib/acp/types";
import type { BpmnNode, BpmnEdge } from "@/lib/workflow/types";

export async function POST(
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
  if (session.status === "completed") {
    return NextResponse.json({ error: "Checkout already completed" }, { status: 400 });
  }
  if (session.status === "canceled") {
    return NextResponse.json({ error: "Checkout was canceled" }, { status: 400 });
  }
  if (!session.paymentIntentId) {
    return NextResponse.json({ error: "Checkout has no payment intent" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as AcpCompleteCheckoutBody;
  const token = body.payment_data?.token;
  if (!token || typeof token !== "string") {
    return NextResponse.json(
      { error: "payment_data.token (SPT) is required" },
      { status: 400 },
    );
  }

  try {
    await confirmPaymentIntentWithSPT(session.paymentIntentId, token);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Payment confirmation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  await prisma.agenticCheckoutSession.update({
    where: { id },
    data: { status: "completed" },
  });

  const workflowId = session.workflowId ?? process.env.ACP_COMPLETE_WORKFLOW_ID ?? null;
  const meta = JSON.parse(session.metadata || "{}") as { passportId?: string; mandateId?: string };
  const workflowInput: Record<string, unknown> = {
    sharedPaymentGrantedToken: token,
    ...(meta.passportId && { passportId: meta.passportId }),
    ...(meta.mandateId && { mandateId: meta.mandateId }),
  };

  if (workflowId) {
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });
    if (workflow && (workflow.status === "live" || workflow.status === "shadow")) {
      const nodes = JSON.parse(workflow.nodes) as BpmnNode[];
      const edges = JSON.parse(workflow.edges) as BpmnEdge[];
      executeWorkflow(workflowId, nodes, edges, workflowInput, "live").catch((err) => {
        console.error("[acp/complete] workflow run failed:", err);
      });
    }
  }

  const lineItems = JSON.parse(session.lineItems || "[]");
  const totals = JSON.parse(session.totals || "[]");
  const response: AcpCheckoutResponse = {
    id: session.id,
    status: "completed",
    currency: session.currency,
    line_items: lineItems,
    fulfillment_options: [
      { type: "digital", id: "digital_default", title: "Digital delivery", subtitle: "Instant", subtotal: 0, tax: 0, total: 0 },
    ],
    totals,
    messages: [],
    links: [],
    payment_provider: { provider: "stripe", supported_payment_methods: ["card"] },
    order: {
      order_id: session.id,
      order_number: session.id,
      status: "confirmed",
    },
  };
  return NextResponse.json(response);
}
