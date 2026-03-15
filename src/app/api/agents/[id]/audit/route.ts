import { NextRequest, NextResponse } from "next/server";
import { getAuditTrail, logAuditEntry } from "@/lib/agents/audit";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id: agentPassportId } = await params;
    const url = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10) || 50));
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10) || 0);

    const entries = await getAuditTrail(agentPassportId, limit, offset);
    return NextResponse.json(entries);
  } catch (error) {
    console.error("[agents/[id]/audit GET]", error);
    return NextResponse.json(
      { error: "Failed to get audit trail", detail: String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id: agentPassportId } = await params;
    const body = (await request.json()) as {
      action: string;
      amountCents?: number;
      status: string;
      executionRunId?: string;
      nodeId?: string;
      anomalyScore?: number;
      metadata?: Record<string, unknown>;
    };

    if (!body.action || !body.status) {
      return NextResponse.json(
        { error: "Missing required fields: action, status" },
        { status: 400 },
      );
    }

    const id = await logAuditEntry({
      agentPassportId,
      action: body.action,
      amountCents: body.amountCents != null ? Number(body.amountCents) : undefined,
      status: body.status,
      executionRunId: body.executionRunId,
      nodeId: body.nodeId,
      anomalyScore: body.anomalyScore != null ? Number(body.anomalyScore) : undefined,
      metadata: body.metadata,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error("[agents/[id]/audit POST]", error);
    return NextResponse.json(
      { error: "Failed to log audit entry", detail: String(error) },
      { status: 500 },
    );
  }
}
