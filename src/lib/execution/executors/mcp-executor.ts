import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

interface McpServerConfig {
  transport: string;
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
}

function extractTextContent(result: unknown): Record<string, unknown> {
  if (!result || typeof result !== "object") return { result };

  const res = result as Record<string, unknown>;
  const content = res.content;
  if (!Array.isArray(content)) return { result };

  const texts: string[] = [];
  for (const item of content) {
    if (item && typeof item === "object" && (item as Record<string, unknown>).type === "text") {
      texts.push(String((item as Record<string, unknown>).text ?? ""));
    }
  }

  if (texts.length === 1) {
    try {
      return { result: JSON.parse(texts[0]) };
    } catch {
      return { result: texts[0] };
    }
  }

  return { result: texts.length > 0 ? texts : result };
}

async function executeStdio(
  config: McpServerConfig,
  toolName: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (!config.command) {
    throw new Error("stdio transport requires a command");
  }

  const transport = new StdioClientTransport({
    command: config.command,
    args: config.args,
    env: config.env as Record<string, string> | undefined,
  });

  const client = new Client({ name: "cogni-flow", version: "1.0.0" });

  try {
    await client.connect(transport);
    const result = await client.callTool({ name: toolName, arguments: args });
    return extractTextContent(result);
  } finally {
    try {
      await client.close();
    } catch {
      // ignore disconnect errors
    }
  }
}

async function executeHttp(
  config: McpServerConfig,
  toolName: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (!config.url) {
    throw new Error("http transport requires a url");
  }

  const { StreamableHTTPClientTransport } = await import(
    "@modelcontextprotocol/sdk/client/streamableHttp.js"
  );

  const transport = new StreamableHTTPClientTransport(new URL(config.url));
  const client = new Client({ name: "cogni-flow", version: "1.0.0" });

  try {
    await client.connect(transport);
    const result = await client.callTool({ name: toolName, arguments: args });
    return extractTextContent(result);
  } finally {
    try {
      await client.close();
    } catch {
      // ignore disconnect errors
    }
  }
}

export async function executeMcp(params: {
  mcpServerConfig: McpServerConfig;
  toolName: string;
  arguments: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const { mcpServerConfig, toolName, arguments: args } = params;

  try {
    switch (mcpServerConfig.transport) {
      case "stdio":
        return await executeStdio(mcpServerConfig, toolName, args);
      case "http":
        return await executeHttp(mcpServerConfig, toolName, args);
      default:
        throw new Error(`Unsupported MCP transport: ${mcpServerConfig.transport}`);
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
