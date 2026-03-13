import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const servers = await prisma.mcpServerConfig.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ servers });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const server = await prisma.mcpServerConfig.create({
    data: {
      name: body.name,
      transport: body.transport,
      command: body.command,
      args: JSON.stringify(body.args ?? []),
      url: body.url,
      env: JSON.stringify(body.env ?? {}),
    }
  });
  return NextResponse.json(server, { status: 201 });
}
