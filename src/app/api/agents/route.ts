import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateFingerprint } from "@/lib/stripe/agent-passport";

export async function GET() {
  try {
    const agents = await prisma.agentPassport.findMany({
      orderBy: { issuedAt: "desc" },
      select: {
        id: true,
        name: true,
        fingerprint: true,
        modelProvider: true,
        modelVersion: true,
        creatorName: true,
        creatorVerified: true,
        status: true,
        issuedAt: true,
        revokedAt: true,
        _count: { select: { mandates: true, auditLogs: true } },
      },
    });
    const list = agents.map((a) => ({
      id: a.id,
      name: a.name,
      fingerprint: a.fingerprint,
      modelProvider: a.modelProvider,
      modelVersion: a.modelVersion,
      creatorName: a.creatorName,
      creatorVerified: a.creatorVerified,
      status: a.status,
      issuedAt: a.issuedAt,
      revokedAt: a.revokedAt,
      mandateCount: a._count.mandates,
      auditCount: a._count.auditLogs,
    }));
    return NextResponse.json(list);
  } catch (error) {
    console.error("[agents/GET]", error);
    return NextResponse.json(
      { error: "Failed to list agents", detail: String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      name: string;
      modelProvider: string;
      modelVersion?: string;
      creatorName: string;
    };
    const { name, modelProvider, modelVersion, creatorName } = body;

    if (!name || !modelProvider || !creatorName) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: name, modelProvider, creatorName",
        },
        { status: 400 },
      );
    }

    const fingerprint = generateFingerprint(
      modelProvider,
      modelVersion ?? "",
      creatorName,
    );

    const passport = await prisma.agentPassport.create({
      data: {
        name,
        fingerprint,
        modelProvider,
        modelVersion: modelVersion ?? "",
        creatorName,
        creatorVerified: true, // PoC auto-verify
        status: "active",
      },
    });

    return NextResponse.json(passport, { status: 201 });
  } catch (error) {
    console.error("[agents/POST]", error);
    return NextResponse.json(
      { error: "Failed to register agent", detail: String(error) },
      { status: 500 },
    );
  }
}
