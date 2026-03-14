import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { executeWorkflow } from "@/lib/execution/runtime";
import type { BpmnNode, BpmnEdge } from "@/lib/workflow/types";
import {
  getStopResponseWebhookUrl,
  postWorkflowResponseWebhook,
  validateStartRequestBody,
} from "@/lib/workflow/rest-api";

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

    if (workflow.status === "draft") {
      return NextResponse.json(
        { error: "Publish the workflow before calling its REST API." },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const nodes = JSON.parse(workflow.nodes) as BpmnNode[];
    const edges = JSON.parse(workflow.edges) as BpmnEdge[];

    const validation = validateStartRequestBody(nodes, body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: "Request body does not match Start node request structure.",
          details: validation.errors,
        },
        { status: 400 },
      );
    }

    const run = await prisma.executionRun.create({
      data: {
        workflowId: id,
        trigger: "rest_api",
        status: "running",
        input: JSON.stringify(body),
      },
    });

    const responseWebhookUrl = getStopResponseWebhookUrl(nodes);

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

        if (responseWebhookUrl) {
          await postWorkflowResponseWebhook(responseWebhookUrl, {
            workflowId: id,
            runId: run.id,
            status,
            context: result.context,
            trace: result.trace,
            error: result.error,
            completedAt: new Date().toISOString(),
          });
        }
      })
      .catch(async (err) => {
        const message = err instanceof Error ? err.message : String(err);
        await prisma.executionRun.update({
          where: { id: run.id },
          data: { status: "failed", error: message, completedAt: new Date() },
        });

        if (responseWebhookUrl) {
          await postWorkflowResponseWebhook(responseWebhookUrl, {
            workflowId: id,
            runId: run.id,
            status: "failed",
            error: message,
            completedAt: new Date().toISOString(),
          });
        }
      });

    return NextResponse.json(
      { runId: run.id, status: "started", workflowId: id },
      { status: 200 },
    );
  } catch (error) {
    console.error("[workflows/[id]/start]", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
