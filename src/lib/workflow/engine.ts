import type { BpmnNode, BpmnEdge, ExecutionTraceStep } from "./types";
import { BpmnNodeType } from "./types";
import {
  findLoopBackEdge,
  collectLoopBody,
  findLoopExitEdge,
  shouldLoopContinue,
} from "./loop-utils";

const TASK_TYPES = new Set<string>([
  BpmnNodeType.ServiceTask,
  BpmnNodeType.UserTask,
  BpmnNodeType.ScriptTask,
  BpmnNodeType.SendTask,
  BpmnNodeType.ReceiveTask,
]);

const MAX_STEPS = 200;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function outgoingEdges(nodeId: string, edges: BpmnEdge[]): BpmnEdge[] {
  return edges.filter((e) => e.source === nodeId);
}

export async function simulateWorkflow(
  nodes: BpmnNode[],
  edges: BpmnEdge[],
  input: Record<string, unknown>,
): Promise<ExecutionTraceStep[]> {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const trace: ExecutionTraceStep[] = [];

  const startNode = nodes.find(
    (n) => n.data.bpmnType === BpmnNodeType.StartEvent || n.data.bpmnType === BpmnNodeType.WebhookTrigger
  );
  if (!startNode) {
    throw new Error("Workflow has no start event");
  }

  let currentNodeId: string | null = startNode.id;
  let currentInput: Record<string, unknown> = { ...input };

  for (let step = 0; step < MAX_STEPS && currentNodeId; step++) {
    const node = nodeMap.get(currentNodeId);
    if (!node) break;

    const startTime = Date.now();
    const bpmnType = node.data.bpmnType;
    let output: Record<string, unknown> = {};
    let decision: string | undefined;

    if (bpmnType === BpmnNodeType.StartEvent || bpmnType === BpmnNodeType.WebhookTrigger) {
      output = { ...currentInput };
    } else if (bpmnType === BpmnNodeType.EndEvent) {
      output = { ...currentInput };
      trace.push({
        nodeId: currentNodeId,
        timestamp: startTime,
        input: currentInput,
        output,
        duration: Date.now() - startTime,
      });
      break;
    } else if (TASK_TYPES.has(bpmnType)) {
      await delay(Math.floor(Math.random() * 40) + 10);
      output = { ...currentInput, [node.data.label]: "processed" };
    } else if (bpmnType === BpmnNodeType.ExclusiveGateway) {
      const out = outgoingEdges(currentNodeId, edges);
      const chosen = out[Math.floor(Math.random() * out.length)] ?? out[0];
      decision = chosen
        ? `Took branch → ${chosen.data?.label || chosen.target}`
        : "No outgoing edge";
      output = { ...currentInput };
    } else if (bpmnType === BpmnNodeType.ParallelGateway) {
      const out = outgoingEdges(currentNodeId, edges);
      decision = `Parallel split: ${out.length} branches (following first)`;
      output = { ...currentInput };
    } else if (bpmnType === BpmnNodeType.InclusiveGateway) {
      output = { ...currentInput };
      decision = "Inclusive merge — following first outgoing edge";
    } else if (bpmnType === BpmnNodeType.SendEmail) {
      output = { sent: true, to: currentInput.email || "user@example.com" };
    } else if (bpmnType === BpmnNodeType.HumanReview) {
      const approved = Math.random() > 0.3;
      output = { approved, reviewer: "John Doe" };
      decision = approved ? "Approved" : "Rejected";
    } else if (bpmnType === BpmnNodeType.UpdateDB) {
      output = { updated: true, rowsAffected: 1 };
    } else if (bpmnType === BpmnNodeType.Loop) {
      const iteration = (typeof currentInput.iteration === "number" ? currentInput.iteration : 0) + 1;
      const continuing = shouldLoopContinue(node, iteration);
      output = { ...currentInput, iteration, loopContinue: continuing };
      decision = continuing
        ? `Iteration ${iteration} — continuing`
        : `Iteration ${iteration} — loop finished`;
    } else if (bpmnType === BpmnNodeType.Wait) {
      await delay(100);
      output = { ...currentInput };
    } else if (bpmnType === BpmnNodeType.SplitPath) {
      const out = outgoingEdges(currentNodeId, edges);
      decision = `Split into ${out.length} paths (traversing first)`;
      output = { ...currentInput };
    } else if (bpmnType === BpmnNodeType.AgentGate) {
      const agentId = (node.data.config?.agentId as string) || (currentInput.agentId as string);
      if (!agentId) {
        output = { verified: false, error: "No agent ID provided" };
        decision = "agent_rejected";
      } else if (currentInput.agentStatus === "active") {
        output = { verified: true, agentId, fingerprint: `fp_${agentId}_${Date.now()}` };
        decision = "agent_verified";
      } else {
        output = { verified: false, error: `Agent not active: ${currentInput.agentStatus || "unknown"}` };
        decision = "agent_rejected";
      }
    } else if (bpmnType === BpmnNodeType.MandateCheck) {
      const amount = (currentInput.amount as number) || 0;
      const maxAmount = (node.data.config?.maxAmount as number) || 10000;
      if (currentInput.mandateApproved || amount < maxAmount) {
        output = { mandateValid: true, approvedAmount: amount };
        decision = "mandate_approved";
      } else {
        output = { mandateValid: false, violation: "Amount exceeds mandate limit" };
        decision = "mandate_rejected";
      }
    } else if (bpmnType === BpmnNodeType.BehaviorAudit) {
      const amount = (currentInput.amount as number) || 0;
      const riskScore = Math.min(100, (amount / 10000) * 50 + Math.random() * 20);
      if (riskScore > 80) {
        output = { riskScore, flagged: true, action: "auto_review" };
        decision = "behavior_flagged";
      } else {
        output = { riskScore, flagged: false, action: "cleared" };
        decision = "behavior_cleared";
      }
    } else {
      output = { ...currentInput };
    }

    trace.push({
      nodeId: currentNodeId,
      timestamp: startTime,
      input: currentInput,
      output,
      decision,
      duration: Date.now() - startTime,
    });

    const nextEdges = outgoingEdges(currentNodeId, edges);
    if (nextEdges.length === 0) {
      currentNodeId = null;
    } else if (bpmnType === BpmnNodeType.Loop) {
      const continuing = output.loopContinue as boolean;
      if (continuing) {
        const body = collectLoopBody(currentNodeId, nodes, edges);
        currentNodeId = body.length > 0 ? body[0] : nextEdges[0].target;
      } else {
        const exitEdge = findLoopExitEdge(currentNodeId, nodes, edges);
        currentNodeId = exitEdge ? exitEdge.target : nextEdges[0].target;
      }
    } else if (
      bpmnType === BpmnNodeType.ExclusiveGateway &&
      nextEdges.length > 1
    ) {
      const chosen = nextEdges[Math.floor(Math.random() * nextEdges.length)];
      currentNodeId = chosen.target;
    } else {
      const backEdge = findLoopBackEdge(currentNodeId, edges);
      if (backEdge && backEdge.source === currentNodeId) {
        currentNodeId = backEdge.target;
      } else {
        currentNodeId = nextEdges[0].target;
      }
    }

    currentInput = { ...output };
  }

  return trace;
}
