"use client"

import { useCallback, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { TripPromptForm } from "@/components/make-my-trip/TripPromptForm"
import { BookingStepTimeline } from "@/components/make-my-trip/BookingStepTimeline"
import { BookingSummary } from "@/components/make-my-trip/BookingSummary"
import { DayWisePlan } from "@/components/make-my-trip/DayWisePlan"
import { PricingBreakdown } from "@/components/make-my-trip/PricingBreakdown"
import type { TravelPlanOutput, TravelBookingInput } from "@/lib/travel/schema"
import type { BookingExecutionStep } from "@/lib/travel/types"
import { PaymentAgentOnboardDialog } from "@/components/make-my-trip/PaymentAgentOnboardDialog"
import { OnboardedAgentsDialog } from "@/components/make-my-trip/OnboardedAgentsDialog"
import { AgentSelector, type SelectedAgent } from "@/components/make-my-trip/AgentSelector"
import {
  Globe,
  Play,
  CircleCheck,
  Loader2,
  CalendarCheck,
  AlertTriangle,
  Route,
} from "lucide-react"

const BALANCE_WORKFLOW_ID = "cmmrs95cv00028olngwk35neu"
const PAYU_KEY = "szO8St"

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

async function deductViaWorkflow(
  agentId: string,
  captureHash: string,
  amountCents: number,
  bookingReference: string,
): Promise<{ success: boolean; balanceCents?: number; deducted?: number; error?: string }> {
  const res = await fetch(`/api/workflows/${BALANCE_WORKFLOW_ID}/trigger`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId, captureHash, amountCents: String(amountCents), bookingReference }),
  })
  const data = await res.json()

  if (!res.ok || data.status === "failed") {
    return { success: false, error: data.error ?? "Balance deduction workflow failed" }
  }

  const result = data.output?.result ?? data.output ?? {}
  return {
    success: true,
    balanceCents: result.balanceCents,
    deducted: result.deducted,
  }
}

