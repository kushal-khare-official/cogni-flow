import { NextRequest, NextResponse } from "next/server";
import { revokeAgent } from "@/lib/kya/agent-passport";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await revokeAgent(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to revoke agent", detail: String(error) },
      { status: 500 }
    );
  }
}
