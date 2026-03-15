import { NextRequest, NextResponse } from "next/server";
import { executeCode } from "@/lib/execution/executors/code-executor";

export async function POST(request: NextRequest) {
  try {
    const { code, language, ctx } = (await request.json()) as {
      code?: string;
      language?: string;
      ctx?: Record<string, unknown>;
    };

    if (!code || !code.trim()) {
      return NextResponse.json(
        { error: "No code provided." },
        { status: 400 },
      );
    }

    const result = await executeCode(code, ctx ?? {}, language ?? "javascript");
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
