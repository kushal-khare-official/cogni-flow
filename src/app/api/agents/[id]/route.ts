import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const passport = await prisma.agentPassport.findUnique({
      where: { id },
      include: {
        mandates: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            description: true,
            maxAmountCents: true,
            maxTotalSpendCents: true,
            spentCents: true,
            status: true,
            allowedActions: true,
            createdAt: true,
          },
        },
        auditLogs: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            action: true,
            amountCents: true,
            status: true,
            anomalyScore: true,
            createdAt: true,
          },
        },
      },
    });

    if (!passport) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json(passport);
  } catch (error) {
    console.error("[agents/[id]/GET]", error);
    return NextResponse.json(
      { error: "Failed to get agent", detail: String(error) },
      { status: 500 },
    );
  }
}
