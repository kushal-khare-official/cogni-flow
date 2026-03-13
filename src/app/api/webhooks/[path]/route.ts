import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { executeWorkflow } from "@/lib/execution/runtime";
import type { BpmnNode, BpmnEdge } from "@/lib/workflow/types";

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;

  const endpoint = await prisma.webhookEndpoint.findUnique({ where: { path } });
  if (!endpoint || !endpoint.active) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  }

  const workflow = await prisma.workflow.findUnique({ where: { id: endpoint.workflowId } });
  if (!workflow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const nodes = JSON.parse(workflow.nodes) as BpmnNode[];
  const edges = JSON.parse(workflow.edges) as BpmnEdge[];

  const run = await prisma.executionRun.create({
    data: { workflowId: endpoint.workflowId, trigger: "webhook", status: "running", input: JSON.stringify(body) }
  });

  executeWorkflow(endpoint.workflowId, nodes, edges, body, "live").then(async (result) => {
    await prisma.executionRun.update({
      where: { id: run.id },
      data: {
        status: result.error ? "failed" : "completed",
        output: JSON.stringify(result.context),
        context: JSON.stringify(result.context),
        trace: JSON.stringify(result.trace),
        error: result.error,
        completedAt: new Date(),
      }
    });
  }).catch(async (err) => {
    await prisma.executionRun.update({
      where: { id: run.id },
      data: { status: "failed", error: String(err), completedAt: new Date() }
    });
  });

  return NextResponse.json({ runId: run.id, status: "triggered" });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string }> }) {
  return POST(request, { params });
}
