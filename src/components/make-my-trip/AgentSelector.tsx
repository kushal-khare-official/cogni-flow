"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Bot, Wallet, RefreshCw } from "lucide-react"

export interface SelectedAgent {
  id: string
  name: string
  balanceCents: number
  metadata: string
  mihpayid: string
  txnid: string
  amount: string
  captureHash: string
}

interface AgentOption {
  id: string
  name: string
  creatorName: string
  modelProvider: string
  status: string
  balanceCents: number
  metadata: string
}

interface ParsedMeta {
  mihpayid?: string
  txnid?: string
  amount?: string
  captureHash?: string
}

function parseMeta(raw: string): ParsedMeta {
  try {
    return JSON.parse(raw) as ParsedMeta
  } catch {
    return {}
  }
}

function formatCurrency(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
}

interface AgentSelectorProps {
  selectedAgent: SelectedAgent | null
  onSelect: (agent: SelectedAgent | null) => void
}

export function AgentSelector({ selectedAgent, onSelect }: AgentSelectorProps) {
  const [agents, setAgents] = useState<AgentOption[]>([])
  const [loading, setLoading] = useState(false)

  const fetchAgents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/agents")
      if (!res.ok) return
      const data = await res.json()
      const active = (Array.isArray(data) ? data : []).filter(
        (a: AgentOption) => a.status === "active" && a.modelProvider === "payu" && a.balanceCents > 0,
      )
      setAgents(active)

      if (selectedAgent && !active.find((a: AgentOption) => a.id === selectedAgent.id)) {
        onSelect(null)
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [selectedAgent, onSelect])

  useEffect(() => {
    fetchAgents()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleChange(agentId: string) {
    if (agentId === "__none__") {
      onSelect(null)
      return
    }
    const agent = agents.find((a) => a.id === agentId)
    if (agent) {
      const meta = parseMeta(agent.metadata)
      onSelect({
        id: agent.id,
        name: agent.name,
        balanceCents: agent.balanceCents,
        metadata: agent.metadata,
        mihpayid: meta.mihpayid ?? "",
        txnid: meta.txnid ?? "",
        amount: meta.amount ?? "",
        captureHash: meta.captureHash ?? "",
      })
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectedAgent?.id ?? "__none__"}
        onValueChange={handleChange}
      >
        <SelectTrigger className="h-9 w-[220px] text-xs">
          <Bot className="mr-1 size-3.5 shrink-0 text-muted-foreground" />
          <SelectValue placeholder="Select payment agent" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">
            <span className="text-muted-foreground">No agent (mock payments)</span>
          </SelectItem>
          {agents.map((agent) => (
            <SelectItem key={agent.id} value={agent.id}>
              <span className="flex items-center gap-2">
                <span className="truncate">{agent.name}</span>
                <Badge variant="outline" className="ml-auto shrink-0 text-[9px]">
                  {formatCurrency(agent.balanceCents)}
                </Badge>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={fetchAgents}
        disabled={loading}
        className="text-muted-foreground"
        title="Refresh agents"
      >
        <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
      </Button>

      {selectedAgent && (
        <Badge variant="secondary" className="gap-1 text-[10px]">
          <Wallet className="size-3" />
          {formatCurrency(selectedAgent.balanceCents)}
        </Badge>
      )}
    </div>
  )
}
