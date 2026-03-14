import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const passport = await prisma.agentPassport.findUnique({
      where: { id },
      select: { status: true, revokedAt: true, expiresAt: true },
    });

    if (!passport) {
      return NextResponse.json(
        { valid: false, status: "not_found", reason: "Agent not found" },
      );
    }

    if (passport.status !== "active") {
      return NextResponse.json({
        valid: false,
        status: passport.status,
        reason: passport.status === "revoked" ? "Passport has been revoked" : "Passport is not active",
      });
    }

    if (passport.expiresAt && new Date() > passport.expiresAt) {
      return NextResponse.json({
        valid: false,
        status: "expired",
        reason: "Passport has expired",
      });
    }

    return NextResponse.json({
      valid: true,
      status: passport.status,
    });
  } catch (error) {
    console.error("[agents/[id]/verify]", error);
    return NextResponse.json(
      { error: "Failed to verify passport", detail: String(error) },
      { status: 500 },
    );
  }
}
