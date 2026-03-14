import { NextRequest, NextResponse } from "next/server";
import { getAuditTrail } from "@/lib/stripe/audit";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id: agentPassportId } = await params;
    const url = new URL(request.url);
    const hours = parseInt(url.searchParams.get("hours") ?? "24", 10);
    const limit = parseInt(url.searchParams.get("limit") ?? "100", 10);

    const entries = await getAuditTrail(agentPassportId, limit, 0);
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const activities = entries.filter((e) => new Date(e.createdAt) >= since);

    const summary = {
      total: activities.length,
      byStatus: activities.reduce(
        (acc, a) => {
          acc[a.status] = (acc[a.status] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };

    return NextResponse.json({ activities, summary });
  } catch (error) {
    console.error("[agents/[id]/activity]", error);
    return NextResponse.json(
      { error: "Failed to get activity", detail: String(error) },
      { status: 500 },
    );
  }
}
