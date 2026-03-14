import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  computeAnomalyScore,
  getAnomalyThreshold,
} from "@/lib/stripe/anomaly-detector";
import { logAuditEntry } from "@/lib/stripe/audit";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id: agentPassportId } = await params;
    const body = (await request.json()) as { action: string; amountCents?: number };
    const action = body.action ?? "";
    const amountCents = body.amountCents ?? 0;

    const passport = await prisma.agentPassport.findUnique({
      where: { id: agentPassportId },
    });
    if (!passport) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const { score, flags } = await computeAnomalyScore(
      agentPassportId,
      action,
      amountCents,
    );
    const threshold = getAnomalyThreshold();
    let autoRevoked = false;

    if (score >= threshold) {
      await prisma.$transaction(async (tx) => {
        await tx.agentPassport.update({
          where: { id: agentPassportId },
          data: {
            status: "revoked",
            revokedReason: `anomaly_auto_revoked: ${flags.join(", ")}`,
            revokedAt: new Date(),
          },
        });
        await tx.agentMandate.updateMany({
          where: { agentPassportId, status: "active" },
          data: { status: "revoked" },
        });
      });
      autoRevoked = true;
      await logAuditEntry({
        agentPassportId,
        action: "anomaly_check",
        amountCents,
        status: "anomaly_flagged",
        anomalyScore: score,
        metadata: { flags, autoRevoked: true },
      });
    }

    return NextResponse.json({
      anomalyScore: score,
      flags,
      autoRevoked,
    });
  } catch (error) {
    console.error("[agents/[id]/anomaly-check]", error);
    return NextResponse.json(
      { error: "Failed to run anomaly check", detail: String(error) },
      { status: 500 },
    );
  }
}
