import { NextResponse } from "next/server";

/**
 * Card operations are performed via tpl-stripe-issuing
 * (getCard, cancelCard) in workflows.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Use tpl-stripe-issuing in workflows", migration: "stripe_issuing_template" },
    { status: 410 },
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: "Use tpl-stripe-issuing in workflows", migration: "stripe_issuing_template" },
    { status: 410 },
  );
}
