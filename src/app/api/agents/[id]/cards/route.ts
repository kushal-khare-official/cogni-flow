import { NextResponse } from "next/server";

/**
 * Virtual card issuance is performed via workflow integration node
 * using tpl-stripe-issuing (createCardholder, createVirtualCard).
 */
export async function GET() {
  return NextResponse.json(
    {
      error: "Use tpl-stripe-issuing integration in workflows for virtual cards",
      migration: "stripe_issuing_template",
    },
    { status: 410 },
  );
}

export async function POST() {
  return NextResponse.json(
    {
      error: "Use tpl-stripe-issuing integration in workflows for virtual cards",
      migration: "stripe_issuing_template",
    },
    { status: 410 },
  );
}
