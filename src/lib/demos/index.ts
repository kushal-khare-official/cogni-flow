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
}

export const DEMOS: DemoWorkflow[] = [
  {
    id: "agent-onboarding",
    name: (agentOnboarding as { name: string }).name,
    description: (agentOnboarding as { description: string }).description,
    nodes: (agentOnboarding as { nodes: unknown[] }).nodes,
    edges: (agentOnboarding as { edges: unknown[] }).edges,
  },
  {
    id: "agentic-payment",
    name: (agenticPayment as { name: string }).name,
    description: (agenticPayment as { description: string }).description,
    nodes: (agenticPayment as { nodes: unknown[] }).nodes,
    edges: (agenticPayment as { edges: unknown[] }).edges,
  },
  {
    id: "virtual-card-budget",
    name: (virtualCardBudget as { name: string }).name,
    description: (virtualCardBudget as { description: string }).description,
    nodes: (virtualCardBudget as { nodes: unknown[] }).nodes,
    edges: (virtualCardBudget as { edges: unknown[] }).edges,
  },
  {
    id: "metered-billing",
    name: (meteredBilling as { name: string }).name,
    description: (meteredBilling as { description: string }).description,
    nodes: (meteredBilling as { nodes: unknown[] }).nodes,
    edges: (meteredBilling as { edges: unknown[] }).edges,
  },
];
