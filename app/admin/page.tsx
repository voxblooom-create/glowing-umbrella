"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DollarSign, ShoppingCart, Clock, CheckCircle2, Edit2, Save, X } from "lucide-react"

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

interface Metrics {
  totalOrders: number
  totalRevenue: number
  pixGenerated: number
  paidPix: number
  pendingPix: number
}

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [error, setError] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [metrics, setMetrics] = useState<Metrics>({
    totalOrders: 0,
    totalRevenue: 0,
    pixGenerated: 0,
    paidPix: 0,
    pendingPix: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [editingOrder, setEditingOrder] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Order>>({})

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders()
    }
  }, [isAuthenticated])

  const fetchOrders = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: "221104" }),
      })

      if (!response.ok) {
        throw new Error("Failed to fetch orders")
      }

      const data = await response.json()
      setOrders(data.orders)
      setMetrics(data.metrics)
    } catch (error) {
      console.error("Error fetching orders:", error)
      alert("Erro ao carregar pedidos")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = () => {
    if (password === "221104") {
      setIsAuthenticated(true)
      setError(false)
    } else {
      setError(true)
      setTimeout(() => setError(false), 600)
    }
  }

  const startEdit = (order: Order) => {
    setEditingOrder(order.id)
    setEditForm({
      email: order.email || "",
      status: order.status,
    })
  }

  const cancelEdit = () => {
    setEditingOrder(null)
    setEditForm({})
  }

  const saveEdit = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: "221104",
          ...editForm,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update order")
      }

      await fetchOrders()
      setEditingOrder(null)
      setEditForm({})
      alert("✅ Pedido atualizado com sucesso!")
    } catch (error) {
      console.error("Error updating order:", error)
      alert("Erro ao atualizar pedido")
    }
  }
  // </CHANGE>

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <Card className="bg-[#1e1e1e] border-white/10 p-8 max-w-md w-full">
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-2">🔐 Painel Administrativo</h1>
              <p className="text-white/60 text-sm">Digite a senha para acessar</p>
            </div>

            <div className="space-y-4">
              <Input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className={`bg-black/30 border-white/20 text-white placeholder:text-white/40 h-12 ${
                  error ? "border-red-500 animate-shake" : ""
                }`}
              />

              <Button
                onClick={handleLogin}
                className={`w-full font-semibold py-6 text-base ${
                  error ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary/90"
                } text-white`}
              >
                {error ? "❌ Senha Incorreta" : "Entrar"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">📊 Painel Administrativo</h1>
          <div className="flex gap-2">
            <Button onClick={fetchOrders} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isLoading ? "Carregando..." : "🔄 Atualizar"}
            </Button>
            <Button
              onClick={() => setIsAuthenticated(false)}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              Sair
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="bg-[#1e1e1e] border-white/10 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">Total de Pedidos</p>
                <p className="text-3xl font-bold text-white">{metrics.totalOrders}</p>
              </div>
              <ShoppingCart className="w-12 h-12 text-primary" />
            </div>
          </Card>

          <Card className="bg-[#1e1e1e] border-white/10 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">Receita Total</p>
                <p className="text-3xl font-bold text-green-400">R$ {metrics.totalRevenue.toFixed(2)}</p>
              </div>
              <DollarSign className="w-12 h-12 text-green-400" />
            </div>
          </Card>

          <Card className="bg-[#1e1e1e] border-white/10 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">PIX Gerados</p>
                <p className="text-3xl font-bold text-white">{metrics.pixGenerated}</p>
              </div>
              <Clock className="w-12 h-12 text-blue-400" />
            </div>
          </Card>

          <Card className="bg-[#1e1e1e] border-white/10 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">PIX Pagos</p>
                <p className="text-3xl font-bold text-green-400">{metrics.paidPix}</p>
              </div>
              <CheckCircle2 className="w-12 h-12 text-green-400" />
            </div>
          </Card>

          <Card className="bg-[#1e1e1e] border-white/10 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">PIX Pendentes</p>
                <p className="text-3xl font-bold text-yellow-400">{metrics.pendingPix}</p>
              </div>
              <Clock className="w-12 h-12 text-yellow-400" />
            </div>
          </Card>

          <Card className="bg-[#1e1e1e] border-white/10 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">Taxa de Conversão</p>
                <p className="text-3xl font-bold text-primary">
                  {metrics.totalOrders > 0 ? ((metrics.paidPix / metrics.totalOrders) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <div className="text-4xl">📈</div>
            </div>
          </Card>
        </div>

        {/* Recent Orders */}
        <Card className="bg-[#1e1e1e] border-white/10 p-6">
          <h2 className="text-xl font-bold text-white mb-4">📦 Pedidos Recentes</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-white/60 text-sm font-semibold pb-3">ID</th>
                  <th className="text-left text-white/60 text-sm font-semibold pb-3">Usuário</th>
                  <th className="text-left text-white/60 text-sm font-semibold pb-3">Robux</th>
                  <th className="text-left text-white/60 text-sm font-semibold pb-3">Valor</th>
                  <th className="text-left text-white/60 text-sm font-semibold pb-3">E-mail</th>
                  <th className="text-left text-white/60 text-sm font-semibold pb-3">Status</th>
                  <th className="text-left text-white/60 text-sm font-semibold pb-3">Data</th>
                  <th className="text-left text-white/60 text-sm font-semibold pb-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-white/5">
                    <td className="py-4 text-white text-xs font-mono">{order.id.slice(0, 8)}...</td>
                    <td className="py-4 text-white text-sm">@{order.roblox_username}</td>
                    <td className="py-4 text-white text-sm font-semibold">{order.robux_amount.toLocaleString()}</td>
                    <td className="py-4 text-green-400 text-sm font-semibold">
                      R$ {Number.parseFloat(order.total_price.toString()).toFixed(2)}
                    </td>
                    <td className="py-4 text-white text-sm">
                      {editingOrder === order.id ? (
                        <Input
                          type="email"
                          value={editForm.email || ""}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="bg-black/30 border-white/20 text-white h-8 text-xs"
                        />
                      ) : (
                        order.email || "—"
                      )}
                    </td>
                    <td className="py-4">
                      {editingOrder === order.id ? (
                        <select
                          value={editForm.status}
                          onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                          className="bg-black/30 border-white/20 text-white rounded px-2 py-1 text-xs"
                        >
                          <option value="pending">Pendente</option>
                          <option value="completed">Concluído</option>
                          <option value="cancelled">Cancelado</option>
                        </select>
                      ) : (
                        <>
                          {order.status === "completed" && (
                            <span className="bg-green-500/20 text-green-400 text-xs font-semibold px-3 py-1 rounded-full">
                              ✓ Pago
                            </span>
                          )}
                          {order.status === "pending" && (
                            <span className="bg-yellow-500/20 text-yellow-400 text-xs font-semibold px-3 py-1 rounded-full">
                              ⏳ Pendente
                            </span>
                          )}
                          {order.status === "cancelled" && (
                            <span className="bg-red-500/20 text-red-400 text-xs font-semibold px-3 py-1 rounded-full">
                              ✕ Cancelado
                            </span>
                          )}
                        </>
                      )}
                    </td>
                    <td className="py-4 text-white/60 text-sm">{new Date(order.created_at).toLocaleString("pt-BR")}</td>
                    <td className="py-4">
                      {editingOrder === order.id ? (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => saveEdit(order.id)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 h-8 px-2"
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={cancelEdit}
                            size="sm"
                            variant="outline"
                            className="border-white/20 h-8 px-2 bg-transparent"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => startEdit(order)}
                          size="sm"
                          variant="outline"
                          className="border-white/20 text-white hover:bg-white/10 h-8 px-2"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orders.length === 0 && !isLoading && (
              <div className="text-center py-8 text-white/40">Nenhum pedido encontrado</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
