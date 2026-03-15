"use client"

import type { TravelPlanOutput } from "@/lib/travel/schema"
import type { BookingExecutionStep, TravelIntegrationType } from "@/lib/travel/types"
import { Wallet, ChevronDown, ChevronRight, Loader2, Check, ShoppingCart } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { TYPE_ICON, TYPE_LABEL, TYPE_COLOR, midPrice, fmtINR } from "@/lib/travel/ui-constants"
import { cn } from "@/lib/utils"

type ItemStatus = "pending" | "active" | "done" | "failed"

function getItemStatus(bookingId: string, steps: BookingExecutionStep[]): ItemStatus {
  const step = steps.find((s) => s.booking.id === bookingId)
  if (!step) return "pending"
  if (step.status === "paymentDone") return "done"
  if (step.status === "failed") return "failed"
  if (step.status === "pending") return "pending"
  return "active"
}

function ItemBookButton({
  status,
  busy,
  type,
  onClick,
}: {
  status: ItemStatus
  busy: boolean
  type: TravelIntegrationType
  onClick: (e: React.MouseEvent) => void
}) {
  const tc = TYPE_COLOR[type]

  if (status === "done") {
    return (
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50">
        <Check className="size-3.5 text-emerald-600" />
      </span>
    )
  }

  if (status === "active") {
    return (
      <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg border", tc.light, tc.border)}>
        <Loader2 className={cn("size-3.5 animate-spin", tc.accent)} />
      </span>
    )
  }

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={busy}
      onClick={onClick}
      className={cn("h-7 gap-1 rounded-lg px-2.5 text-xs font-semibold", !busy && tc.border, !busy && tc.text)}
    >
      <ShoppingCart className="size-3" />
      Book
    </Button>
  )
}

interface PricingBreakdownProps {
  plan: TravelPlanOutput
  steps?: BookingExecutionStep[]
  onBookItem?: (bookingId: string) => void
  busy?: boolean
}

export function PricingBreakdown({ plan, steps = [], onBookItem, busy = false }: PricingBreakdownProps) {
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
    <Card>
      <CardHeader className="border-b bg-travel-primary-muted/30">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-travel-primary">
            <Wallet className="size-4 text-travel-primary-foreground" />
          </div>
          <div className="flex-1">
            <CardTitle className="font-display">Estimated Trip Cost</CardTitle>
            <CardDescription>Indicative pricing · Actual may vary at booking</CardDescription>
          </div>
          <div className="text-right">
            <p className="font-display text-xl font-extrabold text-travel-primary">{fmtINR(total)}</p>
            <p className="text-xs text-muted-foreground">total estimate</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="divide-y">
          {groups.map(({ type, items, subtotal }) => {
            const Icon = TYPE_ICON[type]
            const tc = TYPE_COLOR[type]
            const open = expanded.has(type)
            const count = items.length
            const singleItemStatus = count === 1 ? getItemStatus(items[0].id, steps) : null

            return (
              <Collapsible key={type} open={open} onOpenChange={() => count > 1 && toggle(type)}>
                <CollapsibleTrigger
                  className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-muted/40"
                  render={<button type="button" />}
                >
                  <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl border", tc.light, tc.border)}>
                    <Icon className={cn("size-4", tc.accent)} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm font-bold text-foreground">{TYPE_LABEL[type]}</p>
                    <p className="text-xs text-muted-foreground">{count} {count === 1 ? "booking" : "bookings"}</p>
                  </div>

                  <div className="mr-2 shrink-0 text-right">
                    <p className={cn("text-sm font-bold", tc.text)}>{fmtINR(subtotal)}</p>
                    {count > 1 && (
                      <p className="text-xs text-muted-foreground">{fmtINR(midPrice(type))} each</p>
                    )}
                  </div>

                  {onBookItem && count === 1 && (
                    <ItemBookButton
                      status={singleItemStatus!}
                      busy={busy}
                      type={type}
                      onClick={(e) => { e.stopPropagation(); onBookItem(items[0].id) }}
                    />
                  )}

                  {count > 1 ? (
                    open
                      ? <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                      : <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    !onBookItem && <span className="size-4 shrink-0" />
                  )}
                </CollapsibleTrigger>

                {count > 1 && (
                  <CollapsibleContent>
                    <div className={cn("divide-y border-y", tc.light)}>
                      {items.map((item, i) => {
                        const status = getItemStatus(item.id, steps)
                        return (
                          <div key={item.id} className="flex items-center gap-3 px-6 py-2.5">
                            <span className="w-4 text-right text-xs text-muted-foreground">{i + 1}.</span>
                            <p className="flex-1 text-xs font-medium text-foreground">{item.title}</p>
                            <p className={cn("text-xs font-semibold", tc.text)}>{fmtINR(item.estimated)}</p>
                            {onBookItem && (
                              <ItemBookButton
                                status={status}
                                busy={busy}
                                type={type}
                                onClick={() => onBookItem(item.id)}
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </CollapsibleContent>
                )}
              </Collapsible>
            )
          })}
        </div>
      </CardContent>

      <Separator />

      <CardFooter className="flex-col items-stretch gap-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-sm font-bold text-foreground">Total Estimated Cost</p>
            <p className="text-xs text-muted-foreground">{plan.bookings.length} bookings across {groups.length} categories</p>
          </div>
          <p className="font-display text-2xl font-extrabold text-travel-primary">{fmtINR(total)}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          * Prices are indicative estimates. Actual prices are determined at booking time.
        </p>
      </CardFooter>
    </Card>
  )
}
