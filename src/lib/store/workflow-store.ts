import { create } from "zustand";
import type { BpmnNode, BpmnEdge, BpmnNodeData } from "@/lib/workflow/types";
import { BpmnNodeType, getReactFlowNodeType, NODE_TYPE_LABELS } from "@/lib/workflow/types";
import {
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from "@xyflow/react";
import { v4 as uuidv4 } from "uuid";

/** Migrate legacy integration nodes to serviceTask with integrationId/stepConfig; drop integrationTemplateId/operationId */
function normalizeNodes(nodes: BpmnNode[]): BpmnNode[] {
  return nodes.map((n) => {
    const d = n.data as Record<string, unknown>;
    const isLegacyIntegration = d.bpmnType === "integration";
    const hasLegacyIds = d.integrationTemplateId != null || d.operationId != null;
    if (isLegacyIntegration) {
      const { integrationTemplateId, operationId, ...rest } = d;
      return {
        ...n,
        type: "taskNode",
        data: {
          ...rest,
          bpmnType: BpmnNodeType.ServiceTask,
          integrationId: undefined,
          stepConfig: d.stepConfig ?? {},
        },
      } as BpmnNode;
    }
    if (hasLegacyIds) {
      const { integrationTemplateId, operationId, ...rest } = d;
      return {
        ...n,
        data: {
          ...rest,
          integrationId: undefined,
          stepConfig: d.stepConfig ?? {},
        },
      } as BpmnNode;
    }
    return n;
  });
}

interface HistoryEntry {
  nodes: BpmnNode[];
  edges: BpmnEdge[];
}

interface WorkflowStore {
  id: string | null;
  name: string;
  description: string;
  status: "draft" | "shadow" | "live";
  nodes: BpmnNode[];
  edges: BpmnEdge[];
  selectedNodeId: string | null;

  history: HistoryEntry[];
  historyIndex: number;

  setWorkflow: (data: {
    id?: string;
    name?: string;
    description?: string;
    status?: "draft" | "shadow" | "live";
    nodes?: BpmnNode[];
    edges?: BpmnEdge[];
  }) => void;
  setName: (name: string) => void;
  setStatus: (status: "draft" | "shadow" | "live") => void;
  setNodes: (nodes: BpmnNode[]) => void;
  setEdges: (edges: BpmnEdge[]) => void;
  onNodesChange: (changes: NodeChange<BpmnNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<BpmnEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (bpmnType: BpmnNodeType, position: { x: number; y: number }) => void;
  updateNodeData: (nodeId: string, data: Partial<BpmnNodeData>) => void;
  deleteNode: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  clearWorkflow: () => void;
}

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  id: null,
  name: "Untitled Workflow",
  description: "",
  status: "draft",
  nodes: [],
  edges: [],
  selectedNodeId: null,
  history: [],
  historyIndex: -1,

  setWorkflow: (data) =>
    set((state) => ({
      ...state,
      ...data,
      nodes: data.nodes ? normalizeNodes(data.nodes) : state.nodes,
    })),

  setName: (name) => set({ name }),
  setStatus: (status) => set({ status }),

  setNodes: (nodes) => {
    get().pushHistory();
    set({ nodes: normalizeNodes(nodes) });
  },

  setEdges: (edges) => {
    get().pushHistory();
    set({ edges });
  },

  onNodesChange: (changes) =>
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
    })),

  onEdgesChange: (changes) =>
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    })),

  onConnect: (connection) => {
    get().pushHistory();
    const edge: BpmnEdge = {
      id: `e-${connection.source}-${connection.target}-${uuidv4().slice(0, 8)}`,
      source: connection.source!,
      target: connection.target!,
      sourceHandle: connection.sourceHandle ?? undefined,
      targetHandle: connection.targetHandle ?? undefined,
      type: "conditional",
    };
    set((state) => ({ edges: [...state.edges, edge] }));
  },

  addNode: (bpmnType, position) => {
    get().pushHistory();
    const id = `node-${uuidv4().slice(0, 8)}`;
    const node: BpmnNode = {
      id,
      type: getReactFlowNodeType(bpmnType),
      position,
      data: {
        label: NODE_TYPE_LABELS[bpmnType],
        bpmnType,
      },
    };
    set((state) => ({ nodes: [...state.nodes, node] }));
  },

  updateNodeData: (nodeId, data) => {
    get().pushHistory();
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
      ),
    }));
  },

  deleteNode: (nodeId) => {
    get().pushHistory();
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      ),
      selectedNodeId:
        state.selectedNodeId === nodeId ? null : state.selectedNodeId,
    }));
  },

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  pushHistory: () =>
    set((state) => {
      const entry: HistoryEntry = {
        nodes: JSON.parse(JSON.stringify(state.nodes)),
        edges: JSON.parse(JSON.stringify(state.edges)),
      };
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(entry);
      if (newHistory.length > 50) newHistory.shift();
      return { history: newHistory, historyIndex: newHistory.length - 1 };
    }),

  undo: () =>
    set((state) => {
      if (state.historyIndex < 0) return state;
      const entry = state.history[state.historyIndex];
      return {
        nodes: entry.nodes,
        edges: entry.edges,
        historyIndex: state.historyIndex - 1,
      };
    }),

  redo: () =>
    set((state) => {
      if (state.historyIndex >= state.history.length - 1) return state;
      const entry = state.history[state.historyIndex + 1];
      return {
        nodes: entry.nodes,
        edges: entry.edges,
        historyIndex: state.historyIndex + 1,
      };
    }),

  clearWorkflow: () => {
    get().pushHistory();
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
    });
  },
}));
