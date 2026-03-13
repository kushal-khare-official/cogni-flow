import type { BpmnEdge } from "./types";
import { BpmnNodeType } from "./types";
import type { BpmnNode } from "./types";

/**
 * Detects the back-edge that leads from the last step in a loop body back to
 * the loop node itself. A back-edge is an incoming edge to the loop node
 * whose source is reachable from the loop node (i.e. it is downstream).
 * Returns `null` when no back-edge exists.
 */
export function findLoopBackEdge(
  loopNodeId: string,
  edges: BpmnEdge[],
): BpmnEdge | null {
  const outgoing = edges.filter((e) => e.source === loopNodeId);
  const downstreamTargets = new Set<string>();
  for (const e of outgoing) {
    collectReachable(e.target, loopNodeId, edges, downstreamTargets);
  }

  return (
    edges.find(
      (e) => e.target === loopNodeId && downstreamTargets.has(e.source),
    ) ?? null
  );
}

function collectReachable(
  from: string,
  avoid: string,
  edges: BpmnEdge[],
  visited: Set<string>,
): void {
  if (from === avoid || visited.has(from)) return;
  visited.add(from);
  for (const e of edges) {
    if (e.source === from) {
      collectReachable(e.target, avoid, edges, visited);
    }
  }
}

/**
 * Walk forward from a loop node along edges and return the ordered list of
 * node IDs that form the loop body — i.e. every node between the loop node
 * and the node whose outgoing edge points back to the loop.
 *
 * The "exit edge" is the outgoing edge from the loop node that does NOT lead
 * into the body (the one taken when the loop terminates). If the loop has
 * only one outgoing edge the body is assumed to start there.
 */
export function collectLoopBody(
  loopNodeId: string,
  nodes: BpmnNode[],
  edges: BpmnEdge[],
): string[] {
  const backEdge = findLoopBackEdge(loopNodeId, edges);
  if (!backEdge) return [];

  const backSourceId = backEdge.source;

  const outgoing = edges.filter((e) => e.source === loopNodeId);
  const bodyEntryEdge = outgoing.find((e) => {
    const reachesBack = canReach(e.target, backSourceId, loopNodeId, edges, new Set());
    return reachesBack;
  });

  if (!bodyEntryEdge) return [];

  const body: string[] = [];
  const visited = new Set<string>();
  let current: string | null = bodyEntryEdge.target;

  while (current && !visited.has(current) && current !== loopNodeId) {
    visited.add(current);
    body.push(current);
    if (current === backSourceId) break;
    const cur: string = current;
    const next: BpmnEdge[] = edges.filter((e) => e.source === cur && e.target !== loopNodeId);
    current = next.length > 0 ? next[0].target : null;
  }

  return body;
}

/**
 * Identifies the last node in the loop body — the one whose outgoing edge
 * points back to the loop node.
 */
export function findLastStepInLoop(
  loopNodeId: string,
  edges: BpmnEdge[],
): string | null {
  const backEdge = findLoopBackEdge(loopNodeId, edges);
  return backEdge?.source ?? null;
}

/**
 * Returns the "exit" edge — the outgoing edge from the loop node that is
 * taken when the loop terminates (i.e. NOT the edge into the body).
 */
export function findLoopExitEdge(
  loopNodeId: string,
  nodes: BpmnNode[],
  edges: BpmnEdge[],
): BpmnEdge | null {
  const backEdge = findLoopBackEdge(loopNodeId, edges);
  if (!backEdge) return null;

  const backSourceId = backEdge.source;
  const outgoing = edges.filter((e) => e.source === loopNodeId);

  for (const edge of outgoing) {
    const reachesBack = canReach(edge.target, backSourceId, loopNodeId, edges, new Set());
    if (!reachesBack) return edge;
  }

  return null;
}

function canReach(
  from: string,
  target: string,
  avoid: string,
  edges: BpmnEdge[],
  visited: Set<string>,
): boolean {
  if (from === target) return true;
  if (from === avoid || visited.has(from)) return false;
  visited.add(from);
  const next = edges.filter((e) => e.source === from);
  return next.some((e) => canReach(e.target, target, avoid, edges, visited));
}

const DEFAULT_MAX_ITERATIONS = 10;

/**
 * Read the max-iterations config from a loop node, falling back to 10.
 */
export function getLoopMaxIterations(node: BpmnNode): number {
  const cfg = node.data.config as Record<string, unknown> | undefined;
  const val = cfg?.maxIterations;
  if (typeof val === "number" && val > 0) return val;
  return DEFAULT_MAX_ITERATIONS;
}

/**
 * Evaluate whether the loop should continue.
 * Returns `true` if the loop should execute another iteration.
 *
 * For the simulation engine (no ExecutionContext), we use a simple
 * iteration-count check.
 */
export function shouldLoopContinue(
  node: BpmnNode,
  iteration: number,
): boolean {
  return iteration < getLoopMaxIterations(node);
}
