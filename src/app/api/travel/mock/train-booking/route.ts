import { NextRequest, NextResponse } from "next/server"
import { TravelBookRequestSchema } from "@/lib/travel/schema"
import { executeMockBookingOnly } from "@/lib/travel/mock-booking"

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
    if (booking.type !== "train") {
      return NextResponse.json(
        { error: "train-booking API only accepts train integration type" },
        { status: 400 },
      )
    }

    const result = await executeMockBookingOnly(booking)
    return NextResponse.json({
      booking,
      api: "train-booking",
      ...result,
      usedInput: {
        from: booking.from,
        to: booking.to,
        dateTime: booking.dateTime,
        preference: booking.preference,
        details: booking.details,
      },
    })
  } catch (error) {
    console.error("[travel/mock/train-booking]", error)
    const message =
      error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
