import { NextRequest, NextResponse } from "next/server";
import { parseBpmnXml } from "@/lib/bpmn-import/parser";
import { convertToReactFlow } from "@/lib/bpmn-import/converter";

export async function POST(request: NextRequest) {
  const { xml } = await request.json();
  if (!xml || typeof xml !== "string") {
    return NextResponse.json({ error: "XML string required" }, { status: 400 });
  }

  try {
    const { definitions, warnings: parseWarnings } = await parseBpmnXml(xml);
    const { nodes, edges, warnings: convertWarnings } = convertToReactFlow(definitions);

    return NextResponse.json({
      nodes,
      edges,
      warnings: [...parseWarnings, ...convertWarnings],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to parse BPMN: ${msg}` }, { status: 400 });
  }
}
