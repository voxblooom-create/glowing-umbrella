import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { robloxUsername, robuxAmount, totalPrice, email, pixCode, transactionId } = body

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("orders")
      .insert({
        roblox_username: robloxUsername,
        robux_amount: robuxAmount,
        total_price: totalPrice,
        email: email || null,
        pix_code: pixCode,
        transaction_id: transactionId,
        status: "pending",
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating order:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ order: data }, { status: 200 })
  } catch (error) {
    console.error("[v0] Error in create order route:", error)
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}
