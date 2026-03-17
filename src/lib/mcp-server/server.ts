import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { prisma } from "@/lib/db";
import { executeWorkflow } from "@/lib/execution/runtime";
import { runValidation } from "@/lib/workflow/validation";
import type { BpmnNode, BpmnEdge } from "@/lib/workflow/types";
import { BpmnNodeType } from "@/lib/workflow/types";
import { workflowToToolName, extractWorkflowId } from "./tool-name";
import { requestBodyToJsonSchema, type RequestBodyField } from "./schema";
import { PLATFORM_TOOLS, isPlatformTool } from "./platform-tools";

function textResult(data: unknown, isError = false) {
  return {
    content: [{ type: "text" as const, text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }],
    isError,
  };
}

export function createMcpServer(): Server {
  const server = new Server(
    { name: "cogni-flow-workflows", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  // ── tools/list ──────────────────────────────────────────────────────

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const workflows = await prisma.workflow.findMany({
      where: { status: { in: ["live", "shadow"] } },
    });

    const workflowTools = workflows.map((wf) => {
      const nodes = JSON.parse(wf.nodes) as BpmnNode[];
      const startNode = nodes.find(
        (n) =>
          n.data.bpmnType === BpmnNodeType.StartEvent ||
          n.data.bpmnType === BpmnNodeType.WebhookTrigger,
      );

      const requestBody = (startNode?.data.requestBody ?? []) as RequestBodyField[];
      const inputSchema = requestBodyToJsonSchema(requestBody);

      return {
        name: workflowToToolName(wf.name, wf.id),
        description: wf.description || wf.name,
        inputSchema,
      };
    });

    return { tools: [...PLATFORM_TOOLS, ...workflowTools] };
  });

  // ── tools/call ──────────────────────────────────────────────────────

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name: toolName, arguments: args } = request.params;
    const params = (args ?? {}) as Record<string, unknown>;

    if (isPlatformTool(toolName)) {
      return handlePlatformTool(toolName, params);
    }

    return handleWorkflowTool(toolName, params);
  });

  return server;
}

// ── Platform tool handlers ──────────────────────────────────────────────

async function handlePlatformTool(
  name: string,
  params: Record<string, unknown>,
) {
  switch (name) {
    case "list_workflows":
      return handleListWorkflows(params);
    case "get_workflow_schema":
      return handleGetWorkflowSchema(params);
    case "get_execution_history":
      return handleGetExecutionHistory(params);
    case "validate_workflow":
      return handleValidateWorkflow(params);
    case "dry_run_workflow":
      return handleDryRunWorkflow(params);
    case "generate_workflow":
      return handleGenerateWorkflow(params);
    default:
      return textResult(`Unknown platform tool: ${name}`, true);
  }
}

async function handleListWorkflows(params: Record<string, unknown>) {
  try {
    const status = params.status as string | undefined;
    const where = status ? { status } : {};

    const workflows = await prisma.workflow.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return textResult({ workflows });
  } catch (err) {
    return textResult({ error: errMsg(err) }, true);
  }
}

async function handleGetWorkflowSchema(params: Record<string, unknown>) {
  try {
    const workflowId = params.workflowId as string;
    if (!workflowId) return textResult("Missing required field: workflowId", true);

    const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
    if (!workflow) return textResult(`Workflow not found: ${workflowId}`, true);

    const nodes = JSON.parse(workflow.nodes) as BpmnNode[];

    const startNode = nodes.find(
      (n) =>
        n.data.bpmnType === BpmnNodeType.StartEvent ||
        n.data.bpmnType === BpmnNodeType.WebhookTrigger,
    );
    const endNode = nodes.find((n) => n.data.bpmnType === BpmnNodeType.EndEvent);

    const requestBody = (startNode?.data.requestBody ?? []) as RequestBodyField[];
    const inputSchema = requestBodyToJsonSchema(requestBody);

    const outputSchema: Record<string, unknown> = {};
    if (endNode?.data.responseMapping) {
      outputSchema.responseMapping = endNode.data.responseMapping;
    }
    if (endNode?.data.outputSchema) {
      outputSchema.outputSchema = endNode.data.outputSchema;
    }

    return textResult({
      workflowId,
      name: workflow.name,
      description: workflow.description,
      inputSchema,
      outputSchema: Object.keys(outputSchema).length > 0 ? outputSchema : null,
    });
  } catch (err) {
    return textResult({ error: errMsg(err) }, true);
  }
}

