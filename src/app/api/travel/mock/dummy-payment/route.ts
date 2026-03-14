import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { executeDummyPayment } from "@/lib/travel/mock-booking"

const DummyPaymentSchema = z.object({
  bookingReference: z.string().min(1),
  amount: z.number().positive().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = DummyPaymentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const result = await executeDummyPayment(
      parsed.data.bookingReference,
      parsed.data.amount ?? 0,
    )
    return NextResponse.json({ api: "dummy-payment", ...result })
  } catch (error) {
    console.error("[travel/mock/dummy-payment]", error)
    const message =
      error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
