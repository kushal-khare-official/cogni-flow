import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id: mandateId } = await params;
    const body = (await request.json()) as {
      amountCents: number;
      action: string;
      stripeObjectId?: string;
    };

    if (body.amountCents == null || body.amountCents < 0) {
      return NextResponse.json(
        { error: "amountCents is required and must be >= 0" },
        { status: 400 },
      );
    }

    const mandate = await prisma.agentMandate.findUnique({
      where: { id: mandateId },
    });

    if (!mandate) {
      return NextResponse.json({ error: "Mandate not found" }, { status: 404 });
    }

    if (mandate.status !== "active") {
      return NextResponse.json(
        { error: `Mandate is ${mandate.status}` },
        { status: 403 },
      );
    }

    const newSpent = mandate.spentCents + body.amountCents;
    const exhausted = newSpent >= mandate.maxTotalSpendCents;

    const updated = await prisma.agentMandate.update({
      where: { id: mandateId },
      data: {
        spentCents: newSpent,
        status: exhausted ? "exhausted" : undefined,
      },
    });

    return NextResponse.json({
      spentCents: updated.spentCents,
      remaining: mandate.maxTotalSpendCents - updated.spentCents,
      status: updated.status,
    });
  } catch (error) {
    console.error("[agents/mandates/[id]/spend]", error);
    return NextResponse.json(
      { error: "Failed to record spend", detail: String(error) },
      { status: 500 },
    );
  }
}
