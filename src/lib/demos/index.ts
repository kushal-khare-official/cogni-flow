import agentOnboarding from "./agent-onboarding.json";
import agenticPayment from "./agentic-payment.json";
import virtualCardBudget from "./virtual-card-budget.json";
import meteredBilling from "./metered-billing.json";

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
    id: "agentic-payment",
    name: (agenticPayment as { name: string }).name,
    description: (agenticPayment as { description: string }).description,
    nodes: (agenticPayment as { nodes: unknown[] }).nodes,
    edges: (agenticPayment as { edges: unknown[] }).edges,
    requiredIntegrationIds: getRequiredIntegrationIds((agenticPayment as { nodes: unknown[] }).nodes),
  },
  {
    id: "virtual-card-budget",
    name: (virtualCardBudget as { name: string }).name,
    description: (virtualCardBudget as { description: string }).description,
    nodes: (virtualCardBudget as { nodes: unknown[] }).nodes,
    edges: (virtualCardBudget as { edges: unknown[] }).edges,
    requiredIntegrationIds: getRequiredIntegrationIds((virtualCardBudget as { nodes: unknown[] }).nodes),
  },
  {
    id: "metered-billing",
    name: (meteredBilling as { name: string }).name,
    description: (meteredBilling as { description: string }).description,
    nodes: (meteredBilling as { nodes: unknown[] }).nodes,
    edges: (meteredBilling as { edges: unknown[] }).edges,
    requiredIntegrationIds: getRequiredIntegrationIds((meteredBilling as { nodes: unknown[] }).nodes),
  },
];
