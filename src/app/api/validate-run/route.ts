import { NextRequest } from "next/server";
import { runValidation } from "@/lib/workflow/validation";
import type { BpmnNode, BpmnEdge } from "@/lib/workflow/types";

export async function POST(request: NextRequest) {
  try {
    const { nodes, edges, testInputs, workflowId } = await request.json();

    if (!nodes || !edges || !testInputs) {
      return Response.json(
        { error: "Missing required fields: nodes, edges, testInputs" },
        { status: 400 },
      );
    }

    const results = await runValidation(
      nodes as BpmnNode[],
      edges as BpmnEdge[],
      testInputs,
      workflowId,
    );

    return Response.json({ results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
