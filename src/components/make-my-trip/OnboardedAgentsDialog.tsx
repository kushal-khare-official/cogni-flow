"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Bot, Loader2, RefreshCw, Wallet, CreditCard } from "lucide-react"

interface PayUMetadata {
  mihpayid?: string
  txnid?: string
  amount?: string
  mode?: string
  bankcode?: string
  status?: string
  captureHash?: string
  [key: string]: string | undefined
}

interface AgentRecord {
  id: string
  name: string
  fingerprint: string
  modelProvider: string
  modelVersion: string
  creatorName: string
  creatorVerified: boolean
  status: string
  metadata: string
  balanceCents: number
  issuedAt: string
  revokedAt: string | null
  mandateCount: number
  auditCount: number
}

function parseMetadata(raw: string): PayUMetadata | null {
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object" && parsed.mihpayid) return parsed as PayUMetadata
    return null
  } catch {
    return null
  }
}

function formatCurrency(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
}

export function OnboardedAgentsDialog() {
  const [open, setOpen] = useState(false)
  const [agents, setAgents] = useState<AgentRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAgents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/agents")
      if (!res.ok) throw new Error(`Failed to fetch (${res.status})`)
      const data = await res.json()
      setAgents(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agents")
      setAgents([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) fetchAgents()
  }, [open, fetchAgents])

  function statusVariant(status: string) {
    if (status === "active") return "default" as const
    if (status === "revoked") return "destructive" as const
    return "secondary" as const
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5" />
        }
      >
        <Bot className="size-3.5" />
        View Agents
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Bot className="size-4" />
            Onboarded Agents
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {agents.length} agent{agents.length !== 1 ? "s" : ""} registered
          </p>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={fetchAgents}
            disabled={loading}
            className="text-muted-foreground"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <ScrollArea className="max-h-[24rem]">
          {loading && agents.length === 0 && (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && agents.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No agents onboarded yet.
            </p>
          )}

          <div className="space-y-2">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} statusVariant={statusVariant} />
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

function AgentCard({
  agent,
  statusVariant,
}: {
  agent: AgentRecord
  statusVariant: (s: string) => "default" | "destructive" | "secondary"
}) {
  const payu = useMemo(() => parseMetadata(agent.metadata), [agent.metadata])
  const isPayU = agent.modelProvider === "payu"
  const authorizedCents = payu?.amount ? Math.round(parseFloat(payu.amount) * 100) : 0
  const balancePct = authorizedCents > 0 ? Math.round((agent.balanceCents / authorizedCents) * 100) : 0

  return (
    <Card size="sm">
      <CardContent>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-medium">{agent.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              by {agent.creatorName}
            </p>
          </div>
          <Badge variant={statusVariant(agent.status)} className="shrink-0 text-[10px]">
            {agent.status}
          </Badge>
        </div>

        {isPayU && payu ? (
          <>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <CreditCard className="size-3" />
                {payu.mode ?? agent.modelVersion}
                {payu.bankcode ? ` · ${payu.bankcode}` : ""}
              </span>
              {payu.txnid && <span>txn: {payu.txnid}</span>}
              {payu.mihpayid && <span>ref: {payu.mihpayid}</span>}
            </div>

            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <Wallet className="size-3" />
                  Balance
                </span>
                <span className="font-mono text-foreground">
                  {formatCurrency(agent.balanceCents)}
                  {authorizedCents > 0 && (
                    <span className="text-muted-foreground"> / {formatCurrency(authorizedCents)}</span>
                  )}
                </span>
              </div>
              {authorizedCents > 0 && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-travel-primary transition-all duration-300"
                    style={{ width: `${Math.min(balancePct, 100)}%` }}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
            <span>{agent.modelProvider}{agent.modelVersion ? ` · ${agent.modelVersion}` : ""}</span>
            <span>{agent.mandateCount} mandate{agent.mandateCount !== 1 ? "s" : ""}</span>
            <span>{agent.auditCount} audit log{agent.auditCount !== 1 ? "s" : ""}</span>
            <span>Issued {new Date(agent.issuedAt).toLocaleDateString()}</span>
          </div>
        )}

        <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground/60">
          {agent.fingerprint}
        </p>
      </CardContent>
    </Card>
  )
}
