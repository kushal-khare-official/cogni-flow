import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id: agentPassportId } = await params;
    const mandates = await prisma.agentMandate.findMany({
      where: { agentPassportId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(mandates);
  } catch (error) {
    console.error("[agents/[id]/mandates GET]", error);
    return NextResponse.json(
      { error: "Failed to list mandates", detail: String(error) },
      { status: 500 },
    );
  }
}
