"use client"

import { useEffect, useRef } from "react"
import type { BookingExecutionStep } from "@/lib/travel/types"
import {
  Check, Loader2, Clock, AlertCircle, CreditCard, IndianRupee, ArrowDown, ShoppingCart,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TYPE_COLOR, TYPE_ICON, TYPE_LABEL, fmtINR } from "@/lib/travel/ui-constants"
import { cn } from "@/lib/utils"

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
  onBookItem?: (bookingId: string) => void
  busy?: boolean
}

export function BookingStepTimeline({ steps, onBookItem, busy = false }: BookingStepTimelineProps) {
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

      {/* ── Overall progress ── */}
      <Card className="mb-5 border-travel-primary/15 bg-travel-primary-muted/20">
        <CardContent className="space-y-2.5">
          <Progress value={pct}>
            <span className="font-display text-sm font-bold text-foreground">Overall Progress</span>
            <span className="ml-auto font-display text-sm font-extrabold text-travel-primary">{pct}% complete</span>
          </Progress>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{doneCount} of {total} bookings completed</span>
            <span>{total - doneCount} remaining</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Step cards ── */}
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
              <Card
                ref={active ? activeRef : null}
                className={cn(
                  "transition-all duration-300",
                  done_s && "border-emerald-200 bg-emerald-50/50",
                  active && "ring-2 ring-travel-primary/20",
                  failed && "border-red-200 bg-red-50/50",
                  pending && "bg-muted/30",
                )}
              >
                {/* ── Main row ── */}
                <CardContent className="flex items-center gap-3">
                  <div className={cn("relative flex size-10 shrink-0 items-center justify-center rounded-xl border", tc.light, tc.border)}>
                    <Icon className={cn("size-[18px]", tc.accent)} />

                    {done_s && (
                      <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full border-[1.5px] border-white bg-emerald-500">
                        <Check className="size-2 text-white" />
                      </span>
                    )}
                    {active && (
                      <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full border-[1.5px] border-white bg-travel-primary">
                        <Loader2 className="size-2 animate-spin text-white" />
                      </span>
                    )}
                    {failed && (
                      <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full border-[1.5px] border-white bg-red-500">
                        <AlertCircle className="size-2 text-white" />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-bold text-foreground">
                      {step.booking.title}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className={cn("text-[10px]", tc.light, tc.text, tc.border)}>
                        {TYPE_LABEL[step.booking.type]}
                      </Badge>
                      <span className={cn(
                        "text-xs font-medium",
                        done_s && "text-emerald-500",
                        active && "text-travel-primary",
                        failed && "text-red-500",
                        pending && "text-muted-foreground",
                      )}>
                        {statusLabel(step)}
                      </span>
                    </div>
                  </div>

                  {(step.amountPaid != null && step.amountPaid > 0) && (
                    <div className="shrink-0 text-right">
                      <p className={cn(
                        "flex items-center gap-0.5 font-display text-sm font-extrabold",
                        done_s ? "text-emerald-500" : "text-travel-primary",
                      )}>
                        <IndianRupee className="size-3" />
                        {step.amountPaid.toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs text-muted-foreground">paid</p>
                    </div>
                  )}
                  {!(step.amountPaid != null && step.amountPaid > 0) && step.estimatedCost && (
                    <div className="shrink-0 text-right">
                      <p className={cn("flex items-center gap-0.5 text-sm font-semibold", tc.accent)}>
                        <IndianRupee className="size-3" />
                        {step.estimatedCost.toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs text-muted-foreground">est.</p>
                    </div>
                  )}
                </CardContent>

                {/* ── Active: sub-step panel ── */}
                {active && (
                  <div className="grid grid-cols-2 gap-3 border-t px-4 pb-4 pt-3">
                    <div className={cn(
                      "flex items-start gap-2.5 rounded-xl border p-3",
                      bookingSubDone(step) ? "border-emerald-200 bg-emerald-50" : cn(tc.border, tc.light),
                    )}>
                      <div className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                        bookingSubDone(step) ? "bg-emerald-500" : step.status === "bookingInProgress" ? "bg-travel-primary" : "bg-muted",
                      )}>
                        {bookingSubDone(step) ? (
                          <Check className="size-2.5 text-white" />
                        ) : step.status === "bookingInProgress" ? (
                          <Loader2 className="size-2.5 animate-spin text-white" />
                        ) : (
                          <Clock className="size-2.5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground">Booking</p>
                        <p className="truncate text-xs text-muted-foreground">{step.bookingApi ?? "API"}</p>
                        {step.bookingReference && (
                          <p className="mt-0.5 break-all text-xs font-medium text-emerald-600">{step.bookingReference}</p>
                        )}
                      </div>
                    </div>

                    <div className={cn(
                      "flex items-start gap-2.5 rounded-xl border p-3",
                      step.status === "paymentDone" ? "border-emerald-200 bg-emerald-50" : paymentSubActive(step) ? cn(tc.border, tc.light) : "border-border bg-muted/30",
                    )}>
                      <div className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                        step.status === "paymentDone" ? "bg-emerald-500" : paymentSubActive(step) ? "bg-travel-primary" : "bg-muted",
                      )}>
                        {step.status === "paymentDone" ? (
                          <Check className="size-2.5 text-white" />
                        ) : paymentSubActive(step) ? (
                          <Loader2 className="size-2.5 animate-spin text-white" />
                        ) : (
                          <CreditCard className="size-2.5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground">Payment</p>
                        <p className="truncate text-xs text-muted-foreground">{step.paymentApi ?? "API"}</p>
                        {step.estimatedCost && (
                          <p className="mt-0.5 flex items-center gap-0.5 text-xs font-medium text-travel-primary">
                            <IndianRupee className="size-2.5" />
                            {step.estimatedCost.toLocaleString("en-IN")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Done footer ── */}
                {done_s && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-emerald-100 bg-emerald-50/60 px-4 py-2">
                    {step.bookingReference && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Check className="size-2.5 text-emerald-500" />
                        {step.bookingReference}
                      </span>
                    )}
                    {step.paymentReference && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CreditCard className="size-2.5 text-emerald-500" />
                        {step.paymentReference}
                      </span>
                    )}
                    {step.amountPaid != null && step.amountPaid > 0 && (
                      <Badge className="ml-auto bg-emerald-500 text-white">
                        <IndianRupee className="mr-0.5 size-2.5" />
                        {fmtINR(step.amountPaid)} paid
                      </Badge>
                    )}
                  </div>
                )}

                {/* ── Failed footer ── */}
                {failed && (
                  <div className="flex items-center gap-2 border-t border-red-100 bg-red-50 px-4 py-2">
                    {step.message && (
                      <p className="flex-1 text-xs text-red-600">{step.message}</p>
                    )}
                    {onBookItem && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => onBookItem(step.booking.id)}
                        className="h-7 gap-1 rounded-lg border-red-200 px-2.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                      >
                        <ShoppingCart className="size-3" />
                        Retry
                      </Button>
                    )}
                  </div>
                )}

                {/* ── Pending footer ── */}
                {pending && (
                  <div className="flex items-center gap-1.5 border-t px-4 py-2">
                    <Clock className="size-3 text-muted-foreground/40" />
                    <p className="flex-1 text-xs text-muted-foreground">Waiting to start</p>
                    {onBookItem && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => onBookItem(step.booking.id)}
                        className={cn("h-7 gap-1 rounded-lg px-2.5 text-xs font-semibold", !busy && tc.border, !busy && tc.text)}
                      >
                        <ShoppingCart className="size-3" />
                        Book
                      </Button>
                    )}
                  </div>
                )}
              </Card>

              {!isLast && (
                <div className="flex justify-center py-1">
                  <ArrowDown className="size-3.5 text-muted-foreground/30" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
