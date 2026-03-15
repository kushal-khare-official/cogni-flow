import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id: agentId } = await params;
    const body = (await request.json()) as {
      amountCents: number;
      bookingReference?: string;
    };

    if (body.amountCents == null || body.amountCents <= 0) {
      return NextResponse.json(
        { error: "amountCents is required and must be > 0" },
        { status: 400 },
      );
    }

    const agent = await prisma.agentPassport.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (agent.status !== "active") {
      return NextResponse.json(
        { error: `Agent is ${agent.status}` },
        { status: 403 },
      );
    }

    if (agent.balanceCents < body.amountCents) {
      return NextResponse.json(
        {
          error: "Insufficient balance",
          balanceCents: agent.balanceCents,
          requested: body.amountCents,
        },
        { status: 400 },
      );
    }

    const updated = await prisma.agentPassport.update({
      where: { id: agentId },
      data: {
        balanceCents: { decrement: body.amountCents },
      },
    });

    return NextResponse.json({
      balanceCents: updated.balanceCents,
      deducted: body.amountCents,
      bookingReference: body.bookingReference ?? null,
    });
  } catch (error) {
    console.error("[agents/[id]/deduct-balance]", error);
    return NextResponse.json(
      { error: "Failed to deduct balance", detail: String(error) },
      { status: 500 },
    );
  }
}
