import { z } from "zod";

const reactFlowNodeTypes = [
  "startEventNode",
  "endEventNode",
  "eventNode",
  "taskNode",
  "gatewayNode",
  "integrationNode",
  "webhookTriggerNode",
  "logicNode",
  "actionNode",
] as const;

const bpmnNodeTypes = [
  "startEvent",
  "endEvent",
  "intermediateEvent",
  "timerEvent",
  "errorEvent",
  "serviceTask",
  "userTask",
  "scriptTask",
  "sendTask",
  "receiveTask",
  "exclusiveGateway",
  "parallelGateway",
  "inclusiveGateway",
  "integration",
  "webhookTrigger",
  "loop",
  "wait",
  "splitPath",
  "sendEmail",
  "humanReview",
  "updateDB",
] as const;

const bpmnNodeSchema = z.object({
  id: z.string().describe("Unique node id, e.g. node-1, node-2"),
  type: z.enum(reactFlowNodeTypes).describe("React Flow custom node type"),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: z.object({
    label: z.string(),
    bpmnType: z.enum(bpmnNodeTypes).describe("BPMN node type from the palette"),
    description: z.string().nullable().describe("Optional description"),
    config: z
      .record(z.string(), z.any())
      .nullable()
      .describe(
        "Configuration object. Use this for loop maxIterations, start-event requestBodySchema, and end-event responseWebhookUrl.",
      ),
    conditions: z
      .array(
        z.object({
          edgeId: z.string(),
          expression: z.string(),
        }),
      )
      .nullable()
      .describe("Gateway condition mappings for outgoing edges"),
    integrationTemplateId: z.string().nullable().describe("Existing integration ID, or null if creating a new one via newIntegration"),
    operationId: z.string().nullable().describe("Operation ID from the integration"),
    newIntegration: z.object({
      name: z.string().describe("Name for the new integration"),
      type: z.enum(["http", "webhook", "mcp_tool", "code", "kafka"]).describe("Integration type"),
      category: z.string().describe("Category label, e.g. api, messaging, ai, code, custom"),
      description: z.string().describe("Brief description of what this integration does"),
      baseConfig: z.array(z.object({ key: z.string(), value: z.string() })).describe("Base configuration key-value pairs (e.g. baseUrl, brokers, topic)"),
    }).nullable().describe("Define a new integration if no existing one fits"),
  }),
});

const bpmnEdgeSchema = z.object({
  id: z.string().describe("Edge id in the format e-{sourceId}-{targetId}"),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().nullable(),
  targetHandle: z.string().nullable(),
  type: z.literal("conditional"),
  data: z
    .object({
      label: z.string().nullable(),
      condition: z.string().nullable(),
    })
    .nullable(),
});

export const bpmnWorkflowSchema = z.object({
  nodes: z.array(bpmnNodeSchema),
  edges: z.array(bpmnEdgeSchema),
});

export type BpmnWorkflowOutput = z.infer<typeof bpmnWorkflowSchema>;
