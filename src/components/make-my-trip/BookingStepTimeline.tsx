"use client"

import { useEffect, useRef } from "react"
import type { BookingExecutionStep, TravelIntegrationType } from "@/lib/travel/types"
import {
  Plane, Hotel, Car, Bus, TrainFront,
  Check, Loader2, Clock, AlertCircle, CreditCard, IndianRupee, ArrowDown,
} from "lucide-react"

/* ── Per-type colors ─────────────────────────────────────────── */
const TYPE_COLOR: Record<TravelIntegrationType, { accent: string; light: string; border: string; text: string }> = {
  flight:      { accent: "#3b82f6", light: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
  hotel:       { accent: "#8b5cf6", light: "#f5f3ff", border: "#ddd6fe", text: "#6d28d9" },
  cab:         { accent: "#f59e0b", light: "#fffbeb", border: "#fde68a", text: "#b45309" },
  bus:         { accent: "#10b981", light: "#f0fdf4", border: "#a7f3d0", text: "#047857" },
  train:       { accent: "#06b6d4", light: "#ecfeff", border: "#a5f3fc", text: "#0e7490" },
  selfDriving: { accent: "#f97316", light: "#fff7ed", border: "#fed7aa", text: "#c2410c" },
}

const TYPE_ICON: Record<TravelIntegrationType, React.ElementType> = {
  flight: Plane, hotel: Hotel, cab: Car, bus: Bus, train: TrainFront, selfDriving: Car,
}

const TYPE_LABEL: Record<TravelIntegrationType, string> = {
  flight: "Flight", hotel: "Hotel", cab: "Cab",
  bus: "Bus", train: "Train", selfDriving: "Self Drive",
}

function fmtINR(n: number) {
  return `₹${n.toLocaleString("en-IN")}`
}

function statusLabel(step: BookingExecutionStep): string {
  switch (step.status) {
    case "bookingQueued":     return "Queued"
    case "bookingInProgress": return "Booking in progress…"
    case "bookingDone":       return "Booking confirmed"
    case "paymentQueued":     return "Payment queued"
    case "paymentInProgress": return "Processing payment…"
    case "paymentDone":       return "Confirmed & Paid"
    case "failed":            return "Failed"
    default:                  return "Pending"
  }
}

function isActive(s: BookingExecutionStep) {
  return ["bookingQueued", "bookingInProgress", "bookingDone", "paymentQueued", "paymentInProgress"].includes(s.status)
}
function isDone(s: BookingExecutionStep)    { return s.status === "paymentDone" }
function isFailed(s: BookingExecutionStep)  { return s.status === "failed" }
function isPending(s: BookingExecutionStep) { return s.status === "pending" }

function bookingSubDone(s: BookingExecutionStep) {
  return ["bookingDone", "paymentQueued", "paymentInProgress", "paymentDone"].includes(s.status)
}
function paymentSubActive(s: BookingExecutionStep) {
  return s.status === "paymentInProgress" || s.status === "paymentQueued"
}

interface BookingStepTimelineProps {
  steps: BookingExecutionStep[]
}

export function BookingStepTimeline({ steps }: BookingStepTimelineProps) {
  const activeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [steps])

  if (!steps.length) return null

  const doneCount = steps.filter(isDone).length
  const total     = steps.length
  const pct       = Math.round((doneCount / total) * 100)

  return (
    <div className="space-y-0">

      {/* ── Overall progress bar ─────────────────────────────── */}
      <div
        className="mb-5 rounded-2xl border px-5 py-4 space-y-2.5"
        style={{
          background: "linear-gradient(135deg, #3b82f608, #6366f108)",
          borderColor: "#6366f125",
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-foreground">Overall Progress</span>
          <span className="text-sm font-extrabold" style={{ color: "#6366f1" }}>{pct}% complete</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(90deg, #3b82f6, #6366f1)",
            }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{doneCount} of {total} bookings completed</span>
          <span>{total - doneCount} remaining</span>
        </div>
      </div>

      {/* ── Step cards — vertical flow ───────────────────────── */}
      <div className="space-y-1.5">
        {steps.map((step, idx) => {
          const active  = isActive(step)
          const done_s  = isDone(step)
          const failed  = isFailed(step)
          const pending = isPending(step)
          const Icon    = TYPE_ICON[step.booking.type]
          const tc      = TYPE_COLOR[step.booking.type]
          const isLast  = idx === steps.length - 1

          return (
            <div key={step.booking.id}>
              <div
                ref={active ? activeRef : null}
                className="overflow-hidden rounded-2xl border transition-all duration-300"
                style={{
                  borderColor: done_s ? "#a7f3d0" : active ? tc.border : failed ? "#fecaca" : "#e2e8f0",
                  boxShadow:   done_s
                    ? "0 1px 6px #10b98118"
                    : active
                      ? `0 0 0 3px ${tc.accent}18, 0 2px 8px ${tc.accent}12`
                      : "none",
                  background: done_s
                    ? "#f0fdf4"
                    : active
                      ? "#fff"
                      : failed
                        ? "#fef2f2"
                        : "#fafafa",
                }}
              >
                {/* ── Main row ── */}
                <div className="flex items-center gap-3 px-4 py-3.5">

                  {/* Left: type icon with type color — always visible */}
                  <div
                    className="relative flex size-10 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: tc.light,
                      border: `1.5px solid ${tc.border}`,
                    }}
                  >
                    <Icon className="size-4.5" style={{ color: tc.accent, width: 18, height: 18 }} />

                    {/* Status badge overlaid bottom-right */}
                    {done_s && (
                      <span
                        className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full"
                        style={{ background: "linear-gradient(135deg, #10b981, #059669)", border: "1.5px solid #fff" }}
                      >
                        <Check className="size-2 text-white" />
                      </span>
                    )}
                    {active && (
                      <span
                        className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full"
                        style={{ background: `linear-gradient(135deg, ${tc.accent}, #6366f1)`, border: "1.5px solid #fff" }}
                      >
                        <Loader2 className="size-2 animate-spin text-white" />
                      </span>
                    )}
                    {failed && (
                      <span
                        className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full"
                        style={{ backgroundColor: "#ef4444", border: "1.5px solid #fff" }}
                      >
                        <AlertCircle className="size-2 text-white" />
                      </span>
                    )}
                  </div>

                  {/* Middle: title + type label + status */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">
                      {step.booking.title}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      {/* Type chip */}
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-semibold"
                        style={{ backgroundColor: tc.light, color: tc.text, border: `1px solid ${tc.border}` }}
                      >
                        {TYPE_LABEL[step.booking.type]}
                      </span>
                      {/* Status text */}
                      <span
                        className="text-xs font-medium"
                        style={{
                          color: done_s ? "#10b981" : active ? tc.accent : failed ? "#ef4444" : "#94a3b8",
                        }}
                      >
                        {statusLabel(step)}
                      </span>
                    </div>
                  </div>

                  {/* Right: amount */}
                  {(step.amountPaid != null && step.amountPaid > 0) && (
                    <div className="shrink-0 text-right">
                      <p
                        className="flex items-center gap-0.5 text-sm font-extrabold"
                        style={{ color: done_s ? "#10b981" : active ? tc.accent : "#94a3b8" }}
                      >
                        <IndianRupee className="size-3" />
                        {step.amountPaid.toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs text-muted-foreground">paid</p>
                    </div>
                  )}
                  {/* Estimated cost when not yet paid */}
                  {!(step.amountPaid != null && step.amountPaid > 0) && step.estimatedCost && (
                    <div className="shrink-0 text-right">
                      <p
                        className="flex items-center gap-0.5 text-sm font-semibold"
                        style={{ color: tc.accent }}
                      >
                        <IndianRupee className="size-3" />
                        {step.estimatedCost.toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs text-muted-foreground">est.</p>
                    </div>
                  )}
                </div>

                {/* ── Active: sub-step 2-col panel ── */}
                {active && (
                  <div
                    className="grid grid-cols-2 gap-3 border-t px-4 pb-4 pt-3"
                    style={{ borderColor: `${tc.border}80` }}
                  >
                    {/* Booking sub */}
                    <div
                      className="flex items-start gap-2.5 rounded-xl p-3"
                      style={{
                        backgroundColor: bookingSubDone(step) ? "#f0fdf4" : tc.light,
                        border: `1px solid ${bookingSubDone(step) ? "#a7f3d0" : tc.border}`,
                      }}
                    >
                      <div
                        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full"
                        style={{
                          background: bookingSubDone(step)
                            ? "linear-gradient(135deg, #10b981, #059669)"
                            : step.status === "bookingInProgress"
                              ? `linear-gradient(135deg, ${tc.accent}, #6366f1)`
                              : "#e2e8f0",
                        }}
                      >
                        {bookingSubDone(step) ? (
                          <Check className="size-2.5 text-white" />
                        ) : step.status === "bookingInProgress" ? (
                          <Loader2 className="size-2.5 animate-spin text-white" />
                        ) : (
                          <Clock className="size-2.5 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground">Booking</p>
                        <p className="text-xs text-muted-foreground truncate">{step.bookingApi ?? "API"}</p>
                        {step.bookingReference && (
                          <p className="mt-0.5 text-xs font-medium text-green-600 break-all">{step.bookingReference}</p>
                        )}
                      </div>
                    </div>

                    {/* Payment sub */}
                    <div
                      className="flex items-start gap-2.5 rounded-xl p-3"
                      style={{
                        backgroundColor: step.status === "paymentDone" ? "#f0fdf4" : paymentSubActive(step) ? tc.light : "#f8fafc",
                        border: `1px solid ${step.status === "paymentDone" ? "#a7f3d0" : paymentSubActive(step) ? tc.border : "#e2e8f0"}`,
                      }}
                    >
                      <div
                        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full"
                        style={{
                          background: step.status === "paymentDone"
                            ? "linear-gradient(135deg, #10b981, #059669)"
                            : paymentSubActive(step)
                              ? `linear-gradient(135deg, ${tc.accent}, #6366f1)`
                              : "#e2e8f0",
                        }}
                      >
                        {step.status === "paymentDone" ? (
                          <Check className="size-2.5 text-white" />
                        ) : paymentSubActive(step) ? (
                          <Loader2 className="size-2.5 animate-spin text-white" />
                        ) : (
                          <CreditCard className="size-2.5 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground">Payment</p>
                        <p className="text-xs text-muted-foreground truncate">{step.paymentApi ?? "API"}</p>
                        {step.estimatedCost && (
                          <p className="mt-0.5 flex items-center gap-0.5 text-xs font-medium" style={{ color: tc.accent }}>
                            <IndianRupee className="size-2.5" />
                            {step.estimatedCost.toLocaleString("en-IN")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Done: compact ref footer ── */}
                {done_s && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-green-100 bg-green-50/60 px-4 py-2">
                    {step.bookingReference && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Check className="size-2.5 text-green-500" />
                        {step.bookingReference}
                      </span>
                    )}
                    {step.paymentReference && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <CreditCard className="size-2.5 text-green-500" />
                        {step.paymentReference}
                      </span>
                    )}
                    {step.amountPaid != null && step.amountPaid > 0 && (
                      <span
                        className="ml-auto flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold text-white"
                        style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
                      >
                        <IndianRupee className="size-2.5" />
                        {fmtINR(step.amountPaid)} paid
                      </span>
                    )}
                  </div>
                )}

                {/* ── Failed footer ── */}
                {failed && step.message && (
                  <div className="border-t border-red-100 bg-red-50 px-4 py-2">
                    <p className="text-xs text-red-600">{step.message}</p>
                  </div>
                )}

                {/* ── Pending footer ── */}
                {pending && (
                  <div className="flex items-center gap-1.5 border-t border-slate-100 px-4 py-2">
                    <Clock className="size-3 text-slate-300" />
                    <p className="text-xs text-slate-400">Waiting to start</p>
                  </div>
                )}
              </div>

              {/* Arrow between cards */}
              {!isLast && (
                <div className="flex justify-center py-1">
                  <ArrowDown className="size-3.5 text-slate-300" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