async function handleGetExecutionHistory(params: Record<string, unknown>) {
  try {
    const workflowId = params.workflowId as string | undefined;
    const limit = Math.min(Number(params.limit ?? 20), 100);
    const offset = Number(params.offset ?? 0);

    const where = workflowId ? { workflowId } : {};
    const [runs, total] = await Promise.all([
      prisma.executionRun.findMany({
        where,
        orderBy: { startedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.executionRun.count({ where }),
    ]);

    return textResult({ runs, total, limit, offset });
  } catch (err) {
    return textResult({ error: errMsg(err) }, true);
  }
}

async function handleValidateWorkflow(params: Record<string, unknown>) {
  try {
    const workflowId = params.workflowId as string;
    const testInputs = params.testInputs as { name: string; data: Record<string, unknown> }[];

    if (!workflowId) return textResult("Missing required field: workflowId", true);
    if (!testInputs || !Array.isArray(testInputs)) {
      return textResult("Missing required field: testInputs (array of { name, data })", true);
    }

    const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
    if (!workflow) return textResult(`Workflow not found: ${workflowId}`, true);

    const nodes = JSON.parse(workflow.nodes) as BpmnNode[];
    const edges = JSON.parse(workflow.edges) as BpmnEdge[];

    const results = await runValidation(nodes, edges, testInputs, workflowId);
    return textResult({ results });
  } catch (err) {
    return textResult({ error: errMsg(err) }, true);
  }
}

async function handleDryRunWorkflow(params: Record<string, unknown>) {
  try {
    const workflowId = params.workflowId as string;
    if (!workflowId) return textResult("Missing required field: workflowId", true);

    const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
    if (!workflow) return textResult(`Workflow not found: ${workflowId}`, true);

    const nodes = JSON.parse(workflow.nodes) as BpmnNode[];
    const edges = JSON.parse(workflow.edges) as BpmnEdge[];
    const input = (params.input ?? {}) as Record<string, unknown>;

    const result = await executeWorkflow(workflowId, nodes, edges, input, "mock");

    return textResult({
      status: result.error ? "failed" : "completed",
      output: result.endNodeOutput ?? result.context,
      trace: result.trace,
      error: result.error ?? null,
    }, !!result.error);
  } catch (err) {
    return textResult({ error: errMsg(err) }, true);
  }
}

async function handleGenerateWorkflow(params: Record<string, unknown>) {
  try {
    const prompt = params.prompt as string;
    if (!prompt?.trim()) return textResult("Missing required field: prompt", true);

    const { generateObject } = await import("ai");
    const { getModel, resolveProvider } = await import("@/lib/ai/providers");
    const { bpmnWorkflowSchema } = await import("@/lib/ai/bpmn-schema");
    const { BPMN_SYSTEM_PROMPT } = await import("@/lib/ai/prompts");

    const integrations = await prisma.integration.findMany({
      select: { id: true, name: true, type: true, category: true },
      orderBy: { name: "asc" },
    });

    const integrationContext = integrations
      .map((t) => `- ${t.id}: ${t.name} [${t.type}, ${t.category}]`)
      .join("\n");

    const systemPrompt =
      BPMN_SYSTEM_PROMPT +
      "\n\n## Available Integrations\n\n" +
      "Integrations have no operations. Each workflow step is a serviceTask with integrationId and stepConfig (e.g. method, path, bodyTemplate for HTTP; toolName for MCP; code, language for code). Use an existing integration ID when one fits; otherwise leave integrationId null and populate newIntegration. The node must still include stepConfig for this step.\n\n" +
      integrationContext;

    const provider = params.provider as string | undefined;
    const effectiveProvider = resolveProvider(provider as "openai" | "anthropic" | "google" | undefined);
    const result = await generateObject({
      model: getModel(effectiveProvider),
      schema: bpmnWorkflowSchema,
      system: systemPrompt,
      prompt,
    });

    return textResult({
      message: "Workflow generated successfully. Use the nodes and edges to create a workflow via the API.",
      nodes: result.object.nodes,
      edges: result.object.edges,
    });
  } catch (err) {
    return textResult({ error: errMsg(err) }, true);
  }
}

// ── Dynamic workflow tool handler ───────────────────────────────────────

async function handleWorkflowTool(
  toolName: string,
  params: Record<string, unknown>,
) {
  const idPrefix = extractWorkflowId(toolName);

  if (!idPrefix) {
    return textResult("Invalid tool name", true);
  }

  const workflows = await prisma.workflow.findMany({
    where: { status: { in: ["live", "shadow"] } },
  });

  const workflow = workflows.find((wf) => wf.id.startsWith(idPrefix));

  if (!workflow) {
    return textResult(`Workflow not found for tool: ${toolName}`, true);
  }

  const nodes = JSON.parse(workflow.nodes) as BpmnNode[];
  const edges = JSON.parse(workflow.edges) as BpmnEdge[];

  const startNode = nodes.find(
    (n) =>
      n.data.bpmnType === BpmnNodeType.StartEvent ||
      n.data.bpmnType === BpmnNodeType.WebhookTrigger,
  );

  if (!startNode) {
    return textResult("Workflow has no start event", true);
  }

  const input = params;

  const requestBodySchema = startNode.data.requestBody as RequestBodyField[] | undefined;
  if (requestBodySchema && requestBodySchema.length > 0) {
    const errors: string[] = [];
    for (const field of requestBodySchema) {
      if (field.required && (input[field.key] === undefined || input[field.key] === null)) {
        errors.push(`Missing required field: ${field.key}`);
      }
    }
    if (errors.length > 0) {
      return textResult(`Validation failed: ${errors.join(", ")}`, true);
    }
  }

  const run = await prisma.executionRun.create({
    data: {
      workflowId: workflow.id,
      trigger: "mcp",
      status: "running",
      input: JSON.stringify(input),
    },
  });

  try {
    const result = await executeWorkflow(workflow.id, nodes, edges, input, "live");
    const status = result.error ? "failed" : "completed";

    await prisma.executionRun.update({
      where: { id: run.id },
      data: {
        status,
        output: JSON.stringify(result.context),
        context: JSON.stringify(result.context),
        trace: JSON.stringify(result.trace),
        error: result.error,
        completedAt: new Date(),
      },
    });

    const output = result.endNodeOutput ?? result.context;

    if (result.error) {
      return textResult({ error: result.error, output }, true);
    }

    return textResult(output);
  } catch (err) {
    const errorMsg = errMsg(err);

    await prisma.executionRun.update({
      where: { id: run.id },
      data: { status: "failed", error: errorMsg, completedAt: new Date() },
    });

    return textResult({ error: errorMsg }, true);
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
