import { NextRequest, NextResponse } from "next/server";
import {
  chargeVirtualCard,
  freezeCard,
  deactivateCard,
} from "@/lib/kya/stripe-sandbox";

type Params = { params: Promise<{ id: string; cardId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { cardId } = await params;
    const body = await request.json();
    const { amount, currency, mcc } = body;

    if (amount === undefined || !currency) {
      return NextResponse.json(
        { error: "Missing required fields: amount, currency" },
        { status: 400 }
      );
    }

    const result = await chargeVirtualCard({ cardId, amount, currency, mcc });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to charge card", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { cardId } = await params;
    const body = await request.json();
    const { action } = body;

    if (action === "freeze") {
      const result = await freezeCard(cardId);
      return NextResponse.json(result);
    }
    if (action === "deactivate") {
      const result = await deactivateCard(cardId);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Invalid action. Must be 'freeze' or 'deactivate'" },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update card status", detail: String(error) },
      { status: 500 }
    );
  }
}
