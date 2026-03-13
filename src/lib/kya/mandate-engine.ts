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

  const terms = [
    data.agentId,
    data.workflowId ?? "",
    String(data.maxTransactionAmount),
    String(data.maxDailyAmount),
    data.currency ?? "usd",
    JSON.stringify(data.allowedMCCs ?? []),
    JSON.stringify(data.allowedOperations ?? []),
    JSON.stringify(data.allowedEndpoints ?? []),
    String(ttl),
  ].join("|");

  const signatureHash = crypto
    .createHash("sha256")
    .update(terms)
    .digest("hex");

  return prisma.agentMandate.create({
    data: {
      agentId: data.agentId,
      workflowId: data.workflowId ?? null,
      description: data.description ?? "",
      maxTransactionAmount: data.maxTransactionAmount,
      maxDailyAmount: data.maxDailyAmount,
      currency: data.currency ?? "usd",
      allowedMCCs: JSON.stringify(data.allowedMCCs ?? []),
      allowedOperations: JSON.stringify(data.allowedOperations ?? []),
      allowedEndpoints: JSON.stringify(data.allowedEndpoints ?? []),
      ttlSeconds: ttl,
      expiresAt,
      signatureHash,
      active: true,
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

  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
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
      agentId,
      active: true,
      expiresAt: { gt: now },
    },
  });

  if (mandates.length === 0) {
    return { allowed: false, violations: ["No active mandates for this agent"] };
  }

  // Check each mandate — find the first that fully permits the transaction
  for (const mandate of mandates) {
    const mandateViolations: string[] = [];

    if (transaction.amount > mandate.maxTransactionAmount) {
      mandateViolations.push(
        `Amount ${transaction.amount} exceeds per-transaction limit ${mandate.maxTransactionAmount}`,
      );
    }

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const dailyActivities = await prisma.agentActivity.findMany({
      where: {
        agentId,
        mandateId: mandate.id,
        createdAt: { gte: startOfDay },
        amount: { not: null },
      },
    });
    const dailyTotal = dailyActivities.reduce(
      (sum, a) => sum + (a.amount ?? 0),
      0,
    );
    if (dailyTotal + transaction.amount > mandate.maxDailyAmount) {
      mandateViolations.push(
        `Daily total ${dailyTotal + transaction.amount} exceeds daily limit ${mandate.maxDailyAmount}`,
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

    const allowedOps: string[] = JSON.parse(mandate.allowedOperations);
    if (allowedOps.length > 0) {
      if (!allowedOps.includes(transaction.operation)) {
        mandateViolations.push(
          `Operation "${transaction.operation}" not permitted`,
        );
      }
    }

    const allowedEndpoints: string[] = JSON.parse(mandate.allowedEndpoints);
    if (allowedEndpoints.length > 0 && transaction.endpoint) {
      const matches = allowedEndpoints.some((pattern) => {
        const regex = new RegExp(
          `^${pattern.replace(/\*/g, ".*")}$`,
        );
        return regex.test(transaction.endpoint!);
      });
      if (!matches) {
        mandateViolations.push(
          `Endpoint "${transaction.endpoint}" does not match allowed patterns`,
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
    data: { active: false, revokedAt: new Date() },
  });
}

export async function getActiveMandates(agentId: string) {
  return prisma.agentMandate.findMany({
    where: {
      agentId,
      active: true,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
}
