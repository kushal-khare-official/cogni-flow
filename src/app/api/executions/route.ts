import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workflowId = searchParams.get("workflowId");
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100);
  const offset = Number(searchParams.get("offset") ?? 0);

  const where = workflowId ? { workflowId } : {};
  const [runs, total] = await Promise.all([
    prisma.executionRun.findMany({ where, orderBy: { startedAt: "desc" }, take: limit, skip: offset }),
    prisma.executionRun.count({ where }),
  ]);

  return NextResponse.json({ runs, total, limit, offset });
}
