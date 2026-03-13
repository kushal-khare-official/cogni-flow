import { NextRequest, NextResponse } from "next/server";
import { validateTransaction } from "@/lib/kya/mandate-engine";
import { logActivity, checkAndAutoRevoke } from "@/lib/kya/behavioral-monitor";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { amount, currency, mcc, operation, endpoint } = body;

    if (amount === undefined || !currency || !operation) {
      return NextResponse.json(
        { error: "Missing required fields: amount, currency, operation" },
        { status: 400 }
      );
    }

    const result = await validateTransaction({
      agentId: id,
      amount,
      currency,
      mcc,
      operation,
      endpoint,
    });

    await logActivity({
      agentId: id,
      action: "transaction.validated",
      resource: endpoint ?? operation,
      amount,
      currency,
      metadata: { mcc, operation, allowed: result.allowed },
    });

    await checkAndAutoRevoke(id);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to validate transaction", detail: String(error) },
      { status: 500 }
    );
  }
}
