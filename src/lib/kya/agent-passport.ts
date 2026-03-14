import crypto from "crypto";
import { prisma } from "@/lib/db";

export function generateAgentFingerprint(data: {
  modelProvider: string;
  modelId: string;
  modelVersion: string;
  creatorEmail: string;
  creatorOrgId: string;
  timestamp: string;
}): string {
  const payload = [
    data.modelProvider,
    data.modelId,
    data.modelVersion,
    data.creatorEmail,
    data.creatorOrgId,
    data.timestamp,
  ].join("|");

  return crypto.createHash("sha256").update(payload).digest("hex");
}

export function generateAgentApiKey(): {
  apiKey: string;
  apiKeyHash: string;
  apiKeyPrefix: string;
} {
  const randomHex = crypto.randomBytes(24).toString("hex"); // 48 hex chars
  const apiKey = `cflow_agent_${randomHex}`;
  const apiKeyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
  const apiKeyPrefix = randomHex.slice(0, 8);

  return { apiKey, apiKeyHash, apiKeyPrefix };
}

export function verifyAgentApiKey(
  apiKey: string,
  storedHash: string,
): boolean {
  const hash = crypto.createHash("sha256").update(apiKey).digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(hash, "hex"),
    Buffer.from(storedHash, "hex"),
  );
}

interface PassportInput {
  id: string;
  name: string;
  fingerprint: string;
  modelProvider: string;
  modelId: string;
  modelVersion: string;
  creatorName: string;
  creatorEmail: string;
  creatorOrgId: string;
}

export interface DigitalPassport extends PassportInput {
  issuedAt: string;
  passportSignature: string;
}

export function createDigitalPassport(agent: PassportInput): DigitalPassport {
  const issuedAt = new Date().toISOString();

  const signaturePayload = [
    agent.id,
    agent.name,
    agent.fingerprint,
    agent.modelProvider,
    agent.modelId,
    agent.modelVersion,
    agent.creatorName,
    agent.creatorEmail,
    agent.creatorOrgId,
    issuedAt,
  ].join("|");

  const passportSignature = crypto
    .createHash("sha256")
    .update(signaturePayload)
    .digest("hex");

  return {
    ...agent,
    issuedAt,
    passportSignature,
  };
}

export function validatePassport(
  passport: Record<string, unknown>,
): { valid: boolean; reason?: string } {
  const requiredFields = [
    "id",
    "name",
    "fingerprint",
    "modelProvider",
    "modelId",
    "modelVersion",
    "creatorName",
    "creatorEmail",
    "creatorOrgId",
    "issuedAt",
    "passportSignature",
  ] as const;

  for (const field of requiredFields) {
    if (passport[field] === undefined || passport[field] === null) {
      return { valid: false, reason: `Missing required field: ${field}` };
    }
  }

  const signaturePayload = [
    passport.id,
    passport.name,
    passport.fingerprint,
    passport.modelProvider,
    passport.modelId,
    passport.modelVersion,
    passport.creatorName,
    passport.creatorEmail,
    passport.creatorOrgId,
    passport.issuedAt,
  ].join("|");

  const expectedSignature = crypto
    .createHash("sha256")
    .update(signaturePayload)
    .digest("hex");

  if (expectedSignature !== passport.passportSignature) {
    return { valid: false, reason: "Passport signature mismatch" };
  }

  return { valid: true };
}

export async function revokeAgent(agentId: string) {
  return prisma.$transaction(async (tx) => {
    const agent = await tx.agentPassport.update({
      where: { id: agentId },
      data: {
        status: "revoked",
        revokedAt: new Date(),
      },
    });

    await tx.agentMandate.updateMany({
      where: { agentPassportId: agentId, status: "active" },
      data: { status: "revoked" },
    });

    return agent;
  });
}
