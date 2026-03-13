import { NextRequest, NextResponse } from "next/server";
import { createCredential, listCredentials } from "@/lib/credentials/store";

export async function GET(request: NextRequest) {
  const workflowId = new URL(request.url).searchParams.get("workflowId") ?? undefined;
  const credentials = await listCredentials(workflowId);
  return NextResponse.json({ credentials });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await createCredential(body);
  return NextResponse.json(result, { status: 201 });
}
