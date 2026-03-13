import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        mandates: { where: { active: true }, select: { id: true } },
        activities: { select: { id: true } },
        virtualCards: { where: { status: "active" }, select: { id: true } },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const { mandates, activities, virtualCards, passportData, ...rest } = agent;
    return NextResponse.json({
      ...rest,
      passportData: JSON.parse(passportData || "{}"),
      activeMandates: mandates.length,
      totalActivities: activities.length,
      activeCards: virtualCards.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get agent", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const agent = await prisma.agent.findUnique({ where: { id } });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    if (agent.status === "revoked") {
      return NextResponse.json({ error: "Cannot update a revoked agent" }, { status: 403 });
    }

    const body = await request.json();
    const allowed = ["name", "description", "modelProvider", "modelId", "modelVersion"];
    const data: Record<string, string> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) data[key] = body[key];
    }

    const updated = await prisma.agent.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update agent", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await prisma.agent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete agent", detail: String(error) },
      { status: 500 }
    );
  }
}
