import { z } from "zod"
import { SUPPORTED_TRAVEL_INTEGRATIONS } from "@/lib/travel/types"

export const TravelIntegrationTypeSchema = z.enum(SUPPORTED_TRAVEL_INTEGRATIONS)

export const TravelBookingPaymentSchema = z.object({
  required: z.boolean().default(true),
  status: z.enum(["pending", "done"]).default("pending"),
  note: z.string().default("Payment confirmation placeholder"),
})

export const TravelBookingSchema = z.object({
  id: z.string().min(1),
  type: TravelIntegrationTypeSchema,
  title: z.string().min(1),
  from: z.string().min(1).optional(),
  to: z.string().min(1).optional(),
  dateTime: z.string().min(1),
  costStrategy: z.literal("lowest").default("lowest"),
  preference: z.string().min(1),
  details: z.record(z.string(), z.string()).default({}),
  payment: TravelBookingPaymentSchema.default({
    required: true,
    status: "pending",
    note: "Payment confirmation placeholder",
  }),
})

export const TravelPlanSchema = z.object({
  requestSummary: z.string().min(1),
  intent: z.object({
    from: z.string().min(1),
    to: z.string().min(1),
    travelDays: z.number().int().min(1).default(1),
    startDate: z.string().min(1).optional(),
    costStrategy: z.literal("lowest").default("lowest"),
    preferences: z
      .object({
        flight: z.string().optional(),
        bus: z.string().optional(),
        train: z.string().optional(),
        cab: z.string().optional(),
        hotel: z.string().optional(),
        selfDriving: z.string().optional(),
      })
      .default({}),
  }),
  bookings: z.array(TravelBookingSchema).min(1),
  skippedIntegrations: z
    .array(
      z.object({
        requested: z.string().min(1),
        reason: z.string().min(1),
      }),
    )
    .default([]),
  notes: z.array(z.string()).default([]),
})

export const TravelPlanRequestSchema = z.object({
  prompt: z.string().min(1),
  provider: z.enum(["openai", "anthropic", "google"]).optional(),
})

export const TravelBookRequestSchema = z.object({
  booking: TravelBookingSchema,
})

export type TravelPlanInput = z.infer<typeof TravelPlanRequestSchema>
export type TravelPlanOutput = z.infer<typeof TravelPlanSchema>
export type TravelBookingInput = z.infer<typeof TravelBookingSchema>
