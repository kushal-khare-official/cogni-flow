import { z } from "zod";

const reactFlowNodeTypes = [
  "startEventNode",
  "endEventNode",
  "eventNode",
  "taskNode",
  "gatewayNode",
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
    stepName: z.string().describe("Human-readable step name for mapping; use empty string to use label."),
    description: z.string().describe("Optional description; use empty string if none"),
    config: z.array(z.object({ key: z.string(), value: z.string() })).describe("Configuration key-value pairs; use empty array if none"),
    conditions: z
      .array(
        z.object({
          edgeId: z.string(),
          expression: z.string(),
        }),
      )
      .describe("Gateway condition mappings; use empty array if not a gateway"),
    integrationId: z.string().describe("Integration ID for serviceTask; use empty string if none"),
    stepConfig: z.object({
      method: z.string().describe("HTTP method; use empty string if not HTTP"),
      path: z.string().describe("Path; use empty string if not HTTP"),
      bodyTemplate: z.string().describe("Request body as JSON string; use empty string if none"),
      toolName: z.string().describe("MCP tool name; use empty string if not MCP"),
      code: z.string().describe("Code for code steps; use empty string if not code"),
      language: z.string().describe("Language for code; use empty string if not code"),
    }).describe("Per-step config; use empty strings for unused fields. Required on every node."),
    newIntegration: z.object({
      name: z.string().describe("Name for new integration; use empty string if using existing integration"),
      type: z.enum(["http", "webhook", "mcp_tool", "code", "kafka"]).describe("Integration type"),
      category: z.string().describe("Category label, e.g. api, messaging, ai, code, custom"),
      description: z.string().describe("Brief description of what this integration does"),
      baseConfig: z.array(z.object({ key: z.string(), value: z.string() })).describe("Base configuration key-value pairs (e.g. baseUrl, brokers, topic)"),
    }).nullable().describe("Define a new integration if no existing one fits"),
    outputSchema: z.array(z.object({
      key: z.string().describe("Output field name this step produces"),
      type: z.string().describe("Field type, e.g. string, number, object; use empty string if omitted"),
      description: z.string().describe("Brief description of the field; use empty string if omitted"),
    })).describe("Output fields this step produces for downstream mapping; use empty array if none."),
    inputMapping: z.array(z.object({
      key: z.string().describe("Target field name for this node"),
      value: z.string().describe("Expression referencing a previous node output, e.g. {{node-1.fieldName}}, or a literal value"),
    })).describe("Input mapping; use empty array if none"),
    requestBody: z.array(z.object({
      key: z.string().describe("Field name"),
      type: z.enum(["string", "number", "boolean", "object", "array"]).describe("Field type"),
      required: z.boolean().describe("Whether the field is required"),
      description: z.string().describe("Brief description of the field"),
    })).nullable().describe("REST API request body schema (startEvent only)"),
    webhookUrl: z.string().nullable().describe("URL to POST workflow results to when complete (endEvent only)"),
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
