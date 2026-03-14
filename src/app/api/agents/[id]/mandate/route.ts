import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signMandate } from "@/lib/stripe/agent-passport";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id: agentPassportId } = await params;
    const body = (await request.json()) as {
      description: string;
      maxAmountCents?: number;
      maxTotalSpendCents?: number;
      allowedActions?: string[];
      allowedMCCs?: string[];
      ttlSeconds?: number;
      workflowId?: string;
    };

    const passport = await prisma.agentPassport.findUnique({
      where: { id: agentPassportId },
    });
    if (!passport) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    if (passport.status !== "active") {
      return NextResponse.json(
        { error: "Cannot create mandate for inactive or revoked agent" },
        { status: 403 },
      );
    }

    const maxAmountCents = body.maxAmountCents ?? 5000;
    const maxTotalSpendCents = body.maxTotalSpendCents ?? 50000;
    const allowedActions = JSON.stringify(body.allowedActions ?? []);
    const allowedMCCs = JSON.stringify(body.allowedMCCs ?? []);
    const ttlSeconds = body.ttlSeconds ?? null;
    const workflowId = body.workflowId ?? null;

    const signatureHash = signMandate({
      description: body.description ?? "",
      maxAmountCents,
      maxTotalSpendCents,
      allowedActions,
      allowedMCCs,
      ttlSeconds,
      agentPassportId,
      workflowId,
    });

    const expiresAt =
      ttlSeconds != null
        ? new Date(Date.now() + ttlSeconds * 1000)
        : null;

    const mandate = await prisma.agentMandate.create({
      data: {
        agentPassportId,
        workflowId,
        description: body.description ?? "",
        maxAmountCents,
        maxTotalSpendCents,
        allowedActions,
        allowedMCCs,
        ttlSeconds,
        signatureHash,
        expiresAt,
      },
    });

    return NextResponse.json(mandate, { status: 201 });
  } catch (error) {
    console.error("[agents/[id]/mandate]", error);
    return NextResponse.json(
      { error: "Failed to create mandate", detail: String(error) },
      { status: 500 },
    );
  }
}
