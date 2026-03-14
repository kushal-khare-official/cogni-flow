"use client"

import type { TravelPlanOutput } from "@/lib/travel/schema"
import type { TravelIntegrationType } from "@/lib/travel/types"
import { Plane, Hotel, Car, Bus, TrainFront, Clock, CalendarDays } from "lucide-react"

/* ── Type-specific colors for activity icons ─────────────────── */
const TYPE_COLOR: Record<TravelIntegrationType, { accent: string; light: string; border: string; text: string }> = {
  flight:      { accent: "#3b82f6", light: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
  hotel:       { accent: "#8b5cf6", light: "#f5f3ff", border: "#ddd6fe", text: "#6d28d9" },
  cab:         { accent: "#f59e0b", light: "#fffbeb", border: "#fde68a", text: "#b45309" },
  bus:         { accent: "#10b981", light: "#f0fdf4", border: "#a7f3d0", text: "#047857" },
  train:       { accent: "#06b6d4", light: "#ecfeff", border: "#a5f3fc", text: "#0e7490" },
  selfDriving: { accent: "#f97316", light: "#fff7ed", border: "#fed7aa", text: "#c2410c" },
}

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

/* ── Single header color for ALL day cards (blue/indigo theme) ─ */
const DAY_HEADER = {
  accent:     "#6366f1",
  light:      "#f5f3ff",
  border:     "#ddd6fe",
  text:       "#4338ca",
  topBorder:  "#6366f1",
  connector:  "#ddd6fe",
}

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
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="mb-2 flex items-center gap-2">
          <CalendarDays className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Day-wise Itinerary</h3>
        </div>
        <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">Generate an itinerary to view your day-by-day plan.</p>
        </div>
      </section>
    )
  }

  const days = groupByDay(plan.bookings)

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-3.5" style={{ color: DAY_HEADER.accent }} />
          <h3 className="text-sm font-bold text-foreground">Day-wise Itinerary</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          {plan.intent.travelDays} day trip &middot; {plan.intent.from} → {plan.intent.to}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {days.map(({ dayNum, date, bookings: dayBookings }) => (
          <div
            key={date}
            className="overflow-hidden rounded-xl"
            style={{
              border: `1.5px solid ${DAY_HEADER.border}`,
              borderTop: `3px solid ${DAY_HEADER.topBorder}`,
            }}
          >
            {/* ── Day header — uniform indigo color ── */}
            <div
              className="flex items-center justify-between px-3.5 py-2.5"
              style={{ backgroundColor: DAY_HEADER.light }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="flex size-6 items-center justify-center rounded-md text-xs font-extrabold text-white"
                  style={{ backgroundColor: DAY_HEADER.accent }}
                >
                  {dayNum}
                </span>
                <span className="text-xs font-bold" style={{ color: DAY_HEADER.text }}>
                  Day {dayNum}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">{formatDateLabel(date)}</span>
            </div>

            {/* ── Activity timeline — type-specific icon colors ── */}
            <ul className="px-3.5 py-3 space-y-0 bg-card">
              {dayBookings.map((booking, bIdx) => {
                const Icon = TYPE_ICON[booking.type]
                const tc   = TYPE_COLOR[booking.type]
                const time = formatTime(booking.dateTime)
                const isLast = bIdx === dayBookings.length - 1

                return (
                  <li key={booking.id} className="flex gap-2.5">
                    {/* Timeline dot + connector line */}
                    <div className="flex flex-col items-center">
                      <div
                        className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md"
                        style={{
                          backgroundColor: tc.light,
                          border: `1px solid ${tc.border}`,
                        }}
                      >
                        <Icon className="size-3" style={{ color: tc.accent }} />
                      </div>
                      {!isLast && (
                        <div
                          className="my-1 w-px"
                          style={{ backgroundColor: DAY_HEADER.connector, minHeight: "14px", flex: 1 }}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className={`flex-1 min-w-0 ${isLast ? "pb-0" : "pb-3"}`}>
                      {time && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground leading-none mb-0.5">
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
                      {/* Type chip with type-specific color */}
                      <span
                        className="mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
                        style={{
                          backgroundColor: tc.light,
                          color: tc.text,
                          border: `1px solid ${tc.border}`,
                        }}
                      >
                        {TYPE_LABEL[booking.type]}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
