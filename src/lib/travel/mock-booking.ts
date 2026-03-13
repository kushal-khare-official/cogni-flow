import type { TravelBookingInput } from "@/lib/travel/schema"

export interface MockBookingResult {
  bookingReference: string
  paymentReference: string
  status: "booked"
  paymentStatus: "done"
  message: string
  estimatedCost: number
}

export interface MockBookingOnlyResult {
  bookingReference: string
  status: "booked"
  message: string
  estimatedCost: number
}

export interface MockPaymentResult {
  paymentReference: string
  status: "done"
  message: string
  amountPaid: number
}

const TYPE_PREFIX: Record<TravelBookingInput["type"], string> = {
  flight: "FLT",
  bus: "BUS",
  train: "TRN",
  cab: "CAB",
  hotel: "HTL",
  selfDriving: "SDR",
}

const MOCK_PRICE_RANGES: Record<TravelBookingInput["type"], { min: number; max: number }> = {
  flight: { min: 4500, max: 12000 },
  hotel: { min: 2000, max: 7500 },
  cab: { min: 350, max: 1800 },
  bus: { min: 600, max: 2200 },
  train: { min: 800, max: 3500 },
  selfDriving: { min: 1500, max: 4500 },
}

function buildReference(prefix: string) {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `${prefix}-${Date.now()}-${random}`
}

function generatePrice(type: TravelBookingInput["type"]): number {
  const range = MOCK_PRICE_RANGES[type]
  return Math.floor(Math.random() * (range.max - range.min) + range.min)
}

export async function executeMockBooking(
  booking: TravelBookingInput,
): Promise<MockBookingResult> {
  const bookingReference = buildReference(TYPE_PREFIX[booking.type])
  const paymentReference = buildReference("PAY")
  const estimatedCost = generatePrice(booking.type)
  const message = `${booking.type} booked successfully with dummy payment completed.`

  return {
    bookingReference,
    paymentReference,
    status: "booked",
    paymentStatus: "done",
    estimatedCost,
    message,
  }
}

export async function executeMockBookingOnly(
  booking: TravelBookingInput,
): Promise<MockBookingOnlyResult> {
  const from = booking.from ?? "N/A"
  const to = booking.to ?? "N/A"
  const estimatedCost = generatePrice(booking.type)
  return {
    bookingReference: buildReference(TYPE_PREFIX[booking.type]),
    status: "booked",
    estimatedCost,
    message: `${booking.type} booking confirmed (${from} -> ${to}) at ${booking.dateTime} with ${booking.preference}.`,
  }
}

export async function executeDummyPayment(
  bookingReference: string,
  amount: number,
): Promise<MockPaymentResult> {
  return {
    paymentReference: buildReference("PAY"),
    status: "done",
    amountPaid: amount,
    message: `Payment of ₹${amount.toLocaleString("en-IN")} processed for ${bookingReference}.`,
  }
}
