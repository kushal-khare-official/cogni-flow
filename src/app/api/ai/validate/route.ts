import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { getModel, resolveProvider, type Provider } from "@/lib/ai/providers";
import { VALIDATION_SYSTEM_PROMPT } from "@/lib/ai/prompts";

const testInputsSchema = z.object({
  testInputs: z.array(
    z.object({
      name: z.string(),
      data: z.record(z.string(), z.unknown()),
    }),
  ),
});

export async function POST(request: NextRequest) {
  try {
    const { workflow, provider } = (await request.json()) as {
      workflow: { nodes: unknown[]; edges: unknown[] };
      provider?: Provider;
    };

    if (!workflow?.nodes?.length) {
      return NextResponse.json(
        { error: "A workflow with at least one node is required" },
        { status: 400 },
      );
    }

    const effectiveProvider = resolveProvider(provider);
    const result = await generateObject({
      model: getModel(effectiveProvider),
      schema: testInputsSchema,
      system: VALIDATION_SYSTEM_PROMPT,
      prompt:
        "Generate 5 diverse test inputs for this workflow:\n" +
        JSON.stringify(workflow),
    });

    return NextResponse.json(result.object);
  } catch (error) {
    console.error("[ai/validate]", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
