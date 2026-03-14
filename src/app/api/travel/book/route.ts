import { NextRequest, NextResponse } from "next/server"
import { executeMockBooking } from "@/lib/travel/mock-booking"
import { TravelBookRequestSchema } from "@/lib/travel/schema"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = TravelBookRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { booking } = parsed.data
    const result = await executeMockBooking(booking)

    return NextResponse.json({
      booking,
      ...result,
      payment: {
        status: "done",
        note: "Dummy agent payment done (placeholder).",
      },
    })
  } catch (error) {
    console.error("[travel/book]", error)
    const message =
      error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
