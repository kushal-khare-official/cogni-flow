"use client"

import type { TravelPlanOutput } from "@/lib/travel/schema"
import type { BookingExecutionStep, TravelIntegrationType } from "@/lib/travel/types"
import { Check, AlertCircle, CreditCard, IndianRupee } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { TYPE_ICON, TYPE_LABEL, fmtINR } from "@/lib/travel/ui-constants"
import { cn } from "@/lib/utils"

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
    <Card className="overflow-hidden">
      {/* Header */}
      <CardHeader className="bg-travel-primary px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-display text-sm font-bold text-travel-primary-foreground">Trip Summary</p>
            <p className="mt-0.5 max-w-xs text-xs text-travel-primary-foreground/70">{plan.requestSummary}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-extrabold text-travel-primary-foreground">{fmtINR(totalPaid)}</p>
            <p className="text-xs text-travel-primary-foreground/70">total amount paid</p>
          </div>
        </div>
      </CardHeader>

      {/* Stats row */}
      <div className="grid grid-cols-3 divide-x border-b">
        <div className="px-4 py-3 text-center">
          <p className="font-display text-lg font-bold text-foreground">{plan.bookings.length}</p>
          <p className="text-xs text-muted-foreground">Bookings</p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="font-display text-lg font-bold text-emerald-500">{confirmed.length}</p>
          <p className="text-xs text-muted-foreground">Confirmed</p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className={cn("font-display text-lg font-bold", failed.length > 0 ? "text-red-500" : "text-muted-foreground")}>
            {failed.length}
          </p>
          <p className="text-xs text-muted-foreground">Failed</p>
        </div>
      </div>

      {/* Per-type breakdown */}
      <CardContent>
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
                className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2.5"
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-travel-primary/10">
                  <Icon className="size-3.5 text-travel-primary" />
                </div>
                <p className="flex-1 text-sm font-medium text-foreground">{TYPE_LABEL[type]}</p>
                <span className="text-xs text-muted-foreground">{count}x</span>
                {typePaid > 0 && (
                  <span className="flex items-center gap-0.5 text-xs font-semibold text-travel-primary">
                    <IndianRupee className="size-3" />
                    {typePaid.toLocaleString("en-IN")}
                  </span>
                )}
                {typeSteps.length > 0 && (
                  <Badge variant={typeDone === typeSteps.length ? "default" : "secondary"} className={cn(
                    typeDone === typeSteps.length && "bg-emerald-500 text-white",
                  )}>
                    {typeDone}/{typeSteps.length}
                  </Badge>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>

      {/* Confirmed bookings list */}
      {confirmed.length > 0 && (
        <>
          <Separator />
          <CardContent>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Confirmed Bookings
            </p>
            <div className="space-y-1.5">
              {confirmed.map((step) => (
                <div
                  key={step.booking.id}
                  className="flex items-center gap-3 rounded-lg bg-emerald-50 px-3 py-2.5"
                >
                  <Check className="size-3.5 shrink-0 text-emerald-500" />
                  <p className="flex-1 truncate text-sm font-medium text-foreground">{step.booking.title}</p>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <CreditCard className="size-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{step.paymentReference ?? "Paid"}</span>
                    {step.amountPaid != null && step.amountPaid > 0 && (
                      <span className="text-xs font-semibold text-emerald-500">
                        {fmtINR(step.amountPaid)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </>
      )}

      {/* Skipped integrations */}
      {plan.skippedIntegrations.length > 0 && (
        <>
          <Separator />
          <CardContent>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Skipped
            </p>
            <div className="space-y-1">
              {plan.skippedIntegrations.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2"
                >
                  <AlertCircle className="size-3.5 shrink-0 text-red-400" />
                  <p className="flex-1 text-xs text-red-600">{s.requested}</p>
                  <span className="text-xs text-red-400">{s.reason}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </>
      )}
    </Card>
  )
}
