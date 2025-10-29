import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params
    const supabase = await createClient()

    const { data, error } = await supabase.from("orders").select("*").eq("id", orderId).single()

    if (error) {
      console.error("[v0] Error fetching order:", error)
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json({ order: data }, { status: 200 })
  } catch (error) {
    console.error("[v0] Error in get order route:", error)
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params
    const body = await request.json()
    const { password, ...updates } = body

    // Check admin password
    if (password !== "221104") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("orders")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error updating order:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ order: data }, { status: 200 })
  } catch (error) {
    console.error("[v0] Error in update order route:", error)
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 })
  }
}
