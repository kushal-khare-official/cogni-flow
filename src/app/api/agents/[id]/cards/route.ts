import { NextRequest, NextResponse } from "next/server";
import { getAgentCards, issueVirtualCard } from "@/lib/kya/stripe-sandbox";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const cards = await getAgentCards(id);
    return NextResponse.json(cards);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to list cards", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { fundedAmount, currency, mandateId, singleUse, allowedMCCs } = body;

    if (fundedAmount === undefined) {
      return NextResponse.json(
        { error: "Missing required field: fundedAmount" },
        { status: 400 }
      );
    }

    const card = await issueVirtualCard({
      agentId: id,
      fundedAmount,
      currency,
      mandateId,
      singleUse,
      allowedMCCs,
    });

    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to issue virtual card", detail: String(error) },
      { status: 500 }
    );
  }
}
