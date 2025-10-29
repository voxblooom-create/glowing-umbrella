import { NextResponse } from "next/server"

export async function POST() {
  try {
    const clientId = process.env.SYNCPAY_CLIENT_ID
    const clientSecret = process.env.SYNCPAY_CLIENT_SECRET
    const baseUrl = (process.env.SYNCPAY_API_BASE_URL || "https://api.syncpayments.com.br").replace(/\/$/, "")

    console.log("[v0] SyncPay auth attempt with client_id:", clientId ? "present" : "missing")
    console.log("[v0] Using base URL:", baseUrl)

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          error:
            "SyncPay credentials not configured. Please add SYNCPAY_CLIENT_ID and SYNCPAY_CLIENT_SECRET to environment variables.",
        },
        { status: 500 },
      )
    }

    const myHeaders = new Headers()
    myHeaders.append("Content-Type", "application/json")

    const raw = JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
    })

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
    }

    const apiUrl = `${baseUrl}/api/partner/v1/auth-token`
    console.log("[v0] Calling SyncPay auth API at:", apiUrl)

    const response = await fetch(apiUrl, requestOptions)

    console.log("[v0] SyncPay auth response status:", response.status)
    const responseText = await response.text()
    console.log("[v0] SyncPay auth response:", responseText)

    if (!response.ok) {
      return NextResponse.json(
        { error: `SyncPay API error: ${response.status} - ${responseText}` },
        { status: response.status },
      )
    }

    let result
    try {
      result = JSON.parse(responseText)
    } catch (e) {
      console.error("[v0] Failed to parse SyncPay response as JSON:", responseText)
      return NextResponse.json({ error: "Invalid response from SyncPay API" }, { status: 500 })
    }

    if (!result.access_token) {
      console.error("[v0] No access_token in SyncPay response:", result)
      return NextResponse.json({ error: "No token received from SyncPay" }, { status: 500 })
    }

    console.log("[v0] SyncPay auth successful")
    return NextResponse.json({ token: result.access_token })
  } catch (error) {
    console.error("[v0] SyncPay auth error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Authentication failed" },
      { status: 500 },
    )
  }
}
