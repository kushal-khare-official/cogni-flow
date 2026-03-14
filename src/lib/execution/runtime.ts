import type { BpmnNode, BpmnEdge, ExecutionTraceStep } from "../workflow/types";
import { BpmnNodeType } from "../workflow/types";
import { ExecutionContext } from "./context";
import { resolveExpression, resolveTemplate, evaluateCondition } from "./expression";
import { dispatchExecutor, type IntegrationType, type ExecutionMode } from "./executor-registry";
import { prisma } from "@/lib/db";
import { resolveCredential } from "@/lib/credentials/store";
import {
  findLoopBackEdge,
  collectLoopBody,
  findLoopExitEdge,
  shouldLoopContinue,
} from "../workflow/loop-utils";

const MAX_STEPS = 200;
const GATEWAY_TYPES = new Set([
  BpmnNodeType.ExclusiveGateway,
  BpmnNodeType.ParallelGateway,
  BpmnNodeType.InclusiveGateway,
]);

export interface ExecutionCallbacks {
  onNodeStart?: (nodeId: string) => void;
  onNodeComplete?: (nodeId: string, output: Record<string, unknown>) => void;
  onNodeError?: (nodeId: string, error: string) => void;
}

export async function executeWorkflow(
  workflowId: string,
  nodes: BpmnNode[],
  edges: BpmnEdge[],
  input: Record<string, unknown>,
  mode: ExecutionMode,
  callbacks?: ExecutionCallbacks,
): Promise<{ trace: ExecutionTraceStep[]; context: Record<string, unknown>; error?: string }> {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const trace: ExecutionTraceStep[] = [];
  const ctx = new ExecutionContext();

  const startNode = nodes.find(
    (n) =>
      n.data.bpmnType === BpmnNodeType.StartEvent ||
      n.data.bpmnType === BpmnNodeType.WebhookTrigger,
  );

  if (!startNode) {
    return { trace, context: ctx.toJSON(), error: "No start event found" };
  }

  ctx.set(startNode.id, input);

  let currentNodeId: string | null = startNode.id;
  let globalError: string | undefined;

  for (let step = 0; step < MAX_STEPS && currentNodeId; step++) {
    const node = nodeMap.get(currentNodeId);
    if (!node) break;

    const bpmnType = node.data.bpmnType;
    const startTime = Date.now();
    let output: Record<string, unknown> = {};
    let decision: string | undefined;

    callbacks?.onNodeStart?.(currentNodeId);

    try {
      if (bpmnType === BpmnNodeType.StartEvent || bpmnType === BpmnNodeType.WebhookTrigger) {
        output = { ...input };
      } else if (bpmnType === BpmnNodeType.EndEvent) {
        output = gatherInputs(currentNodeId, edges, ctx);
        trace.push({
          nodeId: currentNodeId,
          timestamp: startTime,
          input: gatherInputs(currentNodeId, edges, ctx),
          output,
          duration: Date.now() - startTime,
        });
        ctx.set(currentNodeId, output);
        callbacks?.onNodeComplete?.(currentNodeId, output);

        const webhookUrl = node.data.webhookUrl as string | undefined;
        if (webhookUrl) {
          deliverWebhookResponse(webhookUrl, workflowId, ctx.toJSON(), undefined).catch((err) => {
            console.error("[runtime/webhook-response]", err);
          });
        }

        break;
      } else if (node.data.integrationId) {
        output = await executeIntegrationNode(node, ctx, mode);
      } else if (GATEWAY_TYPES.has(bpmnType)) {
        const nodeInput = gatherInputs(currentNodeId, edges, ctx);
        output = nodeInput;
        decision = undefined;
      } else if (bpmnType === BpmnNodeType.Loop) {
        const nodeInput = gatherInputs(currentNodeId, edges, ctx);
        const iteration = (typeof nodeInput.iteration === "number" ? nodeInput.iteration : 0) + 1;
        const continuing = shouldLoopContinue(node, iteration);
        output = { ...nodeInput, iteration, loopContinue: continuing };
        decision = continuing
          ? `Iteration ${iteration} — continuing`
          : `Iteration ${iteration} — loop finished`;
      } else {
        const nodeInput = gatherInputs(currentNodeId, edges, ctx);
        output = { ...nodeInput, [`${node.data.label}_processed`]: true };
      }

      ctx.set(currentNodeId, output);
      callbacks?.onNodeComplete?.(currentNodeId, output);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      callbacks?.onNodeError?.(currentNodeId, errorMsg);
      output = { error: errorMsg };
      ctx.set(currentNodeId, output);

      const retryCount = (node.data.retryCount as number) ?? 0;
      if (retryCount > 0) {
        let retried = false;
        for (let r = 0; r < retryCount; r++) {
          try {
            await new Promise((res) => setTimeout(res, 1000 * (r + 1)));
            if (node.data.integrationId) {
              output = await executeIntegrationNode(node, ctx, mode);
            }
            ctx.set(currentNodeId, output);
            callbacks?.onNodeComplete?.(currentNodeId, output);
            retried = true;
            break;
          } catch {
            // continue retrying
          }
        }
        if (!retried) {
          globalError = `Node ${currentNodeId} failed after ${retryCount} retries: ${errorMsg}`;
          trace.push({
            nodeId: currentNodeId,
            timestamp: startTime,
            input: gatherInputs(currentNodeId, edges, ctx),
            output,
            decision: `Error: ${errorMsg}`,
            duration: Date.now() - startTime,
          });
          break;
        }
      } else {
        globalError = `Node ${currentNodeId} failed: ${errorMsg}`;
        trace.push({
          nodeId: currentNodeId,
          timestamp: startTime,
          input: gatherInputs(currentNodeId, edges, ctx),
          output,
          decision: `Error: ${errorMsg}`,
          duration: Date.now() - startTime,
        });
        break;
      }
    }

    trace.push({
      nodeId: currentNodeId,
      timestamp: startTime,
      input: gatherInputs(currentNodeId, edges, ctx),
      output,
      decision,
      duration: Date.now() - startTime,
    });

    // Determine next node
    const outgoing = edges.filter((e) => e.source === currentNodeId);
    if (outgoing.length === 0) {
      currentNodeId = null;
    } else if (bpmnType === BpmnNodeType.Loop) {
      const continuing = output.loopContinue as boolean;
      if (continuing) {
        const body = collectLoopBody(currentNodeId, nodes, edges);
        currentNodeId = body.length > 0 ? body[0] : outgoing[0].target;
      } else {
        const exitEdge = findLoopExitEdge(currentNodeId, nodes, edges);
        currentNodeId = exitEdge ? exitEdge.target : outgoing[0].target;
      }
    } else if (bpmnType === BpmnNodeType.ExclusiveGateway) {
      let nextEdge = outgoing[0];
      for (const edge of outgoing) {
        const condition = edge.data?.condition;
        if (condition && evaluateCondition(condition, ctx)) {
          nextEdge = edge;
          break;
        }
      }
      decision = `Took branch → ${nextEdge.data?.label || nextEdge.target}`;
      trace[trace.length - 1].decision = decision;
      currentNodeId = nextEdge.target;
    } else {
      const backEdge = findLoopBackEdge(currentNodeId, edges);
      if (backEdge && backEdge.source === currentNodeId) {
        currentNodeId = backEdge.target;
      } else {
        currentNodeId = outgoing[0].target;
      }
    }
  }

  return { trace, context: ctx.toJSON(), error: globalError };
}