async function capturePayU(
  mihpayid: string,
  txnid: string,
  amount: string,
  hash?: string,
): Promise<{ success: boolean; response?: unknown; error?: string }> {
  const payload: Record<string, string> = { mihpayid, txnid, amount }
  if (hash) payload.hash = hash
  const res = await fetch("/api/payu/capture", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) {
    return { success: false, error: data.error ?? "PayU capture failed" }
  }
  return { success: true, response: data.response }
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
      <Card className="border-emerald-200 bg-emerald-50/60">
        <CardContent className="flex items-center gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500">
            <CircleCheck className="size-5 text-white" />
          </div>
          <div>
            <p className="font-display text-sm font-bold text-emerald-700">All {total} bookings confirmed!</p>
            <p className="text-xs text-emerald-600">Payments completed. Review the summary below.</p>
          </div>
          <div className="ml-auto text-right">
            <p className="font-display text-lg font-extrabold text-emerald-700">{pct}%</p>
            <p className="text-xs text-emerald-600">complete</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (running) {
    return (
      <Card className="border-travel-primary/20 bg-travel-primary-muted/30">
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-travel-primary">
              <Loader2 className="size-5 animate-spin text-white" />
            </div>
            <div className="flex-1">
              <p className="font-display text-sm font-bold text-travel-primary">Processing bookings…</p>
              <p className="text-xs text-muted-foreground">
                {completed} of {total} steps completed
              </p>
            </div>
            <span className="font-display text-lg font-extrabold text-travel-primary">{pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-travel-primary/10">
            <div
              className="h-full rounded-full bg-travel-primary transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </CardContent>
      </Card>
    )
  }

  const pending = steps.filter((s) => s.status === "pending" || s.status === "failed").length

  return (
    <Card className="border-dashed border-travel-primary/20 bg-travel-primary-muted/20">
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-travel-primary">
            <CalendarCheck className="size-5 text-white" />
          </div>
          <div>
            <p className="font-display text-sm font-semibold text-foreground">
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
          className="gap-2 bg-travel-primary px-5 text-travel-primary-foreground hover:bg-travel-primary/90"
        >
          <Play className="size-4" />
          {completed > 0 ? "Book Remaining" : "Book All"}
        </Button>
      </CardContent>
    </Card>
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
  const [selectedAgent, setSelectedAgent] = useState<SelectedAgent | null>(null)

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

  async function processPayment(
    index: number,
    bookingReference: string,
    estimatedCost: number,
  ) {
    if (selectedAgent) {
      const amountCents = Math.round(estimatedCost * 100)

      updateStep(index, (step) => ({
        ...step,
        status: "paymentInProgress",
        paymentApi: `/api/workflows/${BALANCE_WORKFLOW_ID}/trigger`,
        message: `Checking balance & deducting ₹${estimatedCost.toFixed(2)} from ${selectedAgent.name}…`,
      }))

      const deductResult = await deductViaWorkflow(selectedAgent.id, selectedAgent.captureHash, amountCents, bookingReference)

      if (!deductResult.success) {
        throw new Error(deductResult.error ?? "Balance deduction failed")
      }

      if (deductResult.balanceCents != null) {
        setSelectedAgent((prev) =>
          prev ? { ...prev, balanceCents: deductResult.balanceCents! } : null,
        )
      }

      updateStep(index, (step) => ({
        ...step,
        message: `Balance deducted. Capturing payment via PayU…`,
      }))

      const captureResult = await capturePayU(
        selectedAgent.mihpayid,
        selectedAgent.txnid,
        selectedAgent.amount,
        selectedAgent.captureHash || undefined,
      )

      if (!captureResult.success) {
        console.warn("[PayU capture] Non-critical failure:", captureResult.error)
      }

      const balanceDisplay = deductResult.balanceCents != null
        ? `Balance: ₹${(deductResult.balanceCents / 100).toFixed(2)}`
        : ""

      updateStep(index, (step) => ({
        ...step,
        status: "paymentDone",
        paymentReference: `agent_${selectedAgent.id}_${bookingReference}`,
        amountPaid: estimatedCost,
        message: `Paid via ${selectedAgent.name}. ${balanceDisplay}`,
      }))
    } else {
      updateStep(index, (step) => ({
        ...step,
        status: "paymentInProgress",
        paymentApi: "/api/travel/mock/dummy-payment",
        message: "Calling /api/travel/mock/dummy-payment…",
      }))

      const paymentResponse = await fetch("/api/travel/mock/dummy-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingReference, amount: estimatedCost }),
      })
      const paymentData = (await paymentResponse.json()) as PaymentApiResponse | { error: string }

      if (!paymentResponse.ok || "error" in paymentData) {
        throw new Error("error" in paymentData ? paymentData.error : "Payment failed")
      }

      updateStep(index, (step) => ({
        ...step,
        status: "paymentDone",
        paymentReference: paymentData.paymentReference,
        amountPaid: paymentData.amountPaid,
        message: paymentData.message,
      }))
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
          paymentApi: selectedAgent
            ? `/api/agents/${selectedAgent.id}/deduct-balance`
            : "/api/travel/mock/dummy-payment",
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

        await processPayment(index, data.bookingReference, data.estimatedCost)
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
        paymentApi: selectedAgent
          ? `/api/agents/${selectedAgent.id}/deduct-balance`
          : "/api/travel/mock/dummy-payment",
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

      await processPayment(index, data.bookingReference, data.estimatedCost)
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
  }, [plan, steps, selectedAgent]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">

        {/* ── Header ── */}
        <header className="flex items-center gap-4">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-travel-primary shadow-lg shadow-travel-primary/20">
            <Globe className="size-5 text-travel-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-foreground">Make My Trip</h1>
            <p className="text-sm text-muted-foreground">AI-powered travel booking agent</p>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <OnboardedAgentsDialog />
            <PaymentAgentOnboardDialog />
            {plan && (
              <>
                <Badge className="bg-travel-primary text-travel-primary-foreground">
                  <Route className="mr-1 size-3" />
                  {plan.intent.from} → {plan.intent.to}
                </Badge>
                <Badge variant="outline">
                  {plan.intent.travelDays}d · {plan.bookings.length} bookings
                </Badge>
              </>
            )}
          </div>
        </header>

        <Separator />

        {/* ── Agent Selector ── */}
        <div className="flex items-center justify-between">
          <AgentSelector selectedAgent={selectedAgent} onSelect={setSelectedAgent} />
          {selectedAgent && (
            <p className="text-xs text-muted-foreground">
              Bookings will be paid via <span className="font-medium text-foreground">{selectedAgent.name}</span>
            </p>
          )}
          {!selectedAgent && (
            <p className="text-xs text-muted-foreground">
              No agent selected — using mock payments
            </p>
          )}
        </div>

        {/* ── Error banner ── */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* ── Prompt ── */}
        <TripPromptForm loading={loadingPlan} onGenerate={handleGenerate} />

        {/* ── Day-wise Itinerary ── */}
        <DayWisePlan plan={plan} />

        {/* ── Pricing Breakdown ── */}
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

        {/* ── Booking Execution ── */}
        {steps.length > 0 && (
          <Card>
            <CardContent>
              <div className="mb-4 flex items-center gap-2">
                <div className="h-5 w-1 rounded-full bg-travel-primary" />
                <h2 className="font-display text-sm font-bold text-foreground">Booking Execution</h2>
                <span className="ml-auto text-xs text-muted-foreground">
                  {completedBookings}/{steps.length} completed
                </span>
              </div>
              <BookingStepTimeline steps={steps} onBookItem={runSingleBooking} busy={anyBusy} />
            </CardContent>
          </Card>
        )}

        {/* ── Summary ── */}
        {allDone && plan && (
          <BookingSummary plan={plan} steps={steps} />
        )}

      </div>
    </main>
  )
}
