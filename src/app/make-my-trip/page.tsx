"use client"

import { useCallback, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { TripPromptForm } from "@/components/make-my-trip/TripPromptForm"
import { BookingStepTimeline } from "@/components/make-my-trip/BookingStepTimeline"
import { BookingSummary } from "@/components/make-my-trip/BookingSummary"
import { DayWisePlan } from "@/components/make-my-trip/DayWisePlan"
import { PricingBreakdown } from "@/components/make-my-trip/PricingBreakdown"
import type { TravelPlanOutput, TravelBookingInput } from "@/lib/travel/schema"
import type { BookingExecutionStep } from "@/lib/travel/types"
import { PaymentAgentOnboardDialog } from "@/components/make-my-trip/PaymentAgentOnboardDialog"
import { OnboardedAgentsDialog } from "@/components/make-my-trip/OnboardedAgentsDialog"
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
  busy: boolean
  completed: number
  onRun: () => void
}

function ProcessBanner({ plan, steps, running, busy, completed, onRun }: ProcessBannerProps) {
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

  const pending = steps.filter((s) => s.status === "pending" || s.status === "failed").length

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
          <p className="text-sm font-semibold text-foreground">
            {completed > 0
              ? `${pending} remaining booking${pending !== 1 ? "s" : ""}`
              : `Ready to process ${total} bookings`}
          </p>
          <p className="text-xs text-muted-foreground">
            Book all at once, or pick individual items from the pricing breakdown above.
          </p>
        </div>
      </div>
      <Button
        onClick={onRun}
        disabled={busy || pending === 0}
        className="gap-2 px-5"
        style={
          busy || pending === 0
            ? undefined
            : { background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)" }
        }
      >
        <PlayCircle className="size-4" />
        {completed > 0 ? "Book Remaining" : "Book All"}
      </Button>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────── */

export default function MakeMyTripPage() {
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [runningFlow, setRunningFlow] = useState(false)
  const [bookingItemId, setBookingItemId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [plan, setPlan] = useState<TravelPlanOutput | null>(null)
  const [steps, setSteps] = useState<BookingExecutionStep[]>([])

  const completedBookings = useMemo(
    () => steps.filter((step) => step.status === "paymentDone").length,
    [steps],
  )

  const anyBusy = runningFlow || bookingItemId !== null

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
        if (steps[index].status === "paymentDone") continue
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

  const runSingleBooking = useCallback(async (bookingId: string) => {
    if (!plan) return
    const index = steps.findIndex((s) => s.booking.id === bookingId)
    if (index < 0) return
    const step = steps[index]
    if (step.status !== "pending" && step.status !== "failed") return

    setBookingItemId(bookingId)
    setError(null)

    try {
      const booking: TravelBookingInput = plan.bookings[index]
      const bookingApiPath = getBookingApiPath(booking.type)

      updateStep(index, (s) => ({
        ...s,
        status: "bookingQueued",
        bookingApi: bookingApiPath,
        paymentApi: "/api/travel/mock/dummy-payment",
        message: "Booking queued.",
      }))
      await sleep(350)

      updateStep(index, (s) => ({
        ...s,
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

      updateStep(index, (s) => ({
        ...s,
        status: "bookingDone",
        bookingReference: data.bookingReference,
        estimatedCost: data.estimatedCost,
        message: data.message,
      }))
      await sleep(450)

      updateStep(index, (s) => ({ ...s, status: "paymentQueued", message: "Payment queued." }))
      await sleep(300)

      updateStep(index, (s) => ({
        ...s,
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

      updateStep(index, (s) => ({
        ...s,
        status: "paymentDone",
        paymentReference: paymentData.paymentReference,
        amountPaid: paymentData.amountPaid,
        message: paymentData.message,
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed")
      updateStep(index, (s) => ({
        ...s,
        status: "failed",
        message: "Step failed during execution.",
      }))
    } finally {
      setBookingItemId(null)
    }
  }, [plan, steps])

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

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <OnboardedAgentsDialog />
            <PaymentAgentOnboardDialog />
            {plan && (
              <>
                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
                >
                  {plan.intent.from} → {plan.intent.to}
                </span>
                <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground">
                  {plan.intent.travelDays}d · {plan.bookings.length} bookings
                </span>
              </>
            )}
          </div>
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

        {/* ── Pricing Breakdown (shown after plan, hidden once all done) ── */}
        {plan && !allDone && (
          <PricingBreakdown
            plan={plan}
            steps={steps}
            onBookItem={runSingleBooking}
            busy={anyBusy}
          />
        )}

        {/* ── Process banner ── */}
        <ProcessBanner
          plan={plan}
          steps={steps}
          running={runningFlow}
          busy={anyBusy}
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
            <BookingStepTimeline steps={steps} onBookItem={runSingleBooking} busy={anyBusy} />
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
