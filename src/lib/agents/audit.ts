import { prisma } from "@/lib/db";

export interface AuditEntryInput {
  agentPassportId: string;
  action: string;
  amountCents?: number;
  status: string;
  executionRunId?: string;
  nodeId?: string;
  anomalyScore?: number;
  metadata?: Record<string, unknown>;
}

export async function logAuditEntry(input: AuditEntryInput): Promise<string> {
  const entry = await prisma.agentAuditLog.create({
    data: {
      agentPassportId: input.agentPassportId,
      action: input.action,
      amountCents: input.amountCents ?? null,
      status: input.status,
      executionRunId: input.executionRunId ?? null,
      nodeId: input.nodeId ?? null,
      anomalyScore: input.anomalyScore ?? null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : "{}",
    },
    select: { id: true },
  });
  return entry.id;
}

export interface AuditTrailItem {
  id: string;
  action: string;
  amountCents: number | null;
  status: string;
  anomalyScore: number | null;
  createdAt: Date;
}

export async function getAuditTrail(
  agentPassportId: string,
  limit: number = 50,
  offset: number = 0,
): Promise<AuditTrailItem[]> {
  const entries = await prisma.agentAuditLog.findMany({
    where: { agentPassportId },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
    select: {
      id: true,
      action: true,
      amountCents: true,
      status: true,
      anomalyScore: true,
      createdAt: true,
    },
  });
  return entries;
}
