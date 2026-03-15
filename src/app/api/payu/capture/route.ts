import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"

const PAYU_CAPTURE_URL = "https://test.payu.in/merchant/postservice.php?form=2"
const PAYU_KEY = "szO8St"
const PAYU_SALT = "LsizOHSMT39FmUfBJExRhvJUpR74fyLO"

function computeCaptureHash(mihpayid: string): string {
  const str = [PAYU_KEY, "capture_transaction", mihpayid, PAYU_SALT].join("|")
  return createHash("sha512").update(str).digest("hex").toLowerCase()
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      key?: string
      hash?: string
      mihpayid: string
      txnid: string
      amount: string
    }

    if (!body.mihpayid || !body.txnid) {
      return NextResponse.json(
        { error: "Missing required fields: mihpayid, txnid" },
        { status: 400 },
      )
    }

    const key = body.key || PAYU_KEY
    const hash = body.hash || computeCaptureHash(body.mihpayid)

    const formData = new FormData()
    formData.append("key", key)
    formData.append("command", "capture_transaction")
    formData.append("hash", hash)
    formData.append("var1", body.mihpayid)
    formData.append("var2", body.txnid)
    if (body.amount) formData.append("var3", body.amount)

    console.log("[payu/capture] Sending capture request:", {
      key,
      command: "capture_transaction",
      hash: hash.slice(0, 16) + "…",
      var1: body.mihpayid,
      var2: body.txnid,
      var3: body.amount,
    })

    const res = await fetch(PAYU_CAPTURE_URL, {
      method: "POST",
      body: formData,
    })

    const text = await res.text()
    console.log("[payu/capture] PayU response:", text)

    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = { raw: text }
    }

    return NextResponse.json({
      status: res.ok ? "success" : "error",
      httpStatus: res.status,
      response: parsed,
    })
  } catch (error) {
    console.error("[payu/capture] Error:", error)
    return NextResponse.json(
      { error: "Failed to capture payment", detail: String(error) },
      { status: 500 },
    )
  }
}
