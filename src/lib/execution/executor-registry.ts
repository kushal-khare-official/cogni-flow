import { executeHttp, ExecutorParams } from "./executors/http-executor";
import { executeMock } from "./executors/mock-executor";
import { executeCode } from "./executors/code-executor";
import { ExecutionContext } from "./context";

export type IntegrationType = "http" | "mcp_tool" | "code" | "webhook" | "kafka";
export type ExecutionMode = "live" | "mock";

interface MockConfig {
  defaultResponse?: unknown;
  perOperation?: Record<string, unknown>;
  latencyMs?: number;
}

interface DispatchParams {
  httpParams?: ExecutorParams;
  mcpParams?: {
    mcpServerConfig: {
      transport: string;
      command?: string;
      args?: string[];
      url?: string;
      env?: Record<string, string>;
    };
    toolName: string;
    arguments: Record<string, unknown>;
  };
  codeParams?: {
    code: string;
    ctx: Record<string, unknown>;
    language?: string;
  };
  webhookPassthrough?: Record<string, unknown>;
  kafkaParams?: Record<string, unknown>;
  mockConfig?: MockConfig;
  operationId?: string;
}

export async function dispatchExecutor(
  type: IntegrationType,
  mode: ExecutionMode,
  params: DispatchParams,
  context: ExecutionContext,
): Promise<Record<string, unknown>> {
  if (mode === "mock" && type !== "code") {
    return executeMock(
      params.mockConfig ?? {},
      params.operationId ?? "default",
    );
  }

  switch (type) {
    case "http": {
      if (!params.httpParams) {
        throw new Error("httpParams required for http executor");
      }
      return executeHttp(params.httpParams, context);
    }

    case "mcp_tool": {
      if (!params.mcpParams) {
        throw new Error("mcpParams required for mcp_tool executor");
      }
      const { executeMcp } = await import("./executors/mcp-executor");
      return executeMcp(params.mcpParams);
    }

    case "code": {
      if (!params.codeParams) {
        throw new Error("codeParams required for code executor");
      }
      return executeCode(params.codeParams.code, params.codeParams.ctx, params.codeParams.language);
    }

    case "webhook": {
      return params.webhookPassthrough ?? {};
    }

    case "kafka": {
      return params.kafkaParams ?? { message: "Kafka consumer placeholder — connect a real Kafka client" };
    }

    default:
      throw new Error(`Unknown integration type: ${type}`);
  }
}
