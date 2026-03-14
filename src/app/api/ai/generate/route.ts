import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { getModel, resolveProvider, type Provider } from "@/lib/ai/providers";
import { bpmnWorkflowSchema } from "@/lib/ai/bpmn-schema";
import { BPMN_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { prisma } from "@/lib/db";

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

    const templates = await prisma.integrationTemplate.findMany({
      select: { id: true, name: true, type: true, category: true, operations: true },
    });

    const templateContext = templates
      .map((t) => {
        const ops = JSON.parse(t.operations || "[]") as { id: string; name: string }[];
        const opList = ops.map((o) => `${o.id} (${o.name})`).join(", ");
        return `- ${t.id}: ${t.name} [${t.type}, ${t.category}]${opList ? ` — operations: ${opList}` : ""}`;
      })
      .join("\n");

    const templateIds = new Set(templates.map((t) => t.id));

    const systemPrompt =
      BPMN_SYSTEM_PROMPT +
      "\n\n## Available Integrations\n\n" +
      "Use an existing integration ID from this list when one fits. If no existing integration is appropriate, leave integrationTemplateId as null and populate the newIntegration field instead.\n\n" +
      templateContext;

    const effectiveProvider = resolveProvider(provider);
    const result = await generateObject({
      model: getModel(effectiveProvider),
      schema: bpmnWorkflowSchema,
      system: systemPrompt,
      prompt,
    });

    const output = result.object;

    const createdTemplateIds = new Map<string, string>();

    for (const node of output.nodes) {
      const newInt = node.data.newIntegration;
      if (!newInt) continue;

      const dedupeKey = newInt.name.toLowerCase().trim();
      if (createdTemplateIds.has(dedupeKey)) continue;

      const created = await prisma.integrationTemplate.create({
        data: {
          name: newInt.name,
          icon: "plug",
          category: newInt.category || "custom",
          type: newInt.type,
          description: newInt.description || "",
          baseConfig: JSON.stringify(
            newInt.baseConfig
              ? Object.fromEntries(newInt.baseConfig.map((c) => [c.key, c.value]))
              : {},
          ),
          operations: JSON.stringify([]),
          isBuiltIn: false,
        },
      });
      createdTemplateIds.set(dedupeKey, created.id);
      templateIds.add(created.id);
    }

    const transformed = {
      ...output,
      nodes: output.nodes.map((node) => {
        let tplId = node.data.integrationTemplateId;
        if (node.data.newIntegration) {
          const key = node.data.newIntegration.name.toLowerCase().trim();
          tplId = createdTemplateIds.get(key) ?? tplId;
        }
        const normalizedConfig = Array.isArray(node.data.config)
          ? Object.fromEntries(
              node.data.config
                .filter(
                  (entry): entry is { key: string; value: unknown } =>
                    !!entry &&
                    typeof entry === "object" &&
                    "key" in entry &&
                    "value" in entry &&
                    typeof (entry as { key: unknown }).key === "string",
                )
                .map((entry) => [entry.key, entry.value]),
            )
          : node.data.config ?? undefined;
        const validTplId = tplId && templateIds.has(tplId) ? tplId : undefined;
        return {
          ...node,
          data: {
            label: node.data.label,
            bpmnType: node.data.bpmnType,
            description: node.data.description ?? undefined,
            config: normalizedConfig,
            conditions: node.data.conditions ?? undefined,
            integrationTemplateId: validTplId,
            operationId: validTplId ? (node.data.operationId ?? undefined) : undefined,
          },
        };
      }),
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
