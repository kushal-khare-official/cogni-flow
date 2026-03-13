import { NextRequest } from "next/server";
import { streamText, type UIMessage, convertToModelMessages } from "ai";
import { getModel, resolveProvider, type Provider } from "@/lib/ai/providers";
import { CHAT_SYSTEM_PROMPT } from "@/lib/ai/prompts";

export async function POST(request: NextRequest) {
  try {
    const { messages, workflow, provider } = (await request.json()) as {
      messages: UIMessage[];
      workflow: { nodes: unknown[]; edges: unknown[] };
      provider?: Provider;
    };

    const effectiveProvider = resolveProvider(provider);
    const result = streamText({
      model: getModel(effectiveProvider),
      system:
        CHAT_SYSTEM_PROMPT +
        "\n\nCurrent workflow:\n" +
        JSON.stringify(workflow),
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
