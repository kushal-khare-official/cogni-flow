"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, UserPlus, CheckCircle, AlertTriangle } from "lucide-react"

const PAYMENT_METHODS = ["UPI", "Credit Card", "Debit Card", "Net Banking", "Wallet"] as const

const WORKFLOW_ID = "cmmq50i41000a2wlnd45tuv1l"

export function PaymentAgentOnboardDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [creatorName, setCreatorName] = useState("")
  const [maxTransactionAmount, setMaxTransactionAmount] = useState("")
  const [maxTotalAmount, setMaxTotalAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const txnValid = maxTransactionAmount !== "" && !Number.isNaN(Number(maxTransactionAmount))
  const totalValid = maxTotalAmount !== "" && !Number.isNaN(Number(maxTotalAmount))
  const canSubmit =
    name.trim() !== "" &&
    creatorName.trim() !== "" &&
    txnValid &&
    totalValid &&
    paymentMethod !== "" &&
    !loading

  function resetForm() {
    setName("")
    setCreatorName("")
    setMaxTransactionAmount("")
    setMaxTotalAmount("")
    setPaymentMethod("")
    setError(null)
    setSuccess(false)
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      resetForm()
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/workflows/${WORKFLOW_ID}/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          creatorName: creatorName.trim(),
          maxTransactionAmount: Number(maxTransactionAmount),
          maxTotalAmount: Number(maxTotalAmount),
          paymentMethod,
        }),
      })

      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`)
      }

      setSuccess(true)
      setTimeout(() => handleOpenChange(false), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onboarding failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            size="lg"
            className="gap-2 px-5 text-sm font-semibold animate-pulse text-white shadow-md hover:shadow-lg transition-shadow"
            style={{
              background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
              border: "none",
            }}
          />
        }
      >
        <UserPlus className="size-4" />
        Onboard Payment Agent
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Onboard Payment Agent</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <CheckCircle className="size-10 text-green-500" />
            <p className="text-sm font-semibold text-green-700">Onboarding successful!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="agent-name">Name</Label>
              <Input
                id="agent-name"
                placeholder="e.g. Kushal's Agent API Test"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="creator-name">Creator Name</Label>
              <Input
                id="creator-name"
                placeholder="e.g. Kushal"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="max-txn">Max Transaction Amount</Label>
              <Input
                id="max-txn"
                type="number"
                placeholder="e.g. 10000"
                value={maxTransactionAmount}
                onChange={(e) => setMaxTransactionAmount(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="max-total">Max Total Amount</Label>
              <Input
                id="max-total"
                type="number"
                placeholder="e.g. 100"
                value={maxTotalAmount}
                onChange={(e) => setMaxTotalAmount(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Payment Method</Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a payment method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                <AlertTriangle className="size-3.5 shrink-0 text-red-500" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            <DialogFooter>
              <Button type="submit" disabled={!canSubmit} className="gap-1.5">
                {loading && <Loader2 className="size-3.5 animate-spin" />}
                {loading ? "Submitting…" : "Submit"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
