import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { executeWorkflow } from "@/lib/execution/runtime";
import type { BpmnNode, BpmnEdge } from "@/lib/workflow/types";

export async function POST(request: NextRequest) {
  const { workflowId, input, mode } = await request.json();

  const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
  if (!workflow) return Response.json({ error: "Workflow not found" }, { status: 404 });

  const nodes = JSON.parse(workflow.nodes) as BpmnNode[];
  const edges = JSON.parse(workflow.edges) as BpmnEdge[];

  const run = await prisma.executionRun.create({
    data: { workflowId, trigger: "manual", status: "running", input: JSON.stringify(input ?? {}) }
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      try {
        send("run_started", { runId: run.id });

        const result = await executeWorkflow(workflowId, nodes, edges, input ?? {}, mode ?? "mock", {
          onNodeStart: (nodeId) => send("node_start", { nodeId }),
          onNodeComplete: (nodeId, output) => send("node_complete", { nodeId, output }),
          onNodeError: (nodeId, error) => send("node_error", { nodeId, error }),
        });

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

        send("run_completed", { runId: run.id, status, trace: result.trace, error: result.error });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await prisma.executionRun.update({
          where: { id: run.id },
          data: { status: "failed", error: msg, completedAt: new Date() }
        });
        send("run_error", { runId: run.id, error: msg });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    }
  });
}
