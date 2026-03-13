import type { BpmnNode, BpmnEdge, ValidationResult } from "./types";
import { BpmnNodeType } from "./types";
import { executeWorkflow } from "@/lib/execution/runtime";

export async function runValidation(
  nodes: BpmnNode[],
  edges: BpmnEdge[],
  testInputs: { name: string; data: Record<string, unknown> }[],
  workflowId?: string,
): Promise<ValidationResult[]> {
  const totalNodes = nodes.length;
  const results: ValidationResult[] = [];

  for (const testInput of testInputs) {
    let result: ValidationResult["result"] = "fail";
    let error: string | undefined;
    let trace: ValidationResult["trace"] = [];

    try {
      const execResult = await executeWorkflow(
        workflowId ?? "validation",
        nodes,
        edges,
        testInput.data,
        "live",
      );
      trace = execResult.trace;
      error = execResult.error;

      const reachedEnd = trace.some((step) => {
        const node = nodes.find((n) => n.id === step.nodeId);
        return node?.data.bpmnType === BpmnNodeType.EndEvent;
      });

      result = error ? "error" : reachedEnd ? "pass" : "fail";
    } catch (err) {
      result = "error";
      error = err instanceof Error ? err.message : String(err);
    }

    const visitedNodeIds = new Set(trace.map((s) => s.nodeId));
    const coveragePercent =
      totalNodes > 0
        ? Math.round((visitedNodeIds.size / totalNodes) * 10000) / 100
        : 0;

    const branchesHit = trace
      .filter((s) => s.decision)
      .map((s) => `${s.nodeId}: ${s.decision}`);

    results.push({
      id: testInput.name,
      inputs: testInput.data,
      trace,
      result,
      error,
      coveragePercent,
      branchesHit,
    });
  }

  return results;
}
