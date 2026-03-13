import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

interface NodeData {
  bpmnType?: string;
  integrationTemplateId?: string;
  webhookPath?: string;
  label?: string;
}
interface WorkflowNode {
  id: string;
  data: NodeData;
}

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

    // Auto-provision webhook endpoints for nodes with webhook-type integrations
    const nodes = JSON.parse(existing.nodes) as WorkflowNode[];
    const webhookTemplateIds = new Set<string>();
    const webhookNodes: WorkflowNode[] = [];

    for (const node of nodes) {
      if (node.data.integrationTemplateId) {
        webhookTemplateIds.add(node.data.integrationTemplateId);
        webhookNodes.push(node);
      }
    }

    if (webhookTemplateIds.size > 0) {
      const templates = await prisma.integrationTemplate.findMany({
        where: { id: { in: [...webhookTemplateIds] } },
      });
      const webhookTplIds = new Set(
        templates.filter((t) => t.type === "webhook").map((t) => t.id),
      );

      let nodesUpdated = false;
      for (const node of webhookNodes) {
        if (!webhookTplIds.has(node.data.integrationTemplateId!)) continue;
        if (node.data.webhookPath) continue;

        const path = `wh-${crypto.randomBytes(8).toString("hex")}`;
        await prisma.webhookEndpoint.create({
          data: {
            workflowId: id,
            path,
            active: true,
          },
        });
        node.data.webhookPath = path;
        nodesUpdated = true;
      }

      if (nodesUpdated) {
        await prisma.workflow.update({
          where: { id },
          data: { nodes: JSON.stringify(nodes) },
        });
      }
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
