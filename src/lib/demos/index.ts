import agentOnboarding from "./agent-onboarding.json";
import agentCapturePayment from "./agent-capture-payment.json";

export interface DemoWorkflow {
  id: string;
  name: string;
  description: string;
  nodes: unknown[];
  edges: unknown[];
  requiredIntegrationIds: string[];
}

/** Collect unique integration template IDs from workflow nodes (data.integrationTemplateId). */
export function getRequiredIntegrationIds(nodes: unknown[]): string[] {
  const ids = new Set<string>();
  for (const node of nodes) {
    const data = (node as { data?: { integrationTemplateId?: string } })?.data;
    const tid = data?.integrationTemplateId;
    if (typeof tid === "string" && tid) ids.add(tid);
  }
  return Array.from(ids);
}

export const DEMOS: DemoWorkflow[] = [
  {
    id: "agent-onboarding",
    name: (agentOnboarding as { name: string }).name,
    description: (agentOnboarding as { description: string }).description,
    nodes: (agentOnboarding as { nodes: unknown[] }).nodes,
    edges: (agentOnboarding as { edges: unknown[] }).edges,
    requiredIntegrationIds: getRequiredIntegrationIds((agentOnboarding as { nodes: unknown[] }).nodes),
  },
  {
    id: "agent-capture-payment",
    name: (agentCapturePayment as { name: string }).name,
    description: (agentCapturePayment as { description: string }).description,
    nodes: (agentCapturePayment as { nodes: unknown[] }).nodes,
    edges: (agentCapturePayment as { edges: unknown[] }).edges,
    requiredIntegrationIds: getRequiredIntegrationIds((agentCapturePayment as { nodes: unknown[] }).nodes),
  },
];
