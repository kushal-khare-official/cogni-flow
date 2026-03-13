import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import cronParser from "cron-parser";

export async function GET(request: NextRequest) {
  const workflowId = new URL(request.url).searchParams.get("workflowId") ?? undefined;
  const where = workflowId ? { workflowId } : {};
  const schedules = await prisma.schedule.findMany({ where, orderBy: { nextRunAt: "asc" } });
  return NextResponse.json({ schedules });
}

export async function POST(request: NextRequest) {
  const { workflowId, cronExpression, timezone } = await request.json();
  const tz = timezone ?? "UTC";

  let nextRunAt: Date | null = null;
  try {
    const interval = cronParser.parse(cronExpression, { tz });
    const next = interval.next();
    nextRunAt = next.toDate();
  } catch {
    return NextResponse.json({ error: "Invalid cron expression" }, { status: 400 });
  }

  const schedule = await prisma.schedule.create({
    data: { workflowId, cronExpression, timezone: tz, nextRunAt }
  });
  return NextResponse.json(schedule, { status: 201 });
}
