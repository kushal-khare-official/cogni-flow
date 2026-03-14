import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getBuiltInIntegrationsByIds } from "@/lib/integrations/built-in";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const integrationIds = Array.isArray(body?.integrationIds) ? (body.integrationIds as string[]) : [];
    if (integrationIds.length === 0) {
      return NextResponse.json({ ok: true, ensured: 0 });
    }
    const toUpsert = getBuiltInIntegrationsByIds(integrationIds);
    for (const integration of toUpsert) {
      await prisma.integration.upsert({
        where: { id: integration.id },
        update: { ...integration },
        create: { ...integration },
      });
    }
    return NextResponse.json({ ok: true, ensured: toUpsert.length });
  } catch (e) {
    console.error("ensure-builtin:", e);
    return NextResponse.json({ error: "Failed to ensure built-in integrations" }, { status: 500 });
  }
}
