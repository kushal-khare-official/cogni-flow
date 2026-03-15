"use client"

import { useEffect, useRef, useState } from "react"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, UserPlus, CircleCheck, AlertTriangle } from "lucide-react"

const PAYMENT_METHODS = ["UPI", "Credit Card", "Debit Card", "Net Banking", "Wallet"] as const

const WORKFLOW_ID = "cmmrj5kmi000004l891tp3vhy"
const PAYU_KEY = "szO8St"
const PAYU_ACTION = "https://test.payu.in/_payment"

interface PayUFormData {
  key: string
  txnid: string
  amount: string
  productinfo: string
  firstname: string
  email: string
  phone: string
  surl: string
  furl: string
  hash: string
  si_details: string
}

function PayUAutoSubmitForm({ data }: { data: PayUFormData }) {
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    formRef.current?.submit()
  }, [])

  return (
    <form ref={formRef} action={PAYU_ACTION} method="POST" style={{ display: "none" }}>
      {Object.entries(data).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
    </form>
  )
}

export function PaymentAgentOnboardDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("ICICI Credit Card")
  const [creatorName, setCreatorName] = useState("Kushal")
  const [maxTransactionAmount, setMaxTransactionAmount] = useState("100000")
  const [maxTotalAmount, setMaxTotalAmount] = useState("10000")
  const [paymentMethod, setPaymentMethod] = useState("Credit Card")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [payuFormData, setPayuFormData] = useState<PayUFormData | null>(null)

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
    setName("ICICI Credit Card")
    setCreatorName("Kushal")
    setMaxTransactionAmount("100000")
    setMaxTotalAmount("10000")
    setPaymentMethod("Credit Card")
    setError(null)
    setSuccess(false)
    setPayuFormData(null)
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

    const txnid = `agent_txnid_${Date.now()}`
    const amount = Number(maxTotalAmount).toFixed(2)
    const today = new Date()
    const startDate = today.toISOString().split("T")[0]
    const endDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0]

    const siDetails = JSON.stringify({
      billingAmount: amount,
      billingCurrency: "INR",
      billingCycle: "ONCE",
      billingInterval: 1,
      paymentStartDate: startDate,
      paymentEndDate: endDate,
    })

    try {
      const res = await fetch(`/api/workflows/${WORKFLOW_ID}/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: PAYU_KEY,
          txnid,
          mihpayid: "",
          amount,
          productinfo: "AI_Agent_Task_Block",
          firstname: creatorName.trim(),
          email: "admin@yourplatform.com",
          si_details: siDetails,
        }),
      })

      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`)
      }

      const data = await res.json() as {
        status: string
        output?: { result?: { intentHash?: string; captureHash?: string } }
        error?: string
      }

      if (data.status !== "completed" || !data.output?.result?.intentHash) {
        throw new Error(data.error ?? "Failed to generate payment hash")
      }

      const baseUrl = window.location.origin
      const formData: PayUFormData = {
        key: PAYU_KEY,
        txnid,
        amount,
        productinfo: "AI_Agent_Task_Block",
        firstname: creatorName.trim(),
        email: "admin@yourplatform.com",
        phone: "9999999999",
        surl: `${baseUrl}/api/payu/callback`,
        furl: `${baseUrl}/api/payu/callback`,
        hash: data.output.result.intentHash,
        si_details: siDetails,
      }

      setSuccess(true)
      setPayuFormData(formData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onboarding failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {payuFormData && <PayUAutoSubmitForm data={payuFormData} />}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger
          render={
            <Button
              size="lg"
              className="gap-2 bg-travel-accent px-5 text-sm font-semibold text-travel-accent-foreground shadow-md transition-shadow hover:bg-travel-accent/90 hover:shadow-lg"
            />
          }
        >
          <UserPlus className="size-4" />
          Onboard Payment Agent
        </DialogTrigger>

        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Onboard Payment Agent</DialogTitle>
          </DialogHeader>

          {success ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <Loader2 className="size-10 animate-spin text-travel-primary" />
              <p className="font-display text-sm font-semibold text-travel-primary">
                Redirecting to PayU…
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="agent-name">Name</Label>
                <Input
                  id="agent-name"
                  placeholder="e.g. ICICI Credit Card"
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
                  placeholder="e.g. 100000"
                  value={maxTransactionAmount}
                  onChange={(e) => setMaxTransactionAmount(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="max-total">Max Total Amount</Label>
                <Input
                  id="max-total"
                  type="number"
                  placeholder="e.g. 10000"
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
                <Alert variant="destructive">
                  <AlertTriangle className="size-3.5" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={!canSubmit}
                  className="gap-1.5 bg-travel-primary text-travel-primary-foreground hover:bg-travel-primary/90"
                >
                  {loading && <Loader2 className="size-3.5 animate-spin" />}
                  {loading ? "Generating hash…" : "Submit"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
