import { NextResponse } from "next/server";

/**
 * Legacy endpoint. Agent authentication for workflow execution
 * uses credentials linked to the integration node (Stripe RAK, etc.).
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "Use workflow credentials and POST /api/agents/:id/verify for passport verification",
      migration: "passport_verify",
    },
    { status: 410 },
  );
}
