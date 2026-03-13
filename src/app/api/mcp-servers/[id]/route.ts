import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const server = await prisma.mcpServerConfig.findUnique({ where: { id } });
  if (!server) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(server);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const updated = await prisma.mcpServerConfig.update({
    where: { id },
    data: {
      name: body.name,
      transport: body.transport,
      command: body.command,
      args: body.args ? JSON.stringify(body.args) : undefined,
      url: body.url,
      env: body.env ? JSON.stringify(body.env) : undefined,
    }
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.mcpServerConfig.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
