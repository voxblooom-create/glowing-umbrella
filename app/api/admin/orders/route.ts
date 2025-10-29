import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { password } = body

    // Check admin password
    if (password !== "221104") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    // Fetch all orders
    const { data: orders, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching orders:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate metrics
    const totalOrders = orders.length
    const totalRevenue = orders.reduce((sum, order) => sum + Number.parseFloat(order.total_price.toString()), 0)
    const pixGenerated = orders.length
    const paidPix = orders.filter((o) => o.status === "completed").length
    const pendingPix = orders.filter((o) => o.status === "pending").length

    return NextResponse.json(
      {
        orders,
        metrics: {
          totalOrders,
          totalRevenue,
          pixGenerated,
          paidPix,
          pendingPix,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[v0] Error in admin orders route:", error)
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
  }
}
