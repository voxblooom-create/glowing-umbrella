import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const payload = await request.json()

    console.log("[v0] SyncPay webhook received:", payload)

    // Here you would handle the payment confirmation
    // Update database, send notification, credit Robux, etc.

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
