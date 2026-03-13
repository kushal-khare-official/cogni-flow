import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActivitySummary } from "@/lib/kya/behavioral-monitor";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get("hours") ?? "24", 10);
    const limit = parseInt(searchParams.get("limit") ?? "100", 10);

    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const activities = await prisma.agentActivity.findMany({
      where: { agentId: id, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const summary = await getActivitySummary(id, hours);

    return NextResponse.json({ activities, summary });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get activity", detail: String(error) },
      { status: 500 }
    );
  }
}
