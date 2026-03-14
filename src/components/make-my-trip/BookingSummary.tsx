"use client"

import type { TravelPlanOutput } from "@/lib/travel/schema"
import type { BookingExecutionStep, TravelIntegrationType } from "@/lib/travel/types"
import {
  Plane, Hotel, Car, Bus, TrainFront,
  Check, AlertCircle, CreditCard, IndianRupee,
} from "lucide-react"

const TYPE_ICON: Record<TravelIntegrationType, React.ElementType> = {
  flight: Plane,
  hotel: Hotel,
  cab: Car,
  bus: Bus,
  train: TrainFront,
  selfDriving: Car,
}

const TYPE_LABEL: Record<TravelIntegrationType, string> = {
  flight: "Flight",
  hotel: "Hotel",
  cab: "Cab",
  bus: "Bus",
  train: "Train",
  selfDriving: "Self Drive",
}

function fmtINR(n: number) {
  return `₹${n.toLocaleString("en-IN")}`
}

interface BookingSummaryProps {
  plan: TravelPlanOutput
  steps: BookingExecutionStep[]
}

export function BookingSummary({ plan, steps }: BookingSummaryProps) {
  const confirmed = steps.filter((s) => s.status === "paymentDone")
  const failed = steps.filter((s) => s.status === "failed")
  const totalPaid = confirmed.reduce((sum, s) => sum + (s.amountPaid ?? s.estimatedCost ?? 0), 0)

  const typeCounts = plan.bookings.reduce<Record<string, number>>((acc, b) => {
    acc[b.type] = (acc[b.type] ?? 0) + 1
    return acc
  }, {})

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div
        className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
        style={{ background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)" }}
      >
        <div>
          <p className="text-sm font-bold text-white">Trip Summary</p>
          <p className="text-xs text-blue-100 mt-0.5 max-w-xs">{plan.requestSummary}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-extrabold text-white">{fmtINR(totalPaid)}</p>
          <p className="text-xs text-blue-100">total amount paid</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
        <div className="px-4 py-3 text-center">
          <p className="text-lg font-bold text-foreground">{plan.bookings.length}</p>
          <p className="text-xs text-muted-foreground">Bookings</p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-lg font-bold" style={{ color: "#10b981" }}>{confirmed.length}</p>
          <p className="text-xs text-muted-foreground">Confirmed</p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-lg font-bold" style={{ color: failed.length > 0 ? "#ef4444" : "#94a3b8" }}>
            {failed.length}
          </p>
          <p className="text-xs text-muted-foreground">Failed</p>
        </div>
      </div>

      {/* Per-type breakdown */}
      <div className="p-4">
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Booking Breakdown
        </p>
        <div className="space-y-1.5">
          {(Object.entries(typeCounts) as [TravelIntegrationType, number][]).map(([type, count]) => {
            const Icon = TYPE_ICON[type]
            const typeSteps = steps.filter((s) => s.booking.type === type)
            const typePaid = typeSteps.reduce((sum, s) => sum + (s.amountPaid ?? s.estimatedCost ?? 0), 0)
            const typeDone = typeSteps.filter((s) => s.status === "paymentDone").length
            return (
              <div
                key={type}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                style={{ backgroundColor: "#f8fafc" }}
              >
                <div
                  className="flex size-7 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: "linear-gradient(135deg, #3b82f610, #6366f110)" }}
                >
                  <Icon className="size-3.5" style={{ color: "#6366f1" }} />
                </div>
                <p className="flex-1 text-sm font-medium text-foreground">{TYPE_LABEL[type]}</p>
                <span className="text-xs text-muted-foreground">{count}x</span>
                {typePaid > 0 && (
                  <span className="flex items-center gap-0.5 text-xs font-semibold" style={{ color: "#3b82f6" }}>
                    <IndianRupee className="size-3" />
                    {typePaid.toLocaleString("en-IN")}
                  </span>
                )}
                {typeSteps.length > 0 && (
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{
                      backgroundColor: typeDone === typeSteps.length ? "#10b98115" : "#3b82f610",
                      color: typeDone === typeSteps.length ? "#10b981" : "#3b82f6",
                    }}
                  >
                    {typeDone}/{typeSteps.length}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Confirmed bookings list */}
      {confirmed.length > 0 && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Confirmed Bookings
          </p>
          <div className="space-y-1.5">
            {confirmed.map((step) => (
              <div
                key={step.booking.id}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                style={{ backgroundColor: "#f0fdf4" }}
              >
                <Check className="size-3.5 shrink-0 text-green-500" />
                <p className="flex-1 truncate text-sm font-medium text-foreground">{step.booking.title}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <CreditCard className="size-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{step.paymentReference ?? "Paid"}</span>
                  {step.amountPaid != null && step.amountPaid > 0 && (
                    <span className="font-semibold text-xs" style={{ color: "#10b981" }}>
                      {fmtINR(step.amountPaid)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skipped integrations */}
      {plan.skippedIntegrations.length > 0 && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Skipped
          </p>
          <div className="space-y-1">
            {plan.skippedIntegrations.map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg px-3 py-2"
                style={{ backgroundColor: "#fef2f2" }}
              >
                <AlertCircle className="size-3.5 shrink-0 text-red-400" />
                <p className="flex-1 text-xs text-red-600">{s.requested}</p>
                <span className="text-xs text-red-400">{s.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
