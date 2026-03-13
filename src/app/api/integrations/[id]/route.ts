import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await prisma.integrationTemplate.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const updated = await prisma.integrationTemplate.update({
    where: { id },
    data: {
      name: body.name ?? existing.name,
      icon: body.icon ?? existing.icon,
      category: body.category ?? existing.category,
      type: body.type ?? existing.type,
      description: body.description ?? existing.description,
      baseConfig: body.baseConfig ? JSON.stringify(body.baseConfig) : existing.baseConfig,
      operations: body.operations ? JSON.stringify(body.operations) : existing.operations,
      credentialSchema: body.credentialSchema ? JSON.stringify(body.credentialSchema) : existing.credentialSchema,
      mockConfig: body.mockConfig ? JSON.stringify(body.mockConfig) : existing.mockConfig,
    }
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await prisma.integrationTemplate.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.integrationTemplate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
