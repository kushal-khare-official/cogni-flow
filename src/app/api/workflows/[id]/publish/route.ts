import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { mode } = (await request.json()) as { mode: "shadow" | "live" };

    if (mode !== "shadow" && mode !== "live") {
      return NextResponse.json(
        { error: 'Invalid mode. Must be "shadow" or "live".' },
        { status: 400 },
      );
    }

    const existing = await prisma.workflow.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 },
      );
    }

    if (mode === "live") {
      await prisma.workflow.updateMany({
        where: { status: "live", id: { not: id } },
        data: { status: "shadow" },
      });
    }

    const workflow = await prisma.workflow.update({
      where: { id },
      data: { status: mode },
    });

    return NextResponse.json({
      ...workflow,
      nodes: JSON.parse(workflow.nodes),
      edges: JSON.parse(workflow.edges),
    });
  } catch (error) {
    console.error("[workflows/[id]/publish]", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
