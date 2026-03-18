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
    let created = 0;
    for (const integration of toUpsert) {
      const exists = await prisma.integration.findUnique({ where: { id: integration.id }, select: { id: true } });
      if (!exists) {
        await prisma.integration.create({ data: { ...integration } });
        created++;
      }
    }
    return NextResponse.json({ ok: true, ensured: created });
  } catch (e) {
    console.error("ensure-builtin:", e);
    return NextResponse.json({ error: "Failed to ensure built-in integrations" }, { status: 500 });
  }
}
