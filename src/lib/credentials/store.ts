import { prisma } from "@/lib/db";
import { encrypt, decrypt } from "./crypto";

export async function createCredential(data: {
  name: string;
  type: string;
  values: Record<string, string>;
  metadata?: Record<string, string>;
  workflowId?: string;
}): Promise<{ id: string; name: string; type: string }> {
  const encryptedValue = encrypt(JSON.stringify(data.values));

  const credential = await prisma.credential.create({
    data: {
      name: data.name,
      type: data.type,
      encryptedValue,
      metadata: data.metadata ? JSON.stringify(data.metadata) : "{}",
      workflowId: data.workflowId ?? null,
    },
    select: { id: true, name: true, type: true },
  });

  return credential;
}

export async function listCredentials(
  workflowId?: string,
): Promise<
  Array<{
    id: string;
    name: string;
    type: string;
    metadata: Record<string, string>;
    createdAt: Date;
  }>
> {
  const where = workflowId ? { workflowId } : {};

  const credentials = await prisma.credential.findMany({
    where,
    select: {
      id: true,
      name: true,
      type: true,
      metadata: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return credentials.map((c) => ({
    ...c,
    metadata: c.metadata ? (JSON.parse(c.metadata as string) as Record<string, string>) : {},
  }));
}

export async function resolveCredential(
  credentialId: string,
): Promise<Record<string, string>> {
  const credential = await prisma.credential.findUniqueOrThrow({
    where: { id: credentialId },
    select: { encryptedValue: true },
  });

  return JSON.parse(decrypt(credential.encryptedValue)) as Record<string, string>;
}

export async function deleteCredential(credentialId: string): Promise<void> {
  await prisma.credential.delete({ where: { id: credentialId } });
}
