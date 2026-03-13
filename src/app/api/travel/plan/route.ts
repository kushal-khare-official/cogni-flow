import { NextRequest, NextResponse } from "next/server"
import { type Provider } from "@/lib/ai/providers"
import { generateTravelPlan } from "@/lib/travel/planner"
import { TravelPlanRequestSchema } from "@/lib/travel/schema"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = TravelPlanRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { prompt, provider } = parsed.data
    const result = await generateTravelPlan({
      prompt,
      provider: (provider ?? "anthropic") as Provider,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[travel/plan]", error)
    const message =
      error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
