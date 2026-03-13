import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const templates = await prisma.integrationTemplate.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ templates });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const template = await prisma.integrationTemplate.create({
    data: {
      name: body.name,
      icon: body.icon ?? "plug",
      category: body.category ?? "custom",
      type: body.type,
      description: body.description ?? "",
      baseConfig: JSON.stringify(body.baseConfig ?? {}),
      operations: JSON.stringify(body.operations ?? []),
      credentialSchema: JSON.stringify(body.credentialSchema ?? []),
      mockConfig: JSON.stringify(body.mockConfig ?? {}),
      isBuiltIn: false,
    }
  });
  return NextResponse.json(template, { status: 201 });
}
