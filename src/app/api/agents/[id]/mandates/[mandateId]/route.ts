import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string; mandateId: string }> };

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { mandateId } = await params;
    const mandate = await prisma.agentMandate.findUnique({
      where: { id: mandateId },
    });
    if (!mandate) {
      return NextResponse.json({ error: "Mandate not found" }, { status: 404 });
    }
    const updated = await prisma.agentMandate.update({
      where: { id: mandateId },
      data: { status: "revoked" },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[agents/[id]/mandates/[mandateId] DELETE]", error);
    return NextResponse.json(
      { error: "Failed to revoke mandate", detail: String(error) },
      { status: 500 },
    );
  }
}
