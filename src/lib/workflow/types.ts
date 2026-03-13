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

  // Integration (data-driven, references an integration record in DB)
  Integration = "integration",

  // Triggers
  WebhookTrigger = "webhookTrigger",

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
  | "integrations"
  | "logic"
  | "actions";

export interface BpmnNodeData {
  label: string;
  bpmnType: BpmnNodeType;
  description?: string;
  config?: Record<string, unknown>;
  // Gateway-specific
  conditions?: { edgeId: string; expression: string }[];
  // Integration-specific (data-driven, references DB templates)
  integrationTemplateId?: string;
  operationId?: string;
  credentialId?: string;
  inputMapping?: Record<string, string>;
  // Code-specific
  code?: string;
  // Step I/O contract
  expectedInputs?: { key: string; type: string; description?: string }[];
  expectedOutputs?: { key: string; type: string; description?: string }[];
  // Task-specific
  threshold?: number;
  confidenceScore?: number;
  inputFeatures?: string[];
  // Webhook-specific
  webhookPath?: string;
  // Execution trace state
  executionStatus?: "idle" | "running" | "completed" | "error";
  executionInput?: unknown;
  executionOutput?: unknown;
  executionCount?: number;
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
  integrations: [
    BpmnNodeType.Integration,
    BpmnNodeType.WebhookTrigger,
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
  [BpmnNodeType.Integration]: "Integration",
  [BpmnNodeType.WebhookTrigger]: "Webhook Trigger",
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
  integrations: "Integrations",
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
    integrations:
      bpmnType === BpmnNodeType.WebhookTrigger
        ? "webhookTriggerNode"
        : "integrationNode",
    logic: "logicNode",
    actions: "actionNode",
  };
  return map[category];
}
