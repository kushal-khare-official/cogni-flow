import { prisma } from "@/lib/db";
import { revokeAgent } from "@/lib/kya/agent-passport";

interface LogActivityInput {
  agentId: string;
  action: string;
  resource?: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
  mandateId?: string;
}

export async function logActivity(data: LogActivityInput) {
  const { score, factors } = await computeRiskScore(data.agentId, {
    action: data.action,
    amount: data.amount,
    resource: data.resource,
  });

  const flagged = score >= 70;
  const flagReason = flagged ? factors.join("; ") : null;
  const anomalyScore = score / 100;
  const amountCents =
    data.amount != null ? Math.round(Number(data.amount) * 100) : null;

  const activity = await prisma.agentAuditLog.create({
    data: {
      agentPassportId: data.agentId,
      action: data.action,
      amountCents,
      status: flagged ? "flagged" : "completed",
      anomalyScore,
      metadata: JSON.stringify({
        ...(data.metadata ?? {}),
        resource: data.resource,
        currency: data.currency,
        mandateId: data.mandateId,
        flagReason,
      }),
    },
  });

  if (flagged) {
    await checkAndAutoRevoke(data.agentId);
  }

  return activity;
}

export async function computeRiskScore(
  agentId: string,
  activity: { action: string; amount?: number; resource?: string },
): Promise<{ score: number; factors: string[] }> {
  let score = 0;
  const factors: string[] = [];
  const now = new Date();

  // 1. Amount deviation (0-30 points)
  if (activity.amount !== undefined && activity.amount !== null) {
    const historicalActivities = await prisma.agentAuditLog.findMany({
      where: { agentPassportId: agentId, amountCents: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    if (historicalActivities.length > 0) {
      const amounts = historicalActivities.map((a) => (a.amountCents ?? 0) / 100);
      const avg = amounts.reduce((s, v) => s + v, 0) / amounts.length;
      const stdDev = Math.sqrt(
        amounts.reduce((s, v) => s + (v - avg) ** 2, 0) / amounts.length,
      );

      if (stdDev > 0) {
        const zScore = Math.abs(activity.amount - avg) / stdDev;
        const amountScore = Math.min(30, Math.round(zScore * 10));
        if (amountScore > 10) {
          factors.push(
            `Amount deviation: ${activity.amount} vs avg ${avg.toFixed(2)} (z=${zScore.toFixed(2)})`,
          );
        }
        score += amountScore;
      } else if (activity.amount !== avg && avg > 0) {
        const ratio = activity.amount / avg;
        if (ratio > 3) {
          score += 25;
          factors.push(
            `Amount ${activity.amount} is ${ratio.toFixed(1)}x the historical average ${avg.toFixed(2)}`,
          );
        }
      }
    }
  }

  // 2. Rate anomaly — actions in the last hour (0-25 points)
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const recentCount = await prisma.agentAuditLog.count({
    where: { agentPassportId: agentId, createdAt: { gte: oneHourAgo } },
  });
  if (recentCount > 50) {
    score += 25;
    factors.push(`High activity rate: ${recentCount} actions in last hour`);
  } else if (recentCount > 20) {
    const rateScore = Math.round(((recentCount - 20) / 30) * 25);
    score += rateScore;
    if (rateScore > 5) {
      factors.push(`Elevated activity rate: ${recentCount} actions in last hour`);
    }
  }

  // 3. Resource category shift (0-25 points)
  if (activity.resource) {
    const currentCategory = activity.resource.split(".")[0] || activity.resource;
    const recentActivities = await prisma.agentAuditLog.findMany({
      where: { agentPassportId: agentId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    if (recentActivities.length >= 5) {
      const recentCategories = recentActivities.map((a) => {
        try {
          const meta = JSON.parse(a.metadata) as { resource?: string };
          const res = meta?.resource ?? "";
          return res.split(".")[0] || res || "unknown";
        } catch {
          return "unknown";
        }
      });
      const categoryFreq = new Map<string, number>();
      for (const cat of recentCategories) {
        categoryFreq.set(cat, (categoryFreq.get(cat) ?? 0) + 1);
      }
      const currentFreq = categoryFreq.get(currentCategory) ?? 0;
      const totalRecent = recentCategories.length;

      if (currentFreq === 0) {
        score += 25;
        factors.push(
          `New resource category "${currentCategory}" not seen in recent ${totalRecent} actions`,
        );
      } else if (currentFreq / totalRecent < 0.1) {
        score += 15;
        factors.push(
          `Rare resource category "${currentCategory}" (${currentFreq}/${totalRecent} recent)`,
        );
      }
    }
  }

  // 4. Time-of-day anomaly (0-20 points)
  const hour = now.getUTCHours();
  if (hour >= 1 && hour <= 5) {
    score += 20;
    factors.push(`Unusual hour: ${hour}:00 UTC`);
  } else if (hour === 0 || hour === 6) {
    score += 10;
    factors.push(`Off-peak hour: ${hour}:00 UTC`);
  }

  return { score: Math.min(100, score), factors };
}

export async function checkAndAutoRevoke(
  agentId: string,
): Promise<{ revoked: boolean; reason?: string }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const flaggedRecent = await prisma.agentAuditLog.findMany({
    where: {
      agentPassportId: agentId,
      createdAt: { gte: oneHourAgo },
      OR: [
        { status: "flagged" },
        { anomalyScore: { gte: 0.7 } },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  const criticalActivity = flaggedRecent.find(
    (a) => a.anomalyScore != null && a.anomalyScore > 0.9,
  );
  if (criticalActivity) {
    await revokeAgent(agentId);
    return {
      revoked: true,
      reason: `Critical anomaly score ${criticalActivity.anomalyScore} on activity ${criticalActivity.id}`,
    };
  }

  if (flaggedRecent.length >= 3) {
    await revokeAgent(agentId);
    return {
      revoked: true,
      reason: `${flaggedRecent.length} flagged activities in the last hour`,
    };
  }

  return { revoked: false };
}

export async function getActivitySummary(
  agentId: string,
  hours: number = 24,
): Promise<{
  totalActions: number;
  flaggedCount: number;
  averageRiskScore: number;
  totalSpend: number;
  currency: string | null;
}> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const activities = await prisma.agentAuditLog.findMany({
    where: { agentPassportId: agentId, createdAt: { gte: since } },
  });

  const totalActions = activities.length;
  const flaggedCount = activities.filter(
    (a) => a.status === "flagged" || (a.anomalyScore != null && a.anomalyScore >= 0.7),
  ).length;
  const scores = activities
    .map((a) => (a.anomalyScore != null ? a.anomalyScore * 100 : 0))
    .filter((s) => s > 0);
  const averageRiskScore =
    scores.length > 0
      ? scores.reduce((sum, s) => sum + s, 0) / scores.length
      : 0;

  const financialActivities = activities.filter((a) => a.amountCents != null);
  const totalSpend =
    financialActivities.reduce((sum, a) => sum + (a.amountCents ?? 0), 0) / 100;
  let currency: string | null = null;
  if (financialActivities.length > 0) {
    try {
      const meta = JSON.parse(financialActivities[0].metadata) as {
        currency?: string;
      };
      currency = meta?.currency ?? null;
    } catch {
      // ignore
    }
  }

  return {
    totalActions,
    flaggedCount,
    averageRiskScore: Math.round(averageRiskScore * 100) / 100,
    totalSpend,
    currency,
  };
}
