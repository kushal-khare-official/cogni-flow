import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createMandate } from "@/lib/kya/mandate-engine";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const mandates = await prisma.agentMandate.findMany({
      where: { agentId: id },
      orderBy: { createdAt: "desc" },
    });

    const parsed = mandates.map((m) => ({
      ...m,
      allowedMCCs: JSON.parse(m.allowedMCCs || "[]"),
      allowedOperations: JSON.parse(m.allowedOperations || "[]"),
      allowedEndpoints: JSON.parse(m.allowedEndpoints || "[]"),
    }));

    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to list mandates", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();

    const mandate = await createMandate({ agentId: id, ...body });
    return NextResponse.json(mandate, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create mandate", detail: String(error) },
      { status: 500 }
    );
  }
}
