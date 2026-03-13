import { NextRequest, NextResponse } from "next/server";
import { revokeMandate } from "@/lib/kya/mandate-engine";

type Params = { params: Promise<{ id: string; mandateId: string }> };

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { mandateId } = await params;
    const result = await revokeMandate(mandateId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to revoke mandate", detail: String(error) },
      { status: 500 }
    );
  }
}
