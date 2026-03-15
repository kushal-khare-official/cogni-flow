"use client"

import type { TravelPlanOutput } from "@/lib/travel/schema"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TYPE_COLOR, TYPE_ICON, TYPE_LABEL } from "@/lib/travel/ui-constants"
import { Clock, CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"

function formatTime(dateTime: string) {
  const d = new Date(dateTime)
  if (isNaN(d.getTime())) return ""
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
}

function formatDateLabel(dateKey: string) {
  const d = new Date(`${dateKey}T12:00:00`)
  if (isNaN(d.getTime())) return dateKey
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}

function groupByDay(bookings: TravelPlanOutput["bookings"]) {
  const sorted = [...bookings].sort((a, b) => {
    const da = new Date(a.dateTime).getTime()
    const db = new Date(b.dateTime).getTime()
    if (isNaN(da) && isNaN(db)) return 0
    if (isNaN(da)) return 1
    if (isNaN(db)) return -1
    return da - db
  })
  const dateMap = new Map<string, typeof sorted>()
  for (const b of sorted) {
    const d = new Date(b.dateTime)
    const key = isNaN(d.getTime()) ? `fallback-${b.id}` : d.toISOString().slice(0, 10)
    if (!dateMap.has(key)) dateMap.set(key, [])
    dateMap.get(key)!.push(b)
  }
  return Array.from(dateMap.entries()).map(([date, bkgs], i) => ({
    dayNum: i + 1,
    date,
    bookings: bkgs,
  }))
}

interface DayWisePlanProps {
  plan: TravelPlanOutput | null
}

export function DayWisePlan({ plan }: DayWisePlanProps) {
  if (!plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <CalendarDays className="size-4 text-muted-foreground" />
            Day-wise Itinerary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">Generate an itinerary to view your day-by-day plan.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const days = groupByDay(plan.bookings)

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 font-display">
            <CalendarDays className="size-4 text-travel-primary" />
            Day-wise Itinerary
          </CardTitle>
          <CardDescription>
            {plan.intent.travelDays} day trip · {plan.intent.from} → {plan.intent.to}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {days.map(({ dayNum, date, bookings: dayBookings }) => (
            <div
              key={date}
              className="overflow-hidden rounded-xl border-2 border-travel-primary/15 bg-card"
            >
              <div className="flex items-center justify-between border-b border-travel-primary/10 bg-travel-primary-muted/40 px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-md bg-travel-primary font-display text-xs font-extrabold text-travel-primary-foreground">
                    {dayNum}
                  </span>
                  <span className="font-display text-xs font-bold text-travel-primary">
                    Day {dayNum}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{formatDateLabel(date)}</span>
              </div>

              <ul className="space-y-0 bg-card px-3.5 py-3">
                {dayBookings.map((booking, bIdx) => {
                  const Icon = TYPE_ICON[booking.type]
                  const tc = TYPE_COLOR[booking.type]
                  const time = formatTime(booking.dateTime)
                  const isLast = bIdx === dayBookings.length - 1

                  return (
                    <li key={booking.id} className="flex gap-2.5">
                      <div className="flex flex-col items-center">
                        <div className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border", tc.light, tc.border)}>
                          <Icon className={cn("size-3", tc.accent)} />
                        </div>
                        {!isLast && (
                          <div className="my-1 w-px flex-1 bg-border" style={{ minHeight: "14px" }} />
                        )}
                      </div>

                      <div className={cn("min-w-0 flex-1", isLast ? "pb-0" : "pb-3")}>
                        {time && (
                          <p className="mb-0.5 flex items-center gap-1 text-xs leading-none text-muted-foreground">
                            <Clock className="size-2.5" />
                            {time}
                          </p>
                        )}
                        <p className="text-xs font-semibold leading-tight text-foreground">
                          {booking.title}
                        </p>
                        {booking.from && booking.to && booking.from !== booking.to && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {booking.from} → {booking.to}
                          </p>
                        )}
                        <Badge variant="outline" className={cn("mt-1", tc.light, tc.text, tc.border)}>
                          {TYPE_LABEL[booking.type]}
                        </Badge>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
