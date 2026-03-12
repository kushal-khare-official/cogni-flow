import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const workflows = await prisma.workflow.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(workflows);
  } catch (error) {
    console.error("[workflows/GET]", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      nodes?: unknown[];
      edges?: unknown[];
    };

    const workflow = await prisma.workflow.create({
      data: {
        name: body.name ?? "Untitled Workflow",
        description: body.description ?? "",
        nodes: JSON.stringify(body.nodes ?? []),
        edges: JSON.stringify(body.edges ?? []),
      },
    });

    return NextResponse.json(workflow, { status: 201 });
  } catch (error) {
    console.error("[workflows/POST]", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
