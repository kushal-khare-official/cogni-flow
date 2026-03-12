import { z } from "zod";

const reactFlowNodeTypes = [
  "startEventNode",
  "endEventNode",
  "eventNode",
  "taskNode",
  "gatewayNode",
  "connectorNode",
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
  "kafkaConnector",
  "postgresConnector",
  "stripeConnector",
  "salesforceConnector",
  "sapConnector",
  "keycloakConnector",
  "prometheusConnector",
  "rpaConnector",
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
    config: z.array(z.object({ key: z.string(), value: z.string() })).nullable().describe("Configuration as key-value pairs"),
    conditions: z
      .array(
        z.object({
          edgeId: z.string(),
          expression: z.string(),
        }),
      )
      .nullable()
      .describe("Gateway condition mappings for outgoing edges"),
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
