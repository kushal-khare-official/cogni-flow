import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { executeWorkflow } from "@/lib/execution/runtime";
import type { BpmnNode, BpmnEdge } from "@/lib/workflow/types";
import { BpmnNodeType } from "@/lib/workflow/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const workflow = await prisma.workflow.findUnique({ where: { id } });
    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    if (workflow.status !== "live" && workflow.status !== "shadow") {
      return NextResponse.json(
        { error: "Workflow must be published (live or shadow) to be triggered via REST API" },
        { status: 400 },
      );
    }

    const nodes = JSON.parse(workflow.nodes) as BpmnNode[];
    const edges = JSON.parse(workflow.edges) as BpmnEdge[];

    const startNode = nodes.find(
      (n) =>
        n.data.bpmnType === BpmnNodeType.StartEvent ||
        n.data.bpmnType === BpmnNodeType.WebhookTrigger,
    );

    if (!startNode) {
      return NextResponse.json({ error: "Workflow has no start event" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));

    const requestBodySchema = startNode.data.requestBody;
    if (requestBodySchema && requestBodySchema.length > 0) {
      const errors: string[] = [];
      for (const field of requestBodySchema) {
        if (field.required && (body[field.key] === undefined || body[field.key] === null)) {
          errors.push(`Missing required field: ${field.key}`);
        }
      }
      if (errors.length > 0) {
        return NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 });
      }
    }

    const run = await prisma.executionRun.create({
      data: {
        workflowId: id,
        trigger: "rest_api",
        status: "running",
        input: JSON.stringify(body),
      },
    });

    const endNodes = nodes.filter((n) => n.data.bpmnType === BpmnNodeType.EndEvent);
    const endNode = endNodes[0];
    const webhookUrl = endNodes.find((n) => n.data.webhookUrl)?.data.webhookUrl;
    const responseMode = (endNode?.data.responseMode as string | undefined) ?? (webhookUrl ? "webhook" : "sync");
    const isSyncResponse = responseMode === "sync";

    if (isSyncResponse) {
      try {
        const result = await executeWorkflow(id, nodes, edges, body, "live");
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
          },
        });

        return NextResponse.json({
          runId: run.id,
          workflowId: id,
          status,
          output: result.endNodeOutput ?? result.context,
          error: result.error ?? null,
          completedAt: new Date().toISOString(),
        }, { status: result.error ? 500 : 200 });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        await prisma.executionRun.update({
          where: { id: run.id },
          data: { status: "failed", error: errorMsg, completedAt: new Date() },
        });
        return NextResponse.json({
          runId: run.id,
          workflowId: id,
          status: "failed",
          output: null,
          error: errorMsg,
          completedAt: new Date().toISOString(),
        }, { status: 500 });
      }
    }

    executeWorkflow(id, nodes, edges, body, "live")
      .then(async (result) => {
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
          },
        });

        if (webhookUrl) {
          try {
            await fetch(webhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                runId: run.id,
                workflowId: id,
                status,
                output: result.endNodeOutput ?? result.context,
                error: result.error ?? null,
                completedAt: new Date().toISOString(),
              }),
            });
          } catch (webhookErr) {
            console.error("[trigger/webhook-response]", webhookErr);
          }
        }
      })
      .catch(async (err) => {
        const errorMsg = err instanceof Error ? err.message : String(err);
        await prisma.executionRun.update({
          where: { id: run.id },
          data: { status: "failed", error: errorMsg, completedAt: new Date() },
        });

        if (webhookUrl) {
          try {
            await fetch(webhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                runId: run.id,
                workflowId: id,
                status: "failed",
                output: null,
                error: errorMsg,
                completedAt: new Date().toISOString(),
              }),
            });
          } catch (webhookErr) {
            console.error("[trigger/webhook-response]", webhookErr);
          }
        }
      });

    return NextResponse.json({
      runId: run.id,
      status: "accepted",
      message: "Workflow execution started. Results will be delivered to the configured webhook URL.",
      ...(webhookUrl ? { webhookUrl } : {}),
    });
  } catch (error) {
    console.error("[workflows/[id]/trigger]", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
