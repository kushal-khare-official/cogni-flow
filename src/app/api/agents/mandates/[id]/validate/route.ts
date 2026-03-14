import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id: mandateId } = await params;
    const body = (await request.json()) as { action: string; amountCents?: number };
    const action = body.action ?? "";
    const amountCents = body.amountCents ?? 0;

    const mandate = await prisma.agentMandate.findUnique({
      where: { id: mandateId },
      include: {
        agentPassport: { select: { status: true } },
      },
    });

    if (!mandate) {
      return NextResponse.json(
        { allowed: false, reason: "Mandate not found" },
      );
    }

    if (mandate.agentPassport.status !== "active") {
      return NextResponse.json({
        allowed: false,
        reason: "Agent passport is not active",
        remaining: mandate.maxTotalSpendCents - mandate.spentCents,
      });
    }

    if (mandate.status !== "active") {
      return NextResponse.json({
        allowed: false,
        reason: `Mandate is ${mandate.status}`,
        remaining: 0,
      });
    }

    if (mandate.expiresAt && new Date() > mandate.expiresAt) {
      return NextResponse.json({
        allowed: false,
        reason: "Mandate has expired",
        remaining: 0,
      });
    }

    const allowedActions = JSON.parse(mandate.allowedActions) as string[];
    if (allowedActions.length > 0 && !allowedActions.includes(action)) {
      return NextResponse.json({
        allowed: false,
        reason: `Action "${action}" not in allowedActions`,
        remaining: mandate.maxTotalSpendCents - mandate.spentCents,
      });
    }

    if (amountCents > mandate.maxAmountCents) {
      return NextResponse.json({
        allowed: false,
        reason: `Amount ${amountCents} exceeds per-transaction limit ${mandate.maxAmountCents}`,
        remaining: mandate.maxTotalSpendCents - mandate.spentCents,
      });
    }

    const remaining = mandate.maxTotalSpendCents - mandate.spentCents;
    if (amountCents > remaining) {
      return NextResponse.json({
        allowed: false,
        reason: "Insufficient mandate budget",
        remaining,
      });
    }

    return NextResponse.json({
      allowed: true,
      remaining: remaining - amountCents,
    });
  } catch (error) {
    console.error("[agents/mandates/[id]/validate]", error);
    return NextResponse.json(
      { error: "Failed to validate action", detail: String(error) },
      { status: 500 },
    );
  }
}
