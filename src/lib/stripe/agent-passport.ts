import { createHash } from "crypto";

/**
 * Generate a SHA-256 fingerprint for an agent (model + version + creator).
 * Used as a unique, tamper-evident identity for the Digital Agent Passport.
 */
export function generateFingerprint(
  modelProvider: string,
  modelVersion: string,
  creatorName: string,
): string {
  const payload = `${modelProvider}:${modelVersion}:${creatorName}`;
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

/**
 * Compute a SHA-256 signature hash of mandate parameters for tamper-evident audit.
 */
export function signMandate(params: {
  description: string;
  maxAmountCents: number;
  maxTotalSpendCents: number;
  allowedActions: string;
  allowedMCCs: string;
  ttlSeconds: number | null;
  agentPassportId: string;
  workflowId: string | null;
}): string {
  const payload = JSON.stringify(
    {
      description: params.description,
      maxAmountCents: params.maxAmountCents,
      maxTotalSpendCents: params.maxTotalSpendCents,
      allowedActions: params.allowedActions,
      allowedMCCs: params.allowedMCCs,
      ttlSeconds: params.ttlSeconds,
      agentPassportId: params.agentPassportId,
      workflowId: params.workflowId,
    },
    Object.keys(params).sort(),
  );
  return createHash("sha256").update(payload, "utf8").digest("hex");
}
