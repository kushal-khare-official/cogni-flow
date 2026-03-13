import { NextRequest, NextResponse } from "next/server";
import { verifyAgentApiKey } from "@/lib/kya/agent-passport";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing required field: apiKey" },
        { status: 400 }
      );
    }

    const valid = await verifyAgentApiKey(id, apiKey);
    return NextResponse.json({ valid });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to verify API key", detail: String(error) },
      { status: 500 }
    );
  }
}
