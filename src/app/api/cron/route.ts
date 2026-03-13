import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { executeWorkflow } from "@/lib/execution/runtime";
import cronParser from "cron-parser";
import type { BpmnNode, BpmnEdge } from "@/lib/workflow/types";

export async function GET() {
  const now = new Date();
  const dueSchedules = await prisma.schedule.findMany({
    where: { active: true, nextRunAt: { lte: now } }
  });

  const results = [];

  for (const schedule of dueSchedules) {
    try {
      const workflow = await prisma.workflow.findUnique({ where: { id: schedule.workflowId } });
      if (!workflow) continue;

      const nodes = JSON.parse(workflow.nodes) as BpmnNode[];
      const edges = JSON.parse(workflow.edges) as BpmnEdge[];

      const run = await prisma.executionRun.create({
        data: { workflowId: schedule.workflowId, trigger: "cron", status: "running", input: "{}" }
      });

      const result = await executeWorkflow(schedule.workflowId, nodes, edges, {}, "live");

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

      let nextRunAt: Date | null = null;
      try {
        const interval = cronParser.parse(schedule.cronExpression, { tz: schedule.timezone });
        const next = interval.next();
        nextRunAt = next.toDate();
      } catch { /* keep null */ }

      await prisma.schedule.update({
        where: { id: schedule.id },
        data: { lastRunAt: now, nextRunAt }
      });

      results.push({ scheduleId: schedule.id, runId: run.id, status: result.error ? "failed" : "completed" });
    } catch (err) {
      results.push({ scheduleId: schedule.id, error: String(err) });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
