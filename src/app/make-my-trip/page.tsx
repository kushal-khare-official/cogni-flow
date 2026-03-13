"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { TripPromptForm } from "@/components/make-my-trip/TripPromptForm"
import { BookingStepTimeline } from "@/components/make-my-trip/BookingStepTimeline"
import { BookingSummary } from "@/components/make-my-trip/BookingSummary"
import { DayWisePlan } from "@/components/make-my-trip/DayWisePlan"
import { PricingBreakdown } from "@/components/make-my-trip/PricingBreakdown"
import type { TravelPlanOutput, TravelBookingInput } from "@/lib/travel/schema"
import type { BookingExecutionStep } from "@/lib/travel/types"
import {
  Compass,
  PlayCircle,
  CheckCircle,
  Loader2,
  CalendarCheck,
  AlertTriangle,
} from "lucide-react"

interface TravelPlanApiResponse {
  provider: "openai" | "anthropic" | "google"
  plan: TravelPlanOutput
}

interface BookApiResponse {
  api: string
  bookingReference: string
  estimatedCost: number
  message: string
}

interface PaymentApiResponse {
  api: string
  paymentReference: string
  amountPaid: number
  message: string
}

function getBookingApiPath(type: TravelBookingInput["type"]) {
  if (type === "flight") return "/api/travel/mock/flight-booking"
  if (type === "bus") return "/api/travel/mock/bus-booking"
  if (type === "train") return "/api/travel/mock/train-booking"
  if (type === "cab") return "/api/travel/mock/cab-booking"
  if (type === "hotel") return "/api/travel/mock/hotel-booking"
  return "/api/travel/mock/self-driving-booking"
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/* ─── Process Banner ─────────────────────────────────────────── */
interface ProcessBannerProps {
  plan: TravelPlanOutput | null
  steps: BookingExecutionStep[]
  running: boolean
  completed: number
  onRun: () => void
}

function ProcessBanner({ plan, steps, running, completed, onRun }: ProcessBannerProps) {
  if (!plan) return null

  const total = steps.length
  const allDone = completed === total && total > 0
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  if (allDone) {
    return (
      <div
        className="flex items-center gap-4 rounded-xl border px-5 py-4"
        style={{ backgroundColor: "#f0fdf4", borderColor: "#86efac" }}
      >
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: "#10b981" }}
        >
          <CheckCircle className="size-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-green-700">All {total} bookings confirmed!</p>
          <p className="text-xs text-green-600">Payments completed. Review the summary below.</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-lg font-extrabold text-green-700">{pct}%</p>
          <p className="text-xs text-green-600">complete</p>
        </div>
      </div>
    )
  }

  if (running) {
    return (
      <div
        className="space-y-3 rounded-xl border px-5 py-4"
        style={{
          background: "linear-gradient(135deg, #3b82f608 0%, #6366f108 100%)",
          borderColor: "#3b82f630",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
          >
            <Loader2 className="size-5 animate-spin text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: "#3b82f6" }}>Processing bookings…</p>
            <p className="text-xs text-muted-foreground">
              {completed} of {total} steps completed · booking and payment in progress
            </p>
          </div>
          <span className="text-lg font-extrabold" style={{ color: "#6366f1" }}>{pct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-blue-100">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(90deg, #3b82f6, #6366f1)",
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-4 rounded-xl border px-5 py-4"
      style={{
        background: "linear-gradient(135deg, #3b82f606 0%, #6366f106 100%)",
        borderColor: "#6366f128",
        borderStyle: "dashed",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
        >
          <CalendarCheck className="size-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Ready to process {total} bookings</p>
          <p className="text-xs text-muted-foreground">
            Review the pricing above, then click to start booking.
          </p>
        </div>
      </div>
      <Button
        onClick={onRun}
        className="gap-2 px-5"
        style={{ background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)" }}
      >
        <PlayCircle className="size-4" />
        Process Bookings
      </Button>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────── */

export default function MakeMyTripPage() {
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [runningFlow, setRunningFlow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [plan, setPlan] = useState<TravelPlanOutput | null>(null)
  const [steps, setSteps] = useState<BookingExecutionStep[]>([])

  const completedBookings = useMemo(
    () => steps.filter((step) => step.status === "paymentDone").length,
    [steps],
  )

  const allDone = completedBookings === steps.length && steps.length > 0

  function updateStep(
    index: number,
    updater: (step: BookingExecutionStep) => BookingExecutionStep,
  ) {
    setSteps((current) => current.map((step, i) => (i === index ? updater(step) : step)))
  }

  async function handleGenerate(input: { prompt: string }) {
    setLoadingPlan(true)
    setError(null)
    setPlan(null)
    setSteps([])

    try {
      const response = await fetch("/api/travel/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      const data = (await response.json()) as TravelPlanApiResponse | { error: string }

      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Failed to generate itinerary")
      }

      setPlan(data.plan)
      setSteps(data.plan.bookings.map((booking) => ({ booking, status: "pending" })))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate itinerary")
    } finally {
      setLoadingPlan(false)
    }
  }

  async function runFlow() {
    if (!plan || steps.length === 0) return
    setRunningFlow(true)
    setError(null)

    try {
      for (let index = 0; index < plan.bookings.length; index++) {
        const booking: TravelBookingInput = plan.bookings[index]
        const bookingApiPath = getBookingApiPath(booking.type)

        updateStep(index, (step) => ({
          ...step,
          status: "bookingQueued",
          bookingApi: bookingApiPath,
          paymentApi: "/api/travel/mock/dummy-payment",
          message: "Booking queued.",
        }))
        await sleep(350)

        updateStep(index, (step) => ({
          ...step,
          status: "bookingInProgress",
          message: `Calling ${bookingApiPath}…`,
        }))

        const response = await fetch(bookingApiPath, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ booking }),
        })
        const data = (await response.json()) as BookApiResponse | { error: string }

        if (!response.ok || "error" in data) {
          throw new Error("error" in data ? data.error : `Booking failed for ${booking.type}`)
        }

        updateStep(index, (step) => ({
          ...step,
          status: "bookingDone",
          bookingReference: data.bookingReference,
          estimatedCost: data.estimatedCost,
          message: data.message,
        }))
        await sleep(450)

        updateStep(index, (step) => ({
          ...step,
          status: "paymentQueued",
          message: "Payment queued.",
        }))
        await sleep(300)

        updateStep(index, (step) => ({
          ...step,
          status: "paymentInProgress",
          message: "Calling /api/travel/mock/dummy-payment…",
        }))

        const paymentResponse = await fetch("/api/travel/mock/dummy-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingReference: data.bookingReference,
            amount: data.estimatedCost,
          }),
        })
        const paymentData = (await paymentResponse.json()) as PaymentApiResponse | { error: string }

        if (!paymentResponse.ok || "error" in paymentData) {
          throw new Error(
            "error" in paymentData ? paymentData.error : `Payment failed for ${booking.type}`,
          )
        }

        updateStep(index, (step) => ({
          ...step,
          status: "paymentDone",
          paymentReference: paymentData.paymentReference,
          amountPaid: paymentData.amountPaid,
          message: paymentData.message,
        }))
        await sleep(250)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking flow failed")
      setSteps((current) => {
        const next = [...current]
        const activeIndex = next.findIndex(
          (step) =>
            step.status === "bookingQueued" ||
            step.status === "bookingInProgress" ||
            step.status === "bookingDone" ||
            step.status === "paymentQueued" ||
            step.status === "paymentInProgress",
        )
        if (activeIndex >= 0) {
          next[activeIndex] = {
            ...next[activeIndex],
            status: "failed",
            message: "Step failed during execution.",
          }
        }
        return next
      })
    } finally {
      setRunningFlow(false)
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">

        {/* ── Header ── */}
        <header className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4">
          <div
            className="flex size-10 items-center justify-center rounded-xl"
            style={{
              background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
              boxShadow: "0 2px 16px #3b82f635",
            }}
          >
            <Compass className="size-5 text-white" />
          </div>
          <div>
            <p className="text-base font-bold tracking-tight">Make My Trip</p>
            <p className="text-xs text-muted-foreground">AI-powered travel booking agent</p>
          </div>

          {/* Trip info pill — appears after plan */}
          {plan && (
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold text-white"
                style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
              >
                {plan.intent.from} → {plan.intent.to}
              </span>
              <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground">
                {plan.intent.travelDays}d · {plan.bookings.length} bookings
              </span>
            </div>
          )}
        </header>

        {/* ── Error banner ── */}
        {error && (
          <div
            className="flex items-center gap-2 rounded-xl border px-4 py-3"
            style={{ backgroundColor: "#fef2f2", borderColor: "#fca5a5" }}
          >
            <AlertTriangle className="size-4 shrink-0 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* ── Prompt ── */}
        <TripPromptForm loading={loadingPlan} onGenerate={handleGenerate} />

        {/* ── Day-wise Itinerary (full width) ── */}
        <DayWisePlan plan={plan} />

        {/* ── Pricing Breakdown (shown after plan, before process) ── */}
        {plan && !runningFlow && !allDone && (
          <PricingBreakdown plan={plan} />
        )}

        {/* ── Process banner ── */}
        <ProcessBanner
          plan={plan}
          steps={steps}
          running={runningFlow}
          completed={completedBookings}
          onRun={runFlow}
        />

        {/* ── Booking Execution (full landscape grid) ── */}
        {steps.length > 0 && (
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <div
                className="h-4 w-1 rounded"
                style={{ background: "linear-gradient(180deg, #3b82f6, #6366f1)" }}
              />
              <h2 className="text-sm font-bold text-foreground">Booking Execution</h2>
              <span className="ml-auto text-xs text-muted-foreground">
                {completedBookings}/{steps.length} completed
              </span>
            </div>
            <BookingStepTimeline steps={steps} />
          </section>
        )}

        {/* ── Summary (shown once all done) ── */}
        {allDone && plan && (
          <BookingSummary plan={plan} steps={steps} />
        )}

      </div>
    </main>
  )
}