function gatherInputs(
  nodeId: string,
  edges: BpmnEdge[],
  ctx: ExecutionContext,
): Record<string, unknown> {
  const incoming = edges.filter((e) => e.target === nodeId);
  let merged: Record<string, unknown> = {};
  for (const edge of incoming) {
    const sourceOutput = ctx.get(edge.source);
    if (sourceOutput) {
      merged = { ...merged, ...sourceOutput };
    }
  }
  return merged;
}

function gatherInputsFromContext(
  nodeId: string,
  ctx: ExecutionContext,
): Record<string, unknown> {
  const all = ctx.toJSON();
  const merged: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(all)) {
    if (key !== nodeId && key !== "credential" && key !== "_inputs") {
      Object.assign(merged, val as Record<string, unknown>);
    }
  }
  return merged;
}

async function deliverWebhookResponse(
  webhookUrl: string,
  workflowId: string,
  context: Record<string, unknown>,
  error: string | undefined,
): Promise<void> {
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      workflowId,
      status: error ? "failed" : "completed",
      output: context,
      error: error ?? null,
      completedAt: new Date().toISOString(),
    }),
  });
}

async function executeIntegrationNode(
  node: BpmnNode,
  ctx: ExecutionContext,
  mode: ExecutionMode,
): Promise<Record<string, unknown>> {
  const { integrationId, credentialId, inputMapping, stepConfig: rawStepConfig } = node.data;
  if (!integrationId) {
    throw new Error("Service task missing integration ID");
  }

  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
  });
  if (!integration) {
    throw new Error(`Integration not found: ${integrationId}`);
  }

  const baseConfig = JSON.parse(integration.baseConfig);
  const mockConfig = JSON.parse(integration.mockConfig);
  const type = integration.type as IntegrationType;

  // Build operation-like shape from node stepConfig (and legacy config overrides)
  const nodeConfig = (node.data.config ?? {}) as Record<string, unknown>;
  const stepConfig = (rawStepConfig ?? {}) as Record<string, unknown>;

  const operation = {
    id: "default",
    method: (stepConfig.method ?? nodeConfig.methodOverride ?? "GET") as string,
    path: (stepConfig.path ?? nodeConfig.pathOverride ?? (baseConfig.defaultPath as string | undefined) ?? "") as string,
    bodyTemplate: stepConfig.bodyTemplate ?? (nodeConfig.bodyOverride ? (typeof nodeConfig.bodyOverride === "string" ? (() => { try { return JSON.parse(nodeConfig.bodyOverride as string); } catch { return undefined; } })() : nodeConfig.bodyOverride) : undefined),
    queryTemplate: stepConfig.queryTemplate as Record<string, string> | undefined,
    headersOverride: (stepConfig.headersOverride ?? (nodeConfig.headersOverride ? (typeof nodeConfig.headersOverride === "string" ? (() => { try { return JSON.parse(nodeConfig.headersOverride as string); } catch { return undefined; } })() : nodeConfig.headersOverride) : undefined)) as Record<string, string> | undefined,
    toolName: (stepConfig.toolName ?? nodeConfig.toolName ?? "") as string,
    codeTemplate: (stepConfig.code ?? node.data.code) as string | undefined,
    inputSchema: (stepConfig.inputSchema ?? []) as Array<{ key: string; default?: unknown }>,
  };

  let credential: Record<string, string> | null = null;
  if (credentialId && mode === "live") {
    try {
      credential = await resolveCredential(credentialId);
    } catch {
      // fall through to mock if credential resolution fails
    }
  }

  // Build resolved inputs from input mapping
  const resolvedInputs: Record<string, unknown> = {};
  if (inputMapping) {
    for (const [key, expr] of Object.entries(inputMapping)) {
      resolvedInputs[key] = resolveExpression(expr, ctx);
    }
  }
  if (operation.inputSchema?.length) {
    for (const field of operation.inputSchema) {
      if (resolvedInputs[field.key] === undefined && field.default !== undefined) {
        resolvedInputs[field.key] = field.default;
      }
    }
  }

  if (credential) {
    ctx.set("credential", credential);
  }
  ctx.set("_inputs", resolvedInputs);

  const effectiveMode: ExecutionMode =
    type === "webhook" ? "live" : mode === "live" && credential ? "live" : "mock";

  const stripeAgentParams =
    type === "stripe_agent" && credential
      ? {
          apiKey: credential.apiKey ?? credential.secretKey ?? "",
          operationId: operation?.id ?? operationId ?? "createPaymentIntent",
          resolvedInputs,
        }
      : undefined;

  const language = (stepConfig.language ?? baseConfig.language ?? "javascript") as string;

  return dispatchExecutor(type, effectiveMode, {
    webhookPassthrough: type === "webhook"
      ? gatherInputsFromContext(node.id, ctx)
      : undefined,
    httpParams: type === "http" ? {
      template: { baseConfig },
      operation,
      resolvedInputs,
      credential,
    } : undefined,
    mcpParams: type === "mcp_tool" ? {
      mcpServerConfig: {
        transport: baseConfig.transport ?? "stdio",
        command: baseConfig.command,
        args: baseConfig.args,
        url: baseConfig.url,
        env: baseConfig.env,
      },
      toolName: operation.toolName || "default",
      arguments: resolvedInputs,
    } : undefined,
    codeParams: type === "code" ? {
      code: operation.codeTemplate ?? "",
      ctx: ctx.toJSON(),
      language,
    } : undefined,
    kafkaParams: type === "kafka" ? {
      brokers: baseConfig.brokers,
      topic: baseConfig.topic ?? resolvedInputs.topic,
      groupId: baseConfig.groupId ?? resolvedInputs.groupId,
      ...resolvedInputs,
    } : undefined,
    stripeAgentParams,
    mockConfig,
    operationId: "default",
  }, ctx);
}
