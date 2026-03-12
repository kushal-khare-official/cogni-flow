import type { Node, Edge } from "@xyflow/react";

export enum BpmnNodeType {
  // Events
  StartEvent = "startEvent",
  EndEvent = "endEvent",
  IntermediateEvent = "intermediateEvent",
  TimerEvent = "timerEvent",
  ErrorEvent = "errorEvent",

  // Tasks
  ServiceTask = "serviceTask",
  UserTask = "userTask",
  ScriptTask = "scriptTask",
  SendTask = "sendTask",
  ReceiveTask = "receiveTask",

  // Gateways
  ExclusiveGateway = "exclusiveGateway",
  ParallelGateway = "parallelGateway",
  InclusiveGateway = "inclusiveGateway",

  // Connectors
  KafkaConnector = "kafkaConnector",
  PostgresConnector = "postgresConnector",
  StripeConnector = "stripeConnector",
  SalesforceConnector = "salesforceConnector",
  SAPConnector = "sapConnector",
  KeycloakConnector = "keycloakConnector",
  PrometheusConnector = "prometheusConnector",
  RPAConnector = "rpaConnector",

  // Logic
  Loop = "loop",
  Wait = "wait",
  SplitPath = "splitPath",

  // Actions
  SendEmail = "sendEmail",
  HumanReview = "humanReview",
  UpdateDB = "updateDB",
}

export type PaletteCategory =
  | "events"
  | "tasks"
  | "gateways"
  | "connectors"
  | "logic"
  | "actions";

export interface BpmnNodeData {
  label: string;
  bpmnType: BpmnNodeType;
  description?: string;
  config?: Record<string, unknown>;
  // Gateway-specific
  conditions?: { edgeId: string; expression: string }[];
  // Connector-specific
  connectorType?: string;
  connectorConfig?: Record<string, unknown>;
  // Task-specific
  threshold?: number;
  confidenceScore?: number;
  inputFeatures?: string[];
  // Execution trace state
  executionStatus?: "idle" | "running" | "completed" | "error";
  executionOutput?: unknown;
  [key: string]: unknown;
}

export type BpmnNode = Node<BpmnNodeData>;
export type BpmnEdge = Edge & {
  data?: {
    label?: string;
    condition?: string;
    animated?: boolean;
  };
};

export interface ExecutionTraceStep {
  nodeId: string;
  timestamp: number;
  input: unknown;
  output: unknown;
  decision?: string;
  duration: number;
}

export interface ValidationResult {
  id: string;
  inputs: Record<string, unknown>;
  trace: ExecutionTraceStep[];
  result: "pass" | "fail" | "error";
  error?: string;
  coveragePercent: number;
  branchesHit: string[];
}

export interface WorkflowState {
  id: string | null;
  name: string;
  description: string;
  status: "draft" | "shadow" | "live";
  nodes: BpmnNode[];
  edges: BpmnEdge[];
  selectedNodeId: string | null;
}

export const NODE_TYPE_CATEGORIES: Record<PaletteCategory, BpmnNodeType[]> = {
  events: [
    BpmnNodeType.StartEvent,
    BpmnNodeType.EndEvent,
    BpmnNodeType.IntermediateEvent,
    BpmnNodeType.TimerEvent,
    BpmnNodeType.ErrorEvent,
  ],
  tasks: [
    BpmnNodeType.ServiceTask,
    BpmnNodeType.UserTask,
    BpmnNodeType.ScriptTask,
    BpmnNodeType.SendTask,
    BpmnNodeType.ReceiveTask,
  ],
  gateways: [
    BpmnNodeType.ExclusiveGateway,
    BpmnNodeType.ParallelGateway,
    BpmnNodeType.InclusiveGateway,
  ],
  connectors: [
    BpmnNodeType.KafkaConnector,
    BpmnNodeType.PostgresConnector,
    BpmnNodeType.StripeConnector,
    BpmnNodeType.SalesforceConnector,
    BpmnNodeType.SAPConnector,
    BpmnNodeType.KeycloakConnector,
    BpmnNodeType.PrometheusConnector,
    BpmnNodeType.RPAConnector,
  ],
  logic: [BpmnNodeType.Loop, BpmnNodeType.Wait, BpmnNodeType.SplitPath],
  actions: [
    BpmnNodeType.SendEmail,
    BpmnNodeType.HumanReview,
    BpmnNodeType.UpdateDB,
  ],
};

export const NODE_TYPE_LABELS: Record<BpmnNodeType, string> = {
  [BpmnNodeType.StartEvent]: "Start Event",
  [BpmnNodeType.EndEvent]: "End Event",
  [BpmnNodeType.IntermediateEvent]: "Intermediate Event",
  [BpmnNodeType.TimerEvent]: "Timer Event",
  [BpmnNodeType.ErrorEvent]: "Error Event",
  [BpmnNodeType.ServiceTask]: "Service Task",
  [BpmnNodeType.UserTask]: "User Task",
  [BpmnNodeType.ScriptTask]: "Script Task",
  [BpmnNodeType.SendTask]: "Send Task",
  [BpmnNodeType.ReceiveTask]: "Receive Task",
  [BpmnNodeType.ExclusiveGateway]: "Exclusive Gateway",
  [BpmnNodeType.ParallelGateway]: "Parallel Gateway",
  [BpmnNodeType.InclusiveGateway]: "Inclusive Gateway",
  [BpmnNodeType.KafkaConnector]: "Kafka",
  [BpmnNodeType.PostgresConnector]: "PostgreSQL",
  [BpmnNodeType.StripeConnector]: "Stripe",
  [BpmnNodeType.SalesforceConnector]: "Salesforce",
  [BpmnNodeType.SAPConnector]: "SAP ERP",
  [BpmnNodeType.KeycloakConnector]: "Keycloak",
  [BpmnNodeType.PrometheusConnector]: "Prometheus",
  [BpmnNodeType.RPAConnector]: "RPA Bot",
  [BpmnNodeType.Loop]: "Loop",
  [BpmnNodeType.Wait]: "Wait",
  [BpmnNodeType.SplitPath]: "Split Path",
  [BpmnNodeType.SendEmail]: "Send Email",
  [BpmnNodeType.HumanReview]: "Human Review",
  [BpmnNodeType.UpdateDB]: "Update DB",
};

export const CATEGORY_LABELS: Record<PaletteCategory, string> = {
  events: "Events",
  tasks: "Tasks",
  gateways: "Gateways",
  connectors: "Connectors",
  logic: "Logic",
  actions: "Actions",
};

export function getNodeCategory(type: BpmnNodeType): PaletteCategory {
  for (const [cat, types] of Object.entries(NODE_TYPE_CATEGORIES)) {
    if (types.includes(type)) return cat as PaletteCategory;
  }
  return "tasks";
}

export function getReactFlowNodeType(bpmnType: BpmnNodeType): string {
  const category = getNodeCategory(bpmnType);
  const map: Record<PaletteCategory, string> = {
    events:
      bpmnType === BpmnNodeType.StartEvent
        ? "startEventNode"
        : bpmnType === BpmnNodeType.EndEvent
          ? "endEventNode"
          : "eventNode",
    tasks: "taskNode",
    gateways: "gatewayNode",
    connectors: "connectorNode",
    logic: "logicNode",
    actions: "actionNode",
  };
  return map[category];
}
