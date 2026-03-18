import { NextRequest } from "next/server";
import { streamText, type UIMessage, convertToModelMessages } from "ai";
import { getModel, resolveProvider, type Provider } from "@/lib/ai/providers";
import { CHAT_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { messages, workflow, provider } = (await request.json()) as {
      messages: UIMessage[];
      workflow: { nodes: unknown[]; edges: unknown[] };
      provider?: Provider;
    };

    const integrations = await prisma.integration.findMany({
      select: { id: true, name: true, type: true, category: true },
      orderBy: { name: "asc" },
    });

    const integrationContext = integrations
      .map((t) => `- ${t.id}: ${t.name} [${t.type}, ${t.category}]`)
      .join("\n");

    const systemPrompt =
      CHAT_SYSTEM_PROMPT +
      "\n\n## Available Integrations\n\n" +
      "Use an existing integration ID when one fits. The built-in templates (tpl-rest-api, tpl-rest-webhook, tpl-mcp-tool, tpl-custom-code, tpl-kafka) are always available.\n\n" +
      integrationContext +
      "\n\nCurrent workflow:\n" +
      JSON.stringify(workflow);

    const effectiveProvider = resolveProvider(provider);
    const result = streamText({
      model: getModel(effectiveProvider),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("[ai/chat]", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
