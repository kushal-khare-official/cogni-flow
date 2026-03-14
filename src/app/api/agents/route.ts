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
  // #region agent log
  const runId = `run_${Date.now()}`;
  fetch("http://127.0.0.1:7536/ingest/e876ab43-6c5c-4bbe-8c1f-6dba5eea1b50", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ebcb1e" },
    body: JSON.stringify({
      sessionId: "ebcb1e",
      runId,
      hypothesisId: "A",
      location: "src/app/api/agents/route.ts:POST:entry",
      message: "POST /api/agents body received",
      data: { hasBody: true },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  try {
    const body = (await request.json()) as {
      name: string;
      modelProvider: string;
      modelVersion?: string;
      creatorName: string;
    };
    const { name, modelProvider, modelVersion, creatorName } = body;

    // #region agent log
    fetch("http://127.0.0.1:7536/ingest/e876ab43-6c5c-4bbe-8c1f-6dba5eea1b50", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ebcb1e" },
      body: JSON.stringify({
        sessionId: "ebcb1e",
        runId,
        hypothesisId: "B",
        location: "src/app/api/agents/route.ts:POST:parsed",
        message: "Request body and fingerprint inputs",
        data: { name, modelProvider, modelVersion: modelVersion ?? "", creatorName },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

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
      name,
      modelProvider,
      modelVersion ?? "",
      creatorName,
    );

    // #region agent log
    fetch("http://127.0.0.1:7536/ingest/e876ab43-6c5c-4bbe-8c1f-6dba5eea1b50", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ebcb1e" },
      body: JSON.stringify({
        sessionId: "ebcb1e",
        runId,
        hypothesisId: "C",
        location: "src/app/api/agents/route.ts:POST:fingerprint",
        message: "Computed fingerprint (unique key)",
        data: { fingerprint },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    // #region agent log
    const existing = await prisma.agentPassport.findUnique({
      where: { fingerprint },
    });
    fetch("http://127.0.0.1:7536/ingest/e876ab43-6c5c-4bbe-8c1f-6dba5eea1b50", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ebcb1e" },
      body: JSON.stringify({
        sessionId: "ebcb1e",
        runId,
        hypothesisId: "D",
        location: "src/app/api/agents/route.ts:POST:beforeCreate",
        message: "Existing passport by fingerprint",
        data: { fingerprint, existingExists: !!existing, existingId: existing?.id ?? null, action: existing ? "returnExisting" : "create" },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    if (existing) {
      return NextResponse.json(existing, { status: 200 });
    }

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
    // #region agent log
    const err = error as { code?: string; meta?: unknown };
    fetch("http://127.0.0.1:7536/ingest/e876ab43-6c5c-4bbe-8c1f-6dba5eea1b50", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ebcb1e" },
      body: JSON.stringify({
        sessionId: "ebcb1e",
        runId,
        hypothesisId: "E",
        location: "src/app/api/agents/route.ts:POST:catch",
        message: "POST error",
        data: { errorCode: err?.code, isP2002: err?.code === "P2002", meta: err?.meta },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    console.error("[agents/POST]", error);
    return NextResponse.json(
      { error: "Failed to register agent", detail: String(error) },
      { status: 500 },
    );
  }
}
