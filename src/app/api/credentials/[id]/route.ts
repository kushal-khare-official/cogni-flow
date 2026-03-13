import { NextRequest, NextResponse } from "next/server";
import { deleteCredential } from "@/lib/credentials/store";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteCredential(id);
  return NextResponse.json({ success: true });
}
