export const SUPPORTED_TRAVEL_INTEGRATIONS = [
  "flight",
  "bus",
  "train",
  "cab",
  "hotel",
  "selfDriving",
] as const

export type TravelIntegrationType =
  (typeof SUPPORTED_TRAVEL_INTEGRATIONS)[number]

export type CostStrategy = "lowest"

export interface TravelPreferences {
  flight?: string
  bus?: string
  train?: string
  cab?: string
  hotel?: string
  selfDriving?: string
}

export interface TravelIntent {
  from: string
  to: string
  travelDays: number
  startDate?: string
  costStrategy: CostStrategy
  preferences: TravelPreferences
}

export interface SkippedIntegration {
  requested: string
  reason: string
}

export interface TravelBookingPayment {
  required: boolean
  status: "pending" | "done"
  note: string
}

export interface TravelBooking {
  id: string
  type: TravelIntegrationType
  title: string
  from?: string
  to?: string
  dateTime: string
  costStrategy: CostStrategy
  preference: string
  details: Record<string, string>
  payment: TravelBookingPayment
}

export interface TravelPlan {
  requestSummary: string
  intent: TravelIntent
  bookings: TravelBooking[]
  skippedIntegrations: SkippedIntegration[]
  notes: string[]
}

export type BookingExecutionStatus =
  | "pending"
  | "bookingQueued"
  | "bookingInProgress"
  | "bookingDone"
  | "paymentQueued"
  | "paymentInProgress"
  | "paymentDone"
  | "failed"

export interface BookingExecutionStep {
  booking: TravelBooking
  status: BookingExecutionStatus
  bookingApi?: string
  paymentApi?: string
  bookingReference?: string
  paymentReference?: string
  estimatedCost?: number
  amountPaid?: number
  message?: string
}
