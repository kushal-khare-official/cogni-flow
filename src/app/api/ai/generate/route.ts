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

    if (typeof prisma.integration === "undefined") {
      return NextResponse.json(
        {
          error:
            "Prisma client is missing the Integration model. Restart the dev server (stop and run `npm run dev` again) so the updated Prisma client is loaded.",
        },
        { status: 503 },
      );
    }

    const integrations = await prisma.integration.findMany({
      select: { id: true, name: true, type: true, category: true },
      orderBy: { name: "asc" },
    });

    const integrationContext = integrations
      .map((t) => `- ${t.id}: ${t.name} [${t.type}, ${t.category}]`)
      .join("\n");

    const integrationIds = new Set(integrations.map((t) => t.id));

    const systemPrompt =
      BPMN_SYSTEM_PROMPT +
      "\n\n## Available Integrations\n\n" +
      "Integrations have no operations. Each workflow step is a serviceTask with integrationId and stepConfig (e.g. method, path, bodyTemplate for HTTP; toolName for MCP; code, language for code). Use an existing integration ID when one fits; otherwise leave integrationId null and populate newIntegration. The node must still include stepConfig for this step.\n\n" +
      integrationContext;

    const effectiveProvider = resolveProvider(provider);
    const result = await generateObject({
      model: getModel(effectiveProvider),
      schema: bpmnWorkflowSchema,
      system: systemPrompt,
      prompt,
    });

    const output = result.object;

    const createdIntegrationIds = new Map<string, string>();

    function fuzzyMatchIntegration(
      name: string,
      type: string,
    ): string | undefined {
      const needle = name.toLowerCase().trim();
      for (const existing of integrations) {
        if (existing.type !== type) continue;
        const haystack = existing.name.toLowerCase().trim();
        if (haystack === needle) return existing.id;
        if (haystack.includes(needle) || needle.includes(haystack)) return existing.id;
        const needleWords = needle.split(/[\s\-_]+/);
        const haystackWords = haystack.split(/[\s\-_]+/);
        const overlap = needleWords.filter((w) => haystackWords.includes(w));
        if (overlap.length >= Math.max(1, Math.min(needleWords.length, haystackWords.length) * 0.6)) {
          return existing.id;
        }
      }
      return undefined;
    }

    for (const node of output.nodes) {
      const newInt = node.data.newIntegration;
      if (!newInt?.name?.trim()) continue;

      const dedupeKey = newInt.name.toLowerCase().trim();
      if (createdIntegrationIds.has(dedupeKey)) continue;

      const existingMatch = fuzzyMatchIntegration(newInt.name, newInt.type);
      if (existingMatch) {
        createdIntegrationIds.set(dedupeKey, existingMatch);
        continue;
      }

      const iconMap: Record<string, string> = {
        http: "globe", webhook: "webhook", mcp_tool: "wrench", code: "code", kafka: "radio",
      };

      const created = await prisma.integration.create({
        data: {
          name: newInt.name,
          icon: iconMap[newInt.type] ?? "plug",
          category: newInt.category || "custom",
          type: newInt.type,
          description: newInt.description || "",
          baseConfig: JSON.stringify(
            newInt.baseConfig
              ? Object.fromEntries(newInt.baseConfig.map((c) => [c.key, c.value]))
              : {},
          ),
          credentialSchema: JSON.stringify([]),
          mockConfig: JSON.stringify({}),
          isBuiltIn: false,
        },
      });
      createdIntegrationIds.set(dedupeKey, created.id);
      integrationIds.add(created.id);
    }

    const transformed = {
      ...output,
      nodes: output.nodes.map((node) => {
        let intId = node.data.integrationId;
        if (node.data.newIntegration?.name?.trim()) {
          const key = node.data.newIntegration.name.toLowerCase().trim();
          intId = createdIntegrationIds.get(key) ?? intId;
        }
        const validIntId = intId && integrationIds.has(intId) ? intId : undefined;
        const emptyToUndefined = (s: string | null | undefined) =>
          s != null && s !== "" ? s : undefined;
        const emptyArrToUndefined = <T>(a: T[] | null | undefined) =>
          a?.length ? a : undefined;
        return {
          ...node,
          data: {
            label: node.data.label,
            bpmnType: node.data.bpmnType,
            stepName: emptyToUndefined(node.data.stepName),
            description: emptyToUndefined(node.data.description),
            config: emptyArrToUndefined(node.data.config)
              ? Object.fromEntries((node.data.config ?? []).map((c) => [c.key, c.value]))
              : undefined,
            conditions: emptyArrToUndefined(node.data.conditions),
            integrationId: emptyToUndefined(validIntId),
            stepConfig: (() => {
              const sc = node.data.stepConfig;
              if (sc == null || typeof sc !== "object") return undefined;
              const out = Object.fromEntries(
                Object.entries(sc).filter(([, v]) => v != null && v !== "")
              ) as Record<string, unknown>;
              return Object.keys(out).length > 0 ? out : undefined;
            })(),
            outputSchema: (() => {
              const arr = node.data.outputSchema;
              if (!arr?.length) return undefined;
              return arr.map((item: { key: string; type?: string; description?: string }) => ({
                key: item.key,
                ...(emptyToUndefined(item.type) != null && { type: emptyToUndefined(item.type) }),
                ...(emptyToUndefined(item.description) != null && { description: emptyToUndefined(item.description) }),
              }));
            })(),
            inputMapping: (() => {
              const arr = node.data.inputMapping;
              if (!arr?.length) return undefined;
              return Object.fromEntries(
                (arr as { key: string; value: unknown }[]).map((e) => [
                  e.key,
                  typeof e.value === "string" ? e.value : JSON.stringify(e.value ?? ""),
                ])
              ) as Record<string, string>;
            })(),
            requestBody: emptyArrToUndefined(node.data.requestBody),
            webhookUrl: emptyToUndefined(node.data.webhookUrl),
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

    // Auto-wire missing inputMapping based on graph edges and upstream outputSchema
    const nodeMap = new Map(transformed.nodes.map((n) => [n.id, n]));
    for (const node of transformed.nodes) {
      const bpmn = node.data.bpmnType as string;
      if (bpmn === "startEvent" || bpmn === "webhookTrigger") continue;
      if (node.data.inputMapping && Object.keys(node.data.inputMapping).length > 0) continue;

      const incomingEdges = transformed.edges.filter((e) => e.target === node.id);
      if (incomingEdges.length === 0) continue;

      const wired: Record<string, string> = {};
      for (const edge of incomingEdges) {
        const sourceNode = nodeMap.get(edge.source);
        if (!sourceNode) continue;
        const schema = sourceNode.data.outputSchema as
          | { key: string; type?: string; description?: string }[]
          | undefined;
        if (schema?.length) {
          for (const field of schema) {
            if (!wired[field.key]) {
              wired[field.key] = `{{${edge.source}.${field.key}}}`;
            }
          }
        } else if ((sourceNode.data.bpmnType as string) === "startEvent") {
          const reqBody = sourceNode.data.requestBody as
            | { key: string }[]
            | undefined;
          if (reqBody?.length) {
            for (const field of reqBody) {
              if (!wired[field.key]) {
                wired[field.key] = `{{${edge.source}.${field.key}}}`;
              }
            }
          }
        }
      }
      if (Object.keys(wired).length > 0) {
        (node.data as Record<string, unknown>).inputMapping = wired;
      }
    }

    const newIntegrationIds = Array.from(createdIntegrationIds.values());

    return NextResponse.json({ ...transformed, newIntegrationIds });
  } catch (error) {
    console.error("[ai/generate]", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
