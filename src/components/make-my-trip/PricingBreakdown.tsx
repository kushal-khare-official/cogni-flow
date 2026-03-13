"use client"

import type { TravelPlanOutput } from "@/lib/travel/schema"
import type { TravelIntegrationType } from "@/lib/travel/types"
import { Plane, Hotel, Car, Bus, TrainFront, IndianRupee, ChevronDown, ChevronRight } from "lucide-react"
import { useState } from "react"

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

/* Each integration type has its own consistent accent — aligned with day palette */
const TYPE_COLOR: Record<TravelIntegrationType, { accent: string; light: string; border: string; text: string }> = {
  flight:      { accent: "#3b82f6", light: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
  hotel:       { accent: "#8b5cf6", light: "#f5f3ff", border: "#ddd6fe", text: "#6d28d9" },
  cab:         { accent: "#f59e0b", light: "#fffbeb", border: "#fde68a", text: "#b45309" },
  bus:         { accent: "#10b981", light: "#f0fdf4", border: "#a7f3d0", text: "#047857" },
  train:       { accent: "#06b6d4", light: "#ecfeff", border: "#a5f3fc", text: "#0e7490" },
  selfDriving: { accent: "#f97316", light: "#fff7ed", border: "#fed7aa", text: "#c2410c" },
}

const ESTIMATED_RANGES: Record<TravelIntegrationType, { min: number; max: number }> = {
  flight:      { min: 4500, max: 12000 },
  hotel:       { min: 2000, max: 7500 },
  cab:         { min: 350,  max: 1800  },
  bus:         { min: 600,  max: 2200  },
  train:       { min: 800,  max: 3500  },
  selfDriving: { min: 1500, max: 4500  },
}

function midPrice(type: TravelIntegrationType) {
  const r = ESTIMATED_RANGES[type]
  return Math.floor((r.min + r.max) / 2)
}

function fmtINR(n: number) {
  return `₹${n.toLocaleString("en-IN")}`
}

interface PricingBreakdownProps {
  plan: TravelPlanOutput
}

export function PricingBreakdown({ plan }: PricingBreakdownProps) {
  /* Group bookings by integration type */
  const groupMap = new Map<TravelIntegrationType, { id: string; title: string; estimated: number }[]>()

  for (const b of plan.bookings) {
    if (!groupMap.has(b.type)) groupMap.set(b.type, [])
    groupMap.get(b.type)!.push({ id: b.id, title: b.title, estimated: midPrice(b.type) })
  }

  const groups = Array.from(groupMap.entries()).map(([type, items]) => ({
    type,
    items,
    subtotal: items.reduce((s, i) => s + i.estimated, 0),
  }))

  const total = groups.reduce((s, g) => s + g.subtotal, 0)

  /* Expand/collapse per group */
  const [expanded, setExpanded] = useState<Set<TravelIntegrationType>>(new Set())
  function toggle(type: TravelIntegrationType) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      {/* ── Header ── */}
      <div
        className="flex items-center gap-3 border-b border-border px-5 py-4"
        style={{ background: "linear-gradient(135deg, #3b82f608 0%, #6366f108 100%)" }}
      >
        <div
          className="flex size-9 items-center justify-center rounded-xl"
          style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
        >
          <IndianRupee className="size-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">Estimated Trip Cost</p>
          <p className="text-xs text-muted-foreground">Indicative pricing · Actual may vary at booking</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xl font-extrabold" style={{ color: "#3b82f6" }}>{fmtINR(total)}</p>
          <p className="text-xs text-muted-foreground">total estimate</p>
        </div>
      </div>

      {/* ── Grouped rows ── */}
      <div className="divide-y divide-border">
        {groups.map(({ type, items, subtotal }) => {
          const Icon = TYPE_ICON[type]
          const color = TYPE_COLOR[type]
          const open = expanded.has(type)
          const count = items.length

          return (
            <div key={type}>
              {/* Group header row — clickable to expand */}
              <button
                onClick={() => toggle(type)}
                className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-muted/20"
              >
                {/* Type color icon */}
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: color.light, border: `1.5px solid ${color.border}` }}
                >
                  <Icon className="size-4" style={{ color: color.accent }} />
                </div>

                {/* Label + count */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{TYPE_LABEL[type]}</p>
                  <p className="text-xs text-muted-foreground">{count} {count === 1 ? "booking" : "bookings"}</p>
                </div>

                {/* Subtotal */}
                <div className="text-right shrink-0 mr-2">
                  <p className="text-sm font-bold" style={{ color: color.text }}>{fmtINR(subtotal)}</p>
                  {count > 1 && (
                    <p className="text-xs text-muted-foreground">{fmtINR(midPrice(type))} each</p>
                  )}
                </div>

                {/* Expand chevron — only show when count > 1 */}
                {count > 1 ? (
                  open
                    ? <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                    : <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                  <span className="size-4 shrink-0" />
                )}
              </button>

              {/* Expanded items (sub-rows) */}
              {open && count > 1 && (
                <div
                  className="divide-y"
                  style={{ backgroundColor: color.light, borderTop: `1px solid ${color.border}`, borderBottom: `1px solid ${color.border}` }}
                >
                  {items.map((item, i) => (
                    <div key={item.id} className="flex items-center gap-3 px-6 py-2.5">
                      <span className="w-4 text-right text-xs text-muted-foreground">{i + 1}.</span>
                      <p className="flex-1 text-xs font-medium text-foreground">{item.title}</p>
                      <p className="text-xs font-semibold" style={{ color: color.text }}>{fmtINR(item.estimated)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Total footer ── */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{
          background: "linear-gradient(135deg, #3b82f608 0%, #6366f108 100%)",
          borderTop: "1.5px solid #6366f120",
        }}
      >
        <div>
          <p className="text-sm font-bold text-foreground">Total Estimated Cost</p>
          <p className="text-xs text-muted-foreground">{plan.bookings.length} bookings across {groups.length} categories</p>
        </div>
        <p className="text-2xl font-extrabold" style={{ color: "#3b82f6" }}>{fmtINR(total)}</p>
      </div>

      <p className="px-5 pb-3 text-xs text-muted-foreground">
        * Prices are indicative estimates. Actual prices are determined at booking time.
      </p>
    </section>
  )
}
