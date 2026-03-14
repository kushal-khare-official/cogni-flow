import crypto from "crypto";
import { prisma } from "@/lib/db";

interface CreateMandateInput {
  agentId: string;
  workflowId?: string;
  description?: string;
  maxTransactionAmount: number;
  maxDailyAmount: number;
  currency?: string;
  allowedMCCs?: string[];
  allowedOperations?: string[];
  allowedEndpoints?: string[];
  ttlSeconds?: number;
}

export async function createMandate(data: CreateMandateInput) {
  const ttl = data.ttlSeconds ?? 86400;
  const expiresAt = new Date(Date.now() + ttl * 1000);
  const maxAmountCents = Math.round((data.maxTransactionAmount ?? 0) * 100);
  const maxTotalSpendCents = Math.round((data.maxDailyAmount ?? 0) * 100);

  const terms = [
    data.agentId,
    data.workflowId ?? "",
    String(maxAmountCents),
    String(maxTotalSpendCents),
    JSON.stringify(data.allowedMCCs ?? []),
    JSON.stringify(data.allowedOperations ?? []),
    String(ttl),
  ].join("|");

  const signatureHash = crypto
    .createHash("sha256")
    .update(terms)
    .digest("hex");

  return prisma.agentMandate.create({
    data: {
      agentPassportId: data.agentId,
      workflowId: data.workflowId ?? null,
      description: data.description ?? "",
      maxAmountCents: Math.max(maxAmountCents, 5000),
      maxTotalSpendCents: Math.max(maxTotalSpendCents, 50000),
      allowedMCCs: JSON.stringify(data.allowedMCCs ?? []),
      allowedActions: JSON.stringify(data.allowedOperations ?? []),
      ttlSeconds: ttl,
      expiresAt,
      signatureHash,
      status: "active",
    },
  });
}

interface TransactionInput {
  amount: number;
  currency: string;
  mcc?: string;
  operation: string;
  endpoint?: string;
}

export async function validateTransaction(
  agentId: string,
  transaction: TransactionInput,
): Promise<{ allowed: boolean; mandateId?: string; violations: string[] }> {
  const violations: string[] = [];
  const amountCents = Math.round((transaction.amount ?? 0) * 100);

  const agent = await prisma.agentPassport.findUnique({
    where: { id: agentId },
  });
  if (!agent) return { allowed: false, violations: ["Agent not found"] };
  if (agent.status !== "active") {
    return {
      allowed: false,
      violations: [`Agent status is "${agent.status}", expected "active"`],
    };
  }

  const now = new Date();

  const mandates = await prisma.agentMandate.findMany({
    where: {
      agentPassportId: agentId,
      status: "active",
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
  });

  if (mandates.length === 0) {
    return { allowed: false, violations: ["No active mandates for this agent"] };
  }

  for (const mandate of mandates) {
    const mandateViolations: string[] = [];

    if (amountCents > mandate.maxAmountCents) {
      mandateViolations.push(
        `Amount ${transaction.amount} exceeds per-transaction limit ${mandate.maxAmountCents / 100}`,
      );
    }

    const totalAfter = mandate.spentCents + amountCents;
    if (totalAfter > mandate.maxTotalSpendCents) {
      mandateViolations.push(
        `Total spend ${totalAfter / 100} would exceed budget ${mandate.maxTotalSpendCents / 100}`,
      );
    }

    const allowedMCCs: string[] = JSON.parse(mandate.allowedMCCs);
    if (allowedMCCs.length > 0 && transaction.mcc) {
      if (!allowedMCCs.includes(transaction.mcc)) {
        mandateViolations.push(
          `MCC "${transaction.mcc}" not in allowed list [${allowedMCCs.join(", ")}]`,
        );
      }
    }

    const allowedOps: string[] = JSON.parse(mandate.allowedActions);
    if (allowedOps.length > 0) {
      if (!allowedOps.includes(transaction.operation)) {
        mandateViolations.push(
          `Operation "${transaction.operation}" not permitted`,
        );
      }
    }

    if (mandateViolations.length === 0) {
      return { allowed: true, mandateId: mandate.id, violations: [] };
    }

    violations.push(...mandateViolations.map((v) => `[${mandate.id}] ${v}`));
  }

  return { allowed: false, violations };
}

export async function revokeMandate(mandateId: string) {
  return prisma.agentMandate.update({
    where: { id: mandateId },
    data: { status: "revoked" },
  });
}

export async function getActiveMandates(agentId: string) {
  const now = new Date();
  return prisma.agentMandate.findMany({
    where: {
      agentPassportId: agentId,
      status: "active",
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
  });
}
