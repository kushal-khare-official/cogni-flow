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
    if (booking.type === "flight" || booking.type === "hotel") {
      return NextResponse.json(
        { error: "Use dedicated API for flight or hotel booking" },
        { status: 400 },
      )
    }

    const result = await executeMockBookingOnly(booking)
    return NextResponse.json({ booking, api: "generic-booking", ...result })
  } catch (error) {
    console.error("[travel/mock/generic-booking]", error)
    const message =
      error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
