import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { reason?: string };
    const reason = body.reason ?? "Manual revocation";

    await prisma.$transaction(async (tx) => {
      const now = new Date();
      await tx.agentPassport.update({
        where: { id },
        data: {
          status: "revoked",
          revokedReason: reason,
          revokedAt: now,
        },
      });
      await tx.agentMandate.updateMany({
        where: { agentPassportId: id, status: "active" },
        data: { status: "revoked" },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[agents/[id]/revoke]", error);
    return NextResponse.json(
      { error: "Failed to revoke agent", detail: String(error) },
      { status: 500 },
    );
  }
}
