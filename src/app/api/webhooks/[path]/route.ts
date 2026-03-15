import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { executeWorkflow } from "@/lib/execution/runtime";
import type { BpmnNode, BpmnEdge } from "@/lib/workflow/types";
import { BpmnNodeType } from "@/lib/workflow/types";

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

  const endNodes = nodes.filter((n) => n.data.bpmnType === BpmnNodeType.EndEvent);
  const endNode = endNodes[0];
  const responseMode = (endNode?.data.responseMode as string | undefined) ?? "webhook";
  const isSyncResponse = responseMode === "sync";

  const run = await prisma.executionRun.create({
    data: { workflowId: endpoint.workflowId, trigger: "webhook", status: "running", input: JSON.stringify(body) }
  });

  if (isSyncResponse) {
    try {
      const result = await executeWorkflow(endpoint.workflowId, nodes, edges, body, "live");
      const status = result.error ? "failed" : "completed";
      await prisma.executionRun.update({
        where: { id: run.id },
        data: {
          status,
          output: JSON.stringify(result.context),
          context: JSON.stringify(result.context),
          trace: JSON.stringify(result.trace),
          error: result.error,
          completedAt: new Date(),
        }
      });

      return NextResponse.json({
        runId: run.id,
        workflowId: endpoint.workflowId,
        status,
        output: result.endNodeOutput ?? result.context,
        error: result.error ?? null,
        completedAt: new Date().toISOString(),
      }, { status: result.error ? 500 : 200 });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await prisma.executionRun.update({
        where: { id: run.id },
        data: { status: "failed", error: errorMsg, completedAt: new Date() }
      });
      return NextResponse.json({
        runId: run.id,
        workflowId: endpoint.workflowId,
        status: "failed",
        output: null,
        error: errorMsg,
        completedAt: new Date().toISOString(),
      }, { status: 500 });
    }
  }

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
