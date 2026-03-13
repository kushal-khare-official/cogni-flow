/**
 * Client for workflow CRUD operations (localStorage-backed).
 */

const STORAGE_KEY = "cogni-flow-workflows";

export interface WorkflowSummary {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowPayload {
  name?: string;
  description?: string;
  status?: string;
  nodes?: unknown[];
  edges?: unknown[];
}

export interface WorkflowFull extends WorkflowSummary {
  description: string;
  nodes: unknown[];
  edges: unknown[];
}

interface StoredWorkflow {
  id: string;
  name: string;
  description: string;
  status: string;
  nodes: unknown[];
  edges: unknown[];
  createdAt: string;
  updatedAt: string;
}

function getStorage(): StoredWorkflow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as StoredWorkflow[]) : [];
  } catch {
    return [];
  }
}

function setStorage(workflows: StoredWorkflow[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
}

function toSummary(w: StoredWorkflow): WorkflowSummary {
  return {
    id: w.id,
    name: w.name,
    status: w.status,
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
  };
}

function toFull(w: StoredWorkflow): WorkflowFull {
  return {
    ...toSummary(w),
    description: w.description,
    nodes: w.nodes,
    edges: w.edges,
  };
}

export function fetchWorkflows(): WorkflowSummary[] {
  const list = getStorage();
  return list
    .map(toSummary)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
}

export function fetchWorkflow(id: string): WorkflowFull | null {
  const list = getStorage();
  const w = list.find((x) => x.id === id);
  return w ? toFull(w) : null;
}

export function createWorkflow(payload: WorkflowPayload): WorkflowFull {
  if (typeof window === "undefined") {
    throw new Error("localStorage is not available");
  }
  const now = new Date().toISOString();
  const workflow: StoredWorkflow = {
    id: crypto.randomUUID(),
    name: payload.name ?? "Untitled Workflow",
    description: payload.description ?? "",
    status: payload.status ?? "draft",
    nodes: payload.nodes ?? [],
    edges: payload.edges ?? [],
    createdAt: now,
    updatedAt: now,
  };
  const list = getStorage();
  list.push(workflow);
  setStorage(list);
  return toFull(workflow);
}

export function updateWorkflow(
  id: string,
  payload: WorkflowPayload
): WorkflowFull {
  if (typeof window === "undefined") {
    throw new Error("localStorage is not available");
  }
  const list = getStorage();
  const idx = list.findIndex((x) => x.id === id);
  if (idx === -1) throw new Error("Workflow not found");
  const existing = list[idx];
  const updated: StoredWorkflow = {
    ...existing,
    ...(payload.name !== undefined && { name: payload.name }),
    ...(payload.description !== undefined && {
      description: payload.description,
    }),
    ...(payload.status !== undefined && { status: payload.status }),
    ...(payload.nodes !== undefined && { nodes: payload.nodes }),
    ...(payload.edges !== undefined && { edges: payload.edges }),
    updatedAt: new Date().toISOString(),
  };
  list[idx] = updated;
  setStorage(list);
  return toFull(updated);
}

export function deleteWorkflow(id: string): void {
  if (typeof window === "undefined") return;
  const list = getStorage().filter((x) => x.id !== id);
  setStorage(list);
}

export interface PublishOptions {
  mode: "shadow" | "live";
  name?: string;
}

export function publishWorkflow(
  id: string,
  options: PublishOptions
): WorkflowFull {
  const list = getStorage();
  const idx = list.findIndex((x) => x.id === id);
  if (idx === -1) throw new Error("Workflow not found");
  const existing = list[idx];
  const updated: StoredWorkflow = {
    ...existing,
    status: options.mode,
    ...(options.name !== undefined && { name: options.name }),
    updatedAt: new Date().toISOString(),
  };
  list[idx] = updated;
  setStorage(list);
  return toFull(updated);
}
