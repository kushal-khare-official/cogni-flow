import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { generateFingerprint } from "@/lib/crypto/fingerprint"

const WORKFLOW_ID = "cmmrj5kmi000004l891tp3vhy"

async function fetchCaptureHash(body: Record<string, string>, baseUrl: string): Promise<string> {
  try {
    const res = await fetch(`${baseUrl}/api/workflows/${WORKFLOW_ID}/trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: body.key ?? "szO8St",
        txnid: body.txnid ?? "",
        mihpayid: body.mihpayid ?? "",
        amount: body.amount ?? "0",
        productinfo: body.productinfo ?? "AI_Agent_Task_Block",
        firstname: body.firstname ?? "",
        email: body.email ?? "admin@yourplatform.com",
      }),
    })
    const data = await res.json()
    const captureHash = data?.output?.result?.captureHash
      ?? data?.output?.captureHash
      ?? ""
    return captureHash
  } catch (err) {
    console.error("[payu/callback] Failed to fetch captureHash from workflow:", err)
    return ""
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const body: Record<string, string> = {}
    for (const [key, value] of formData.entries()) {
      body[key] = String(value)
    }

    const status = body.status === "success" ? "success" : "failure"

    console.log(`[payu/callback] Payment ${status}:`, JSON.stringify(body, null, 2))

    if (status === "success") {
      const txnid = body.txnid ?? ""
      const amount = body.amount ?? "0"
      const mode = body.mode ?? ""
      const firstname = body.firstname ?? "Unknown"

      const baseUrl = request.nextUrl.origin
      const captureHash = await fetchCaptureHash(body, baseUrl)
      if (captureHash) {
        body.captureHash = captureHash
        console.log(`[payu/callback] Got captureHash from workflow (mihpayid=${body.mihpayid})`)
      } else {
        console.warn("[payu/callback] Could not obtain captureHash from workflow")
      }

      const fingerprint = generateFingerprint(
        `PayU Agent - ${txnid}`,
        "payu",
        mode,
        firstname,
      )

      const balanceCents = Math.round(parseFloat(amount) * 100)

      const existing = await prisma.agentPassport.findUnique({
        where: { fingerprint },
      })

      if (existing) {
        await prisma.agentPassport.update({
          where: { fingerprint },
          data: {
            metadata: JSON.stringify(body),
            balanceCents,
          },
        })
      } else {
        await prisma.agentPassport.create({
          data: {
            name: `PayU Agent - ${txnid}`,
            fingerprint,
            modelProvider: "payu",
            modelVersion: mode,
            creatorName: firstname,
            creatorVerified: true,
            status: "active",
            metadata: JSON.stringify(body),
            balanceCents,
          },
        })
      }
    }

    return NextResponse.redirect(
      new URL(`/make-my-trip?payment=${status}`, request.url),
      303,
    )
  } catch (error) {
    console.error("[payu/callback] Error processing callback:", error)
    return NextResponse.redirect(
      new URL("/make-my-trip?payment=failure", request.url),
      303,
    )
  }
}
