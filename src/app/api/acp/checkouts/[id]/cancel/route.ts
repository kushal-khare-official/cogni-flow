import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await prisma.agenticCheckoutSession.findUnique({
    where: { id },
  });
  if (!session) {
    return NextResponse.json({ error: "Checkout session not found" }, { status: 404 });
  }
  if (session.status === "completed") {
    return NextResponse.json({ error: "Checkout already completed" }, { status: 400 });
  }

  await prisma.agenticCheckoutSession.update({
    where: { id },
    data: { status: "canceled" },
  });

  return NextResponse.json({
    id: session.id,
    status: "canceled",
    message: "Checkout session canceled",
  });
}
