"use client";

import { useCallback, useRef, type DragEvent, type KeyboardEvent } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useWorkflowStore } from "@/lib/store/workflow-store";
import { useUIStore } from "@/lib/store/ui-store";
import { useValidationStore } from "@/components/validation/validation-store";
import { BpmnNodeType } from "@/lib/workflow/types";
import { useExecutionTrace } from "@/components/validation/useExecutionTrace";

import { StartEventNode } from "./nodes/StartEventNode";
import { EndEventNode } from "./nodes/EndEventNode";
import { EventNode } from "./nodes/EventNode";
import { TaskNode } from "./nodes/TaskNode";
import { GatewayNode } from "./nodes/GatewayNode";
import { WebhookTriggerNode } from "./nodes/WebhookTriggerNode";
import { LogicNode } from "./nodes/LogicNode";
import { ActionNode } from "./nodes/ActionNode";
import { ConditionalEdge } from "./edges/ConditionalEdge";

const nodeTypes: NodeTypes = {
  startEventNode: StartEventNode,
  endEventNode: EndEventNode,
  eventNode: EventNode,
  taskNode: TaskNode,
  gatewayNode: GatewayNode,
  webhookTriggerNode: WebhookTriggerNode,
  logicNode: LogicNode,
  actionNode: ActionNode,
};

const edgeTypes: EdgeTypes = {
  conditional: ConditionalEdge,
};

const SNAP_GRID: [number, number] = [15, 15];

function WorkflowCanvasInner() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const activeTraceId = useUIStore((s) => s.activeTraceId);
  const validationResults = useValidationStore((s) => s.results);
  useExecutionTrace(validationResults, activeTraceId);

  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const onNodesChange = useWorkflowStore((s) => s.onNodesChange);
  const onEdgesChange = useWorkflowStore((s) => s.onEdgesChange);
  const onConnect = useWorkflowStore((s) => s.onConnect);
  const addNode = useWorkflowStore((s) => s.addNode);
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const deleteNode = useWorkflowStore((s) => s.deleteNode);
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const bpmnType = event.dataTransfer.getData(
        "application/cogniflow-node"
      ) as BpmnNodeType;

      if (!bpmnType) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(bpmnType, position);
    },
    [screenToFlowPosition, addNode]
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selectedNodeId
      ) {
        deleteNode(selectedNodeId);
      }
    },
    [selectedNodeId, deleteNode]
  );

  return (
    <div
      ref={reactFlowWrapper}
      className="h-full w-full"
      onKeyDown={onKeyDown}
      tabIndex={0}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={(_, node) => selectNode(node.id)}
        onPaneClick={() => selectNode(null)}
        fitView
        snapToGrid
        snapGrid={SNAP_GRID}
        deleteKeyCode={null}
        className="bg-slate-50"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls className="rounded-lg border border-slate-200 bg-white shadow-sm" />
        <MiniMap
          className="rounded-lg border border-slate-200 !bg-white shadow-sm"
          maskColor="rgba(241, 245, 249, 0.7)"
          nodeStrokeWidth={3}
        />
      </ReactFlow>
    </div>
  );
}

export function WorkflowCanvas() {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner />
    </ReactFlowProvider>
  );
}
