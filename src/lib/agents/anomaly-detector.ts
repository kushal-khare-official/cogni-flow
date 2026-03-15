import { prisma } from "@/lib/db";

export interface AnomalyResult {
  score: number;
  flags: string[];
}

const ANOMALY_THRESHOLD = 0.7;
const AMOUNT_SPIKE_MULTIPLIER = 3;
const FREQUENCY_WINDOW_SECONDS = 60;
const FREQUENCY_MAX_CALLS = 10;

/**
 * Rule-based anomaly scoring for agent behavior.
 * Returns score in [0, 1] and list of triggered flags.
 */
export async function computeAnomalyScore(
  agentPassportId: string,
  action: string,
  amountCents: number,
): Promise<AnomalyResult> {
  const flags: string[] = [];
  let score = 0;

  const actionHistory = await prisma.agentAuditLog.findMany({
    where: { agentPassportId, action },
    take: 1,
  });
  if (actionHistory.length === 0) {
    flags.push("first_time_action");
    score += 0.3;
  }

  const recentAmounts = await prisma.agentAuditLog.findMany({
    where: { agentPassportId, amountCents: { not: null } },
    select: { amountCents: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const amounts = recentAmounts
    .map((r) => r.amountCents)
    .filter((a): a is number => a != null && a > 0);
  if (amounts.length >= 3) {
    const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    if (amountCents > avg * AMOUNT_SPIKE_MULTIPLIER) {
      flags.push("amount_spike");
      score += 0.3;
    }
  }

  const windowStart = new Date(Date.now() - FREQUENCY_WINDOW_SECONDS * 1000);
  const recentCount = await prisma.agentAuditLog.count({
    where: {
      agentPassportId,
      createdAt: { gte: windowStart },
    },
  });
  if (recentCount >= FREQUENCY_MAX_CALLS) {
    flags.push("frequency_burst");
    score += 0.2;
  }

  score = Math.min(1, score);
  return { score, flags };
}

export function getAnomalyThreshold(): number {
  return ANOMALY_THRESHOLD;
}
