import { NextResponse } from "next/server"

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)

      // If successful or client error (4xx), return immediately
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response
      }

      // For server errors (5xx), retry with backoff
      if (response.status >= 500 && attempt < maxRetries - 1) {
        const backoffMs = Math.pow(2, attempt) * 1000 // 1s, 2s, 4s
        console.log(
          `[v0] Server error ${response.status}, retrying in ${backoffMs}ms (attempt ${attempt + 1}/${maxRetries})`,
        )
        await new Promise((resolve) => setTimeout(resolve, backoffMs))
        continue
      }

      return response
    } catch (error) {
      lastError = error as Error
      if (attempt < maxRetries - 1) {
        const backoffMs = Math.pow(2, attempt) * 1000
        console.log(`[v0] Request failed, retrying in ${backoffMs}ms (attempt ${attempt + 1}/${maxRetries}):`, error)
        await new Promise((resolve) => setTimeout(resolve, backoffMs))
      }
    }
  }

  throw lastError || new Error("Max retries exceeded")
}

export async function POST(request: Request) {
  try {
    const { token, amount, description, username } = await request.json()
    const baseUrl = (process.env.SYNCPAY_API_BASE_URL || "https://api.syncpayments.com.br").replace(/\/$/, "")

    if (!amount || amount <= 0) {
      console.error("[v0] Invalid amount:", amount)
      return NextResponse.json({ error: "Valor inválido para pagamento" }, { status: 400 })
    }

    console.log("[v0] Creating PIX payment for:", { amount, username })
    console.log("[v0] Using base URL:", baseUrl)

    const myHeaders = new Headers()
    myHeaders.append("Authorization", `Bearer ${token}`)
    myHeaders.append("Content-Type", "application/json")

    const raw = JSON.stringify({
      amount: amount,
      description: description,
      webhook_url: `${request.headers.get("origin") || "https://yourdomain.com"}/api/webhook/syncpay`,
      client: {
        name: username,
        cpf: "00000000000",
        email: `${username}@roblox.temp`,
        phone: "00000000000",
      },
    })

    console.log("[v0] Request payload:", raw)

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
    }

    const apiUrl = `${baseUrl}/api/partner/v1/cash-in`
    console.log("[v0] Calling SyncPay cash-in API at:", apiUrl)

    const response = await fetchWithRetry(apiUrl, requestOptions)

    console.log("[v0] SyncPay cash-in response status:", response.status)
    const responseText = await response.text()
    console.log("[v0] SyncPay cash-in response:", responseText)

    if (!response.ok) {
      let errorMessage = "Erro ao gerar pagamento PIX"
      if (response.status === 429) {
        errorMessage = "Muitas requisições. Aguarde alguns segundos e tente novamente."
      } else if (response.status >= 500) {
        errorMessage = "Serviço temporariamente indisponível. Tente novamente em alguns instantes."
      }

      return NextResponse.json({ error: errorMessage, details: responseText }, { status: response.status })
    }

    let result
    try {
      result = JSON.parse(responseText)
    } catch (e) {
      console.error("[v0] Failed to parse SyncPay response as JSON:", responseText)
      return NextResponse.json({ error: "Resposta inválida do servidor de pagamento" }, { status: 500 })
    }

    console.log("[v0] PIX payment created successfully")
    return NextResponse.json({
      pixCode: result.pix_code,
      identifier: result.identifier,
      message: result.message,
    })
  } catch (error) {
    console.error("[v0] SyncPay cash-in error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao criar pagamento" },
      { status: 500 },
    )
  }
}
