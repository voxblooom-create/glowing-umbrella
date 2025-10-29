"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Clock, XCircle, Package } from "lucide-react"

interface Order {
  id: string
  roblox_username: string
  robux_amount: number
  total_price: number
  status: string
  email: string | null
  pix_code: string
  transaction_id: string
  created_at: string
  updated_at: string
}

export default function OrderTrackingPage() {
  const params = useParams()
  const orderId = params.orderId as string
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchOrder()
  }, [orderId])

  const fetchOrder = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/orders/${orderId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch order")
      }

      setOrder(data.order)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load order")
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-8 h-8 text-green-400" />
      case "pending":
        return <Clock className="w-8 h-8 text-yellow-400" />
      case "cancelled":
        return <XCircle className="w-8 h-8 text-red-400" />
      default:
        return <Package className="w-8 h-8 text-blue-400" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Pedido Concluído"
      case "pending":
        return "Aguardando Pagamento"
      case "cancelled":
        return "Pedido Cancelado"
      default:
        return "Processando"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-400"
      case "pending":
        return "text-yellow-400"
      case "cancelled":
        return "text-red-400"
      default:
        return "text-blue-400"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="text-white text-xl">Carregando pedido...</div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <Card className="bg-[#1a1a1a] border-red-500/30 p-6 max-w-md w-full">
          <div className="text-center">
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Pedido Não Encontrado</h1>
            <p className="text-gray-400 mb-4">{error || "O pedido solicitado não existe."}</p>
            <Button onClick={() => (window.location.href = "/")} className="bg-green-500 hover:bg-green-600">
              Voltar ao Início
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4 sm:p-6 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Rastreamento de Pedido</h1>
          <p className="text-gray-400">ID: {order.id}</p>
        </div>

        {/* Status Card */}
        <Card className="bg-[#1a1a1a] border-white/10 p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            {getStatusIcon(order.status)}
            <div>
              <h2 className={`text-2xl font-bold ${getStatusColor(order.status)}`}>{getStatusText(order.status)}</h2>
              <p className="text-gray-400 text-sm mt-1">
                Última atualização: {new Date(order.updated_at).toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
        </Card>

        {/* Order Details */}
        <Card className="bg-[#1a1a1a] border-white/10 p-6">
          <h3 className="text-xl font-bold text-white mb-4">Detalhes do Pedido</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-gray-400">Usuário Roblox</span>
              <span className="text-white font-semibold">@{order.roblox_username}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-gray-400">Quantidade de Robux</span>
              <span className="text-green-400 font-bold text-lg">{order.robux_amount.toLocaleString()} Robux</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-gray-400">Valor Total</span>
              <span className="text-white font-semibold">
                R$ {Number.parseFloat(order.total_price.toString()).toFixed(2)}
              </span>
            </div>
            {order.email && (
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-gray-400">E-mail</span>
                <span className="text-white">{order.email}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-gray-400">Data do Pedido</span>
              <span className="text-white">{new Date(order.created_at).toLocaleString("pt-BR")}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-400">ID da Transação</span>
              <span className="text-white text-sm font-mono">{order.transaction_id}</span>
            </div>
          </div>
        </Card>

        {/* Status Timeline */}
        <Card className="bg-[#1a1a1a] border-white/10 p-6">
          <h3 className="text-xl font-bold text-white mb-4">Status do Pedido</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`w-3 h-3 rounded-full mt-1 ${
                  order.status === "pending" || order.status === "completed" || order.status === "cancelled"
                    ? "bg-green-400"
                    : "bg-gray-600"
                }`}
              />
              <div className="flex-1">
                <p className="text-white font-semibold">Pedido Criado</p>
                <p className="text-gray-400 text-sm">{new Date(order.created_at).toLocaleString("pt-BR")}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div
                className={`w-3 h-3 rounded-full mt-1 ${
                  order.status === "completed"
                    ? "bg-green-400"
                    : order.status === "pending"
                      ? "bg-yellow-400 animate-pulse"
                      : "bg-gray-600"
                }`}
              />
              <div className="flex-1">
                <p className="text-white font-semibold">Aguardando Pagamento</p>
                <p className="text-gray-400 text-sm">
                  {order.status === "pending"
                    ? "Em andamento..."
                    : order.status === "completed"
                      ? "Pagamento confirmado"
                      : "Pendente"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div
                className={`w-3 h-3 rounded-full mt-1 ${order.status === "completed" ? "bg-green-400" : "bg-gray-600"}`}
              />
              <div className="flex-1">
                <p className="text-white font-semibold">Robux Entregues</p>
                <p className="text-gray-400 text-sm">
                  {order.status === "completed" ? "Concluído" : "Aguardando pagamento"}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={fetchOrder} className="flex-1 bg-blue-500 hover:bg-blue-600">
            Atualizar Status
          </Button>
          <Button
            onClick={() => (window.location.href = "/")}
            variant="outline"
            className="flex-1 border-white/20 text-white hover:bg-white/10"
          >
            Voltar ao Início
          </Button>
        </div>
      </div>
    </div>
  )
}
