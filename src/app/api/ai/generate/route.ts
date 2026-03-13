import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { getModel, resolveProvider, type Provider } from "@/lib/ai/providers";
import { bpmnWorkflowSchema } from "@/lib/ai/bpmn-schema";
import { BPMN_SYSTEM_PROMPT } from "@/lib/ai/prompts";

export async function POST(request: NextRequest) {
  try {
    const { prompt, provider } = (await request.json()) as {
      prompt: string;
      provider?: Provider;
    };

    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: "A prompt is required" },
        { status: 400 },
      );
    }

    const effectiveProvider = resolveProvider(provider);
    const result = await generateObject({
      model: getModel(effectiveProvider),
      schema: bpmnWorkflowSchema,
      system: BPMN_SYSTEM_PROMPT,
      prompt,
    });

    const output = result.object;
    const transformed = {
      ...output,
      nodes: output.nodes.map((node) => ({
        ...node,
        data: {
          label: node.data.label,
          bpmnType: node.data.bpmnType,
          description: node.data.description ?? undefined,
          config: node.data.config
            ? Object.fromEntries(node.data.config.map((c) => [c.key, c.value]))
            : undefined,
          conditions: node.data.conditions ?? undefined,
        },
      })),
      edges: output.edges.map((edge) => ({
        ...edge,
        sourceHandle: edge.sourceHandle ?? undefined,
        targetHandle: edge.targetHandle ?? undefined,
        data: edge.data
          ? {
              label: edge.data.label ?? undefined,
              condition: edge.data.condition ?? undefined,
            }
          : undefined,
      })),
    };

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("[ai/generate]", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
