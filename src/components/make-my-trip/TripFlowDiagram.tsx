"use client"

import { Badge } from "@/components/ui/badge"
import type { BookingExecutionStep } from "@/lib/travel/types"
import {
  ArrowDown,
  Brain,
  Bus,
  Car,
  CreditCard,
  FileText,
  Hotel,
  ListOrdered,
  Plane,
  Repeat,
  TrainFront,
} from "lucide-react"

interface TripFlowDiagramProps {
  totalBookings: number
  completedBookings: number
  steps: BookingExecutionStep[]
}

function statusLabel(status: BookingExecutionStep["status"]) {
  if (status === "bookingQueued") return "booking queued"
  if (status === "bookingInProgress") return "booking in progress"
  if (status === "bookingDone") return "booking done"
  if (status === "paymentQueued") return "payment queued"
  if (status === "paymentInProgress") return "payment in progress"
  if (status === "paymentDone") return "done"
  return status
}

export function TripFlowDiagram({
  totalBookings,
  completedBookings,
  steps,
}: TripFlowDiagramProps) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plane className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">Trip Flow Interface</h3>
        </div>
        <Badge variant="secondary">
          {completedBookings}/{totalBookings} completed
        </Badge>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
          <Brain className="size-4 text-muted-foreground" />
          <span>AI Intent Extraction</span>
        </div>
        <div className="pl-2 text-xs text-muted-foreground">
          <ArrowDown className="size-3" />
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
          <ListOrdered className="size-4 text-muted-foreground" />
          <span>Build Booking List from supported integrations</span>
        </div>
        <div className="flex flex-wrap gap-2 pl-1">
          <Badge variant="outline"><Plane className="mr-1 size-3" />flight</Badge>
          <Badge variant="outline"><Bus className="mr-1 size-3" />bus</Badge>
          <Badge variant="outline"><TrainFront className="mr-1 size-3" />train</Badge>
          <Badge variant="outline"><Car className="mr-1 size-3" />cab/selfDriving</Badge>
          <Badge variant="outline"><Hotel className="mr-1 size-3" />hotel</Badge>
        </div>
        <div className="pl-2 text-xs text-muted-foreground">
          <ArrowDown className="size-3" />
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
          <Repeat className="size-4 text-muted-foreground" />
          <span>Iterate bookings: flight, hotel, bus, train, cab, self-driving APIs</span>
        </div>

        <div className="space-y-2 pl-2">
          {steps.map((step, idx) => (
            <div key={step.booking.id} className="flex items-center justify-between rounded-md border border-dashed px-3 py-2 text-xs">
              <span>
                {idx + 1}. {step.booking.title}
              </span>
              <Badge variant={step.status === "failed" ? "destructive" : "outline"}>
                {statusLabel(step.status)}
              </Badge>
            </div>
          ))}
        </div>

        <div className="pl-2 text-xs text-muted-foreground">
          <ArrowDown className="size-3" />
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
          <CreditCard className="size-4 text-muted-foreground" />
          <span>Dummy payment API per booking</span>
        </div>
        <div className="pl-2 text-xs text-muted-foreground">
          <ArrowDown className="size-3" />
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
          <FileText className="size-4 text-muted-foreground" />
          <span>Final summary</span>
        </div>
      </div>
    </section>
  )
}
