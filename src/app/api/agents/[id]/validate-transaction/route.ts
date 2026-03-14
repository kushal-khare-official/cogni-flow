import { NextResponse } from "next/server";

/**
 * Legacy endpoint. Use POST /api/agents/mandates/[mandateId]/validate
 * with body { action, amountCents } for mandate-based validation.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "Use POST /api/agents/mandates/:mandateId/validate with { action, amountCents }",
      migration: "mandate_validate",
    },
    { status: 410 },
  );
}
