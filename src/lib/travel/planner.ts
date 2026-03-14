import { generateObject } from "ai"
import { getModel, resolveProvider, type Provider } from "@/lib/ai/providers"
import {
  TravelPlanSchema,
  type TravelPlanOutput,
  type TravelBookingInput,
} from "@/lib/travel/schema"
import {
  TRAVEL_PLANNER_SYSTEM_PROMPT,
  buildTravelUserPrompt,
} from "@/lib/travel/prompt"

const DEFAULT_PREFERENCE: Record<TravelBookingInput["type"], string> = {
  flight: "economy",
  bus: "standard seater",
  train: "general",
  cab: "standard",
  hotel: "3 star",
  selfDriving: "hatchback",
}

const UNSUPPORTED_KEYWORDS: Record<string, string> = {
  horse: "horse ride is not available in current integrations",
  helicopter: "helicopter booking is not available in current integrations",
  cruise: "cruise booking is not available in current integrations",
  boat: "boat booking is not available in current integrations",
}

function daytimeIsoFallback(plusDays: number) {
  const value = new Date()
  value.setDate(value.getDate() + plusDays)
  value.setHours(10, 0, 0, 0)
  return value.toISOString()
}

function addUnsupportedFromPrompt(prompt: string, plan: TravelPlanOutput) {
  const lowered = prompt.toLowerCase()
  for (const [keyword, reason] of Object.entries(UNSUPPORTED_KEYWORDS)) {
    if (!lowered.includes(keyword)) continue
    const alreadyAdded = plan.skippedIntegrations.some((entry) =>
      entry.requested.toLowerCase().includes(keyword),
    )
    if (!alreadyAdded) {
      plan.skippedIntegrations.push({ requested: keyword, reason })
    }
  }
}

function normalizePlan(plan: TravelPlanOutput, userPrompt: string): TravelPlanOutput {
  const normalizedBookings = plan.bookings.map((booking, index) => {
    const fallbackPreference = DEFAULT_PREFERENCE[booking.type]
    const fallbackDateTime = daytimeIsoFallback(index)

    return {
      ...booking,
      id: booking.id || `${booking.type}-${index + 1}`,
      title: booking.title || `${booking.type} booking`,
      dateTime: booking.dateTime || fallbackDateTime,
      costStrategy: "lowest" as const,
      preference: booking.preference || fallbackPreference,
      payment: booking.payment ?? {
        required: true,
        status: "pending",
        note: "Payment confirmation placeholder",
      },
      details: booking.details ?? {},
      from: booking.from || plan.intent.from,
      to: booking.to || plan.intent.to,
    }
  })

  const normalizedPlan: TravelPlanOutput = {
    ...plan,
    intent: {
      ...plan.intent,
      travelDays: Math.max(1, plan.intent.travelDays),
      costStrategy: "lowest",
      preferences: {
        flight:
          plan.intent.preferences.flight ??
          normalizedBookings.find((b) => b.type === "flight")?.preference ??
          DEFAULT_PREFERENCE.flight,
        bus:
          plan.intent.preferences.bus ??
          normalizedBookings.find((b) => b.type === "bus")?.preference ??
          DEFAULT_PREFERENCE.bus,
        train:
          plan.intent.preferences.train ??
          normalizedBookings.find((b) => b.type === "train")?.preference ??
          DEFAULT_PREFERENCE.train,
        cab:
          plan.intent.preferences.cab ??
          normalizedBookings.find((b) => b.type === "cab")?.preference ??
          DEFAULT_PREFERENCE.cab,
        hotel:
          plan.intent.preferences.hotel ??
          normalizedBookings.find((b) => b.type === "hotel")?.preference ??
          DEFAULT_PREFERENCE.hotel,
        selfDriving:
          plan.intent.preferences.selfDriving ??
          normalizedBookings.find((b) => b.type === "selfDriving")?.preference ??
          DEFAULT_PREFERENCE.selfDriving,
      },
    },
    bookings: normalizedBookings,
  }

  addUnsupportedFromPrompt(userPrompt, normalizedPlan)

  return normalizedPlan
}

export async function generateTravelPlan(input: {
  prompt: string
  provider?: Provider
}) {
  const effectiveProvider = resolveProvider(input.provider)
  const result = await generateObject({
    model: getModel(effectiveProvider),
    schema: TravelPlanSchema,
    system: TRAVEL_PLANNER_SYSTEM_PROMPT,
    prompt: buildTravelUserPrompt(input.prompt),
  })

  return {
    provider: effectiveProvider,
    plan: normalizePlan(result.object, input.prompt),
  }
}
