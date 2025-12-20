import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Coins, 
  CheckCircle2, 
  ArrowRight, 
  Send, 
  Bot, 
  CreditCard,
  QrCode,
  Loader2,
  ExternalLink,
  ArrowLeft,
  Sparkles,
  Building2,
  Smartphone,
  Bitcoin,
  Copy,
  Check,
  Play,
  User,
  Mail,
  Lock,
  LogIn
} from "lucide-react";
import { SiBitcoin, SiEthereum, SiTether, SiSolana, SiBinance, SiDogecoin } from "react-icons/si";
import backgroundImage from "@assets/IMG_0743_1766214855038.jpeg";

type Step = "welcome" | "chat" | "topup" | "auth" | "payment" | "success";
type PaymentMethod = "kompas" | "qris" | "bank" | "va" | "crypto";
type CryptoOption = "btc" | "eth" | "usdt" | "sol" | "bnb" | "doge";
type AuthMode = "login" | "signup";

interface PaymentMethodOption {
  id: PaymentMethod;
  name: string;
  description: string;
  icon: typeof QrCode;
  gradient: string;
}

interface BankOption {
  id: string;
  name: string;
  accountNumber: string;
  accountName: string;
  color: string;
}

interface CryptoCoin {
  id: CryptoOption;
  name: string;
  symbol: string;
  network: string;
  address: string;
  icon: typeof SiBitcoin;
  color: string;
}

const paymentMethods: PaymentMethodOption[] = [
  { id: "kompas", name: "Payment Link", description: "Bayar via link", icon: ExternalLink, gradient: "from-blue-500 to-purple-600" },
  { id: "qris", name: "QRIS", description: "Scan QR", icon: QrCode, gradient: "from-emerald-400 to-teal-600" },
  { id: "bank", name: "Transfer Bank", description: "BCA, Mandiri, BNI, BRI", icon: Building2, gradient: "from-slate-600 to-slate-800" },
  { id: "va", name: "Virtual Account", description: "VA otomatis", icon: Smartphone, gradient: "from-green-500 to-emerald-600" },
  { id: "crypto", name: "Crypto", description: "BTC, ETH, USDT", icon: Bitcoin, gradient: "from-orange-400 to-amber-600" },
];

const bankOptions: BankOption[] = [
  { id: "bca", name: "BCA", accountNumber: "1234567890", accountName: "PT Chatvice Indonesia", color: "#003D79" },
  { id: "mandiri", name: "Mandiri", accountNumber: "0987654321", accountName: "PT Chatvice Indonesia", color: "#003366" },
  { id: "bni", name: "BNI", accountNumber: "1122334455", accountName: "PT Chatvice Indonesia", color: "#F15A22" },
  { id: "bri", name: "BRI", accountNumber: "5544332211", accountName: "PT Chatvice Indonesia", color: "#00529C" },
];

const cryptoCoins: CryptoCoin[] = [
  { id: "btc", name: "Bitcoin", symbol: "BTC", network: "Bitcoin", address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", icon: SiBitcoin, color: "#F7931A" },
  { id: "eth", name: "Ethereum", symbol: "ETH", network: "ERC-20", address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", icon: SiEthereum, color: "#627EEA" },
  { id: "usdt", name: "Tether", symbol: "USDT", network: "TRC-20", address: "TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9", icon: SiTether, color: "#26A17B" },
  { id: "sol", name: "Solana", symbol: "SOL", network: "Solana", address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", icon: SiSolana, color: "#9945FF" },
  { id: "bnb", name: "BNB", symbol: "BNB", network: "BEP-20", address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", icon: SiBinance, color: "#F3BA2F" },
  { id: "doge", name: "Dogecoin", symbol: "DOGE", network: "Dogecoin", address: "DFundmtrigzA6E25Swr2pRe4Eb79bGP8G1", icon: SiDogecoin, color: "#C2A633" },
];

interface Message {
  id: string;
  from: "user" | "bot";
  content: string;
  timestamp: Date;
  actions?: { label: string; action: string }[];
}

interface Product {
  id: string;
  name: string;
  price: number;
  coins: number;
  color: string;
}

const products: Product[] = [
  { id: "1", name: "25 Koin", price: 25000, coins: 25, color: "from-slate-500 to-slate-700" },
  { id: "2", name: "50 Koin", price: 50000, coins: 50, color: "from-violet-500 to-purple-700" },
  { id: "3", name: "100 Koin", price: 100000, coins: 100, color: "from-blue-500 to-cyan-600" },
  { id: "4", name: "200 Koin", price: 200000, coins: 200, color: "from-emerald-500 to-teal-600" },
  { id: "5", name: "500 Koin", price: 500000, coins: 500, color: "from-amber-500 to-orange-600" },
];

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

const stepProgress: Record<Step, number> = {
  welcome: 0,
  chat: 15,
  topup: 35,
  auth: 55,
  payment: 75,
  success: 100,
};

export default function DemoWidgetPage() {
  const isMobile = useIsMobile();
  const [step, setStep] = useState<Step>("welcome");
  const [userCoins, setUserCoins] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("qris");
  const [selectedBank, setSelectedBank] = useState<string>("bca");
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoOption>("btc");
  const [copied, setCopied] = useState(false);
  
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getVANumber = () => {
    const bankCode = selectedBank.toUpperCase();
    return `${bankCode}${Date.now().toString().slice(-10)}`;
  };

  const addMessage = (from: "user" | "bot", content: string, actions?: { label: string; action: string }[]) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      from,
      content,
      timestamp: new Date(),
      actions,
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const startDemo = () => {
    setStep("chat");
    setTimeout(() => {
      addMessage("bot", "Halo! Selamat datang di Chatvice.\n\nSaya asisten virtual yang siap membantu. Apa yang bisa saya bantu?", [
        { label: "Top Up Koin", action: "topup" },
        { label: "Bantuan", action: "help" },
      ]);
    }, 300);
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    
    addMessage("user", inputMessage);
    const msg = inputMessage.toLowerCase();
    setInputMessage("");

    setTimeout(() => {
      if (msg.includes("topup") || msg.includes("top up") || msg.includes("koin") || msg.includes("beli")) {
        addMessage("bot", "Tentu! Silakan pilih paket koin:", [
          { label: "Lihat Paket", action: "topup" },
        ]);
      } else {
        addMessage("bot", "Ada yang bisa saya bantu?", [
          { label: "Top Up Koin", action: "topup" },
        ]);
      }
    }, 500);
  };

  const handleAction = (action: string) => {
    if (action === "topup") {
      addMessage("user", "Top up koin");
      setTimeout(() => {
        addMessage("bot", "Mengarahkan ke halaman top up...");
        setTimeout(() => setStep("topup"), 400);
      }, 300);
    } else if (action === "help") {
      addMessage("user", "Bantuan");
      setTimeout(() => {
        addMessage("bot", "Saya bisa membantu:\n- Top up koin\n- Info produk", [
          { label: "Top Up Koin", action: "topup" },
        ]);
      }, 300);
    }
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setStep("auth");
  };

  const handleAuth = () => {
    if (!authEmail.trim() || !authPassword.trim()) return;
    if (authMode === "signup" && !authName.trim()) return;

    setIsAuthLoading(true);
    setTimeout(() => {
      const newCustomerId = `CUS-${Date.now().toString(36).toUpperCase()}`;
      const newOrderId = `CVT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      setCustomerId(newCustomerId);
      setOrderId(newOrderId);
      setIsAuthLoading(false);
      setStep("payment");
    }, 1500);
  };

  const handlePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      if (selectedProduct) {
        setUserCoins(prev => prev + selectedProduct.coins);
      }
      setIsProcessing(false);
      setStep("success");
    }, 2000);
  };

  const resetDemo = () => {
    setStep("welcome");
    setMessages([]);
    setSelectedProduct(null);
    setOrderId("");
    setCustomerId("");
    setAuthEmail("");
    setAuthPassword("");
    setAuthName("");
    setUserCoins(0);
  };

  const progress = stepProgress[step];

  const widgetContent = (
    <div className="h-full w-full flex flex-col relative overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Progress Bar */}
      {step !== "welcome" && (
        <div className="relative z-10">
          <div className="h-1 bg-white/10">
            <div 
              className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between px-3 py-1.5 text-[10px] font-light text-white/50">
            <span className={step === "chat" ? "text-cyan-400" : ""}>Chat</span>
            <span className={step === "topup" ? "text-cyan-400" : ""}>Paket</span>
            <span className={step === "auth" ? "text-cyan-400" : ""}>Login</span>
            <span className={step === "payment" ? "text-cyan-400" : ""}>Bayar</span>
            <span className={step === "success" ? "text-cyan-400" : ""}>Selesai</span>
          </div>
        </div>
      )}

      {/* Welcome Screen */}
      {step === "welcome" && (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6">
          <div 
            className="text-center space-y-6 p-6 rounded-2xl w-full max-w-xs"
            style={{
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-xl">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Chatvice Demo</h1>
              <p className="text-white/50 font-light text-xs">Simulasi top up koin</p>
            </div>
            <Button 
              className="w-full h-12 rounded-xl font-semibold bg-gradient-to-r from-cyan-500 to-blue-600"
              onClick={startDemo}
              data-testid="button-start-demo"
            >
              <Play className="w-4 h-4 mr-2" />
              Mulai Demo
            </Button>
          </div>
        </div>
      )}

      {/* Chat Screen */}
      {step === "chat" && (
        <div className="relative z-10 flex-1 flex flex-col">
          <div 
            className="px-3 py-2 flex items-center gap-2"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(20px)' }}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white text-xs">Chatvice</p>
              <p className="text-[10px] text-white/40">Online</p>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20">
              <Coins className="w-3 h-3 text-amber-400" />
              <span className="text-amber-400 font-bold text-xs">{userCoins}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                <div 
                  className={`max-w-[85%] rounded-xl p-3 ${
                    msg.from === "user" ? "bg-gradient-to-r from-cyan-500 to-blue-600" : ""
                  }`}
                  style={msg.from === "bot" ? {
                    background: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  } : undefined}
                >
                  <p className="text-white text-xs font-light whitespace-pre-line">{msg.content}</p>
                  {msg.actions && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {msg.actions.map((action, idx) => (
                        <button
                          key={idx}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-medium text-white bg-white/20 hover:bg-white/30"
                          onClick={() => handleAction(action.action)}
                          data-testid={`action-${action.action}`}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(20px)' }}>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Ketik pesan..."
                className="flex-1 h-10 px-3 rounded-lg bg-white/10 border border-white/10 text-white placeholder:text-white/30 focus:outline-none text-xs"
                data-testid="input-chat-message"
              />
              <Button size="icon" className="h-10 w-10 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600" onClick={handleSendMessage} data-testid="button-send-message">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Top Up Selection */}
      {step === "topup" && (
        <div className="relative z-10 flex-1 flex flex-col">
          <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(20px)' }}>
            <button onClick={() => setStep("chat")} className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center" data-testid="button-back-to-chat">
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>
            <div>
              <p className="font-bold text-white text-sm">Pilih Paket</p>
              <p className="text-[10px] text-white/40">1 Koin = Rp 1.000</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {products.map((product, index) => (
              <div
                key={product.id}
                onClick={() => handleSelectProduct(product)}
                className="cursor-pointer transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{ animation: `slideIn 0.3s ease-out ${index * 0.05}s both` }}
                data-testid={`package-${product.id}`}
              >
                <div 
                  className="rounded-xl p-3"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(40px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${product.color} flex items-center justify-center`}>
                      <Coins className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-white text-sm">{product.name}</p>
                      <p className="text-white/40 font-light text-[10px]">{product.coins} koin</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white text-sm">{formatRupiah(product.price)}</p>
                      <ArrowRight className="w-4 h-4 text-white/30 ml-auto" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auth Screen */}
      {step === "auth" && selectedProduct && (
        <div className="relative z-10 flex-1 flex flex-col">
          <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(20px)' }}>
            <button onClick={() => setStep("topup")} className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center" data-testid="button-back-to-topup">
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>
            <div>
              <p className="font-bold text-white text-sm">{authMode === "login" ? "Masuk" : "Daftar"}</p>
              <p className="text-[10px] text-white/40">{selectedProduct.name} - {formatRupiah(selectedProduct.price)}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center">
            <div 
              className="w-full max-w-xs rounded-2xl p-5 space-y-4"
              style={{
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(40px)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div className="text-center mb-4">
                <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center mb-3">
                  <User className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-lg font-bold text-white">{authMode === "login" ? "Masuk ke Akun" : "Buat Akun Baru"}</h2>
                <p className="text-white/50 text-xs font-light">Untuk melanjutkan pembayaran</p>
              </div>

              <div className="space-y-3">
                {authMode === "signup" && (
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input
                      type="text"
                      placeholder="Nama lengkap"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      className="h-10 pl-10 bg-white/10 border-white/10 text-white placeholder:text-white/30 text-xs rounded-lg"
                      data-testid="input-auth-name"
                    />
                  </div>
                )}
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="h-10 pl-10 bg-white/10 border-white/10 text-white placeholder:text-white/30 text-xs rounded-lg"
                    data-testid="input-auth-email"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="h-10 pl-10 bg-white/10 border-white/10 text-white placeholder:text-white/30 text-xs rounded-lg"
                    data-testid="input-auth-password"
                  />
                </div>
              </div>

              <Button
                className="w-full h-10 rounded-xl font-semibold bg-gradient-to-r from-cyan-500 to-blue-600"
                onClick={handleAuth}
                disabled={isAuthLoading}
                data-testid="button-auth-submit"
              >
                {isAuthLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    {authMode === "login" ? "Masuk" : "Daftar"}
                  </>
                )}
              </Button>

              <div className="text-center">
                <button
                  onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}
                  className="text-cyan-400 text-xs font-medium hover:underline"
                  data-testid="button-toggle-auth-mode"
                >
                  {authMode === "login" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Screen */}
      {step === "payment" && selectedProduct && (
        <div className="relative z-10 flex-1 flex flex-col">
          <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(20px)' }}>
            <button onClick={() => setStep("auth")} className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center" data-testid="button-back-to-auth">
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>
            <div>
              <p className="font-bold text-white text-sm">Pembayaran</p>
              <p className="text-[10px] text-white/40">Order: {orderId}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* Order Summary */}
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${selectedProduct.color} flex items-center justify-center`}>
                  <Coins className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white text-sm">{selectedProduct.name}</p>
                  <p className="text-white/40 text-[10px]">ID: {customerId}</p>
                </div>
                <p className="font-bold text-white">{formatRupiah(selectedProduct.price)}</p>
              </div>
            </div>

            <p className="text-white font-bold text-sm px-1">Metode Pembayaran</p>

            {/* Payment Methods Grid */}
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map((method) => {
                const IconComponent = method.icon;
                const isSelected = selectedPaymentMethod === method.id;
                return (
                  <div
                    key={method.id}
                    onClick={() => setSelectedPaymentMethod(method.id)}
                    className="cursor-pointer"
                    data-testid={`payment-method-${method.id}`}
                  >
                    <div 
                      className={`rounded-xl p-3 transition-all duration-200 ${isSelected ? 'scale-[1.02]' : 'hover:scale-[1.01]'}`}
                      style={{
                        background: isSelected ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)',
                        backdropFilter: 'blur(40px)',
                        border: isSelected ? '2px solid rgba(59,130,246,0.5)' : '1px solid rgba(255,255,255,0.1)',
                        transform: isSelected ? 'translateY(-2px)' : 'none',
                      }}
                    >
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${method.gradient} flex items-center justify-center mb-2`}>
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>
                      <p className="font-bold text-white text-xs">{method.name}</p>
                      <p className="text-white/40 text-[10px]">{method.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Payment Details */}
            {selectedPaymentMethod === "kompas" && (
              <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p className="text-white/50 text-xs font-light mb-2">Lanjutkan ke halaman pembayaran.</p>
                <a href="https://pay.kompas.id/pay" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-cyan-400 text-xs font-medium" data-testid="link-kompas-pay">
                  <ExternalLink className="w-3 h-3" />Buka Payment Link
                </a>
              </div>
            )}

            {selectedPaymentMethod === "qris" && (
              <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="w-24 h-24 mx-auto rounded-xl bg-white flex items-center justify-center mb-2">
                  <QrCode className="w-16 h-16 text-gray-400" />
                </div>
                <p className="text-white/50 text-[10px]">Scan dengan e-wallet</p>
              </div>
            )}

            {selectedPaymentMethod === "bank" && (
              <div className="space-y-1.5">
                {bankOptions.map((bank) => (
                  <div
                    key={bank.id}
                    onClick={() => setSelectedBank(bank.id)}
                    className={`rounded-xl p-2.5 cursor-pointer ${selectedBank === bank.id ? 'scale-[1.01]' : ''}`}
                    style={{
                      background: selectedBank === bank.id ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)',
                      border: selectedBank === bank.id ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.1)',
                    }}
                    data-testid={`bank-option-${bank.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded flex items-center justify-center text-white font-bold text-[10px]" style={{ background: bank.color }}>{bank.name}</div>
                        <div>
                          <p className="font-mono text-white text-xs">{bank.accountNumber}</p>
                          <p className="text-white/40 text-[10px]">{bank.accountName}</p>
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); copyToClipboard(bank.accountNumber); }} className="p-1.5 rounded bg-white/10" data-testid={`button-copy-bank-${bank.id}`}>
                        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-white/50" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedPaymentMethod === "va" && (
              <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p className="text-white/40 text-[10px] mb-1">Virtual Account</p>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-white font-bold" data-testid="text-va-number">{getVANumber()}</span>
                  <button onClick={() => copyToClipboard(getVANumber())} className="p-1.5 rounded bg-white/10" data-testid="button-copy-va">
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-white/50" />}
                  </button>
                </div>
              </div>
            )}

            {selectedPaymentMethod === "crypto" && (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-1.5">
                  {cryptoCoins.map((coin) => {
                    const CoinIcon = coin.icon;
                    return (
                      <div 
                        key={coin.id}
                        onClick={() => setSelectedCrypto(coin.id)}
                        className={`rounded-lg p-2 text-center cursor-pointer ${selectedCrypto === coin.id ? 'scale-105' : ''}`}
                        style={{
                          background: selectedCrypto === coin.id ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
                          border: selectedCrypto === coin.id ? `1px solid ${coin.color}` : '1px solid rgba(255,255,255,0.1)',
                        }}
                        data-testid={`crypto-option-${coin.id}`}
                      >
                        <CoinIcon className="w-5 h-5 mx-auto mb-0.5" style={{ color: coin.color }} />
                        <p className="text-white text-[10px] font-bold">{coin.symbol}</p>
                      </div>
                    );
                  })}
                </div>
                {selectedCrypto && (() => {
                  const coin = cryptoCoins.find(c => c.id === selectedCrypto);
                  const CoinIcon = coin?.icon || SiBitcoin;
                  return (
                    <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <CoinIcon className="w-4 h-4" style={{ color: coin?.color }} />
                        <span className="font-bold text-white text-xs">{coin?.name}</span>
                        <span className="text-[10px] text-white/40 px-1.5 py-0.5 rounded bg-white/10">{coin?.network}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-black/30 rounded-lg p-2">
                        <span className="font-mono text-[10px] text-white/70 break-all flex-1" data-testid="text-crypto-address">{coin?.address}</span>
                        <button onClick={() => copyToClipboard(coin?.address || "")} className="p-1 rounded bg-white/10 shrink-0" data-testid="button-copy-crypto">
                          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-white/50" />}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {isProcessing && (
              <div className="rounded-xl p-5 text-center" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Loader2 className="w-10 h-10 animate-spin text-cyan-400 mx-auto mb-2" />
                <p className="font-bold text-white text-sm">Memproses...</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(20px)' }}>
            {selectedPaymentMethod === "kompas" && (
              <Button asChild className="w-full h-10 rounded-xl font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 mb-2" data-testid="button-open-kompas">
                <a href="https://pay.kompas.id/pay" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-1" />Buka Payment Link
                </a>
              </Button>
            )}
            <Button 
              className="w-full h-10 rounded-xl font-semibold bg-gradient-to-r from-emerald-500 to-teal-600" 
              onClick={handlePayment}
              disabled={isProcessing}
              data-testid="button-pay"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <><CreditCard className="w-4 h-4 mr-1" />Bayar {formatRupiah(selectedProduct.price)}</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Success Screen */}
      {step === "success" && selectedProduct && (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4">
          <div 
            className="text-center p-5 rounded-2xl w-full max-w-xs"
            style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Berhasil!</h2>
            <p className="text-white/50 font-light text-xs mb-4">Transaksi selesai</p>
            
            <div className="space-y-2 text-left text-xs mb-4">
              <div className="flex justify-between"><span className="text-white/50">Order ID</span><span className="font-mono text-white text-[10px]" data-testid="text-order-id">{orderId}</span></div>
              <div className="flex justify-between"><span className="text-white/50">Customer ID</span><span className="font-mono text-white text-[10px]" data-testid="text-customer-id">{customerId}</span></div>
              <div className="flex justify-between"><span className="text-white/50">Paket</span><span className="text-white font-medium" data-testid="text-order-package">{selectedProduct.name}</span></div>
              <div className="flex justify-between"><span className="text-white/50">Koin</span><span className="text-emerald-400 font-bold" data-testid="text-coins-received">+{selectedProduct.coins}</span></div>
              <div className="flex justify-between pt-2 border-t border-white/10">
                <span className="text-white/50">Saldo</span>
                <div className="flex items-center gap-1">
                  <Coins className="w-3 h-3 text-amber-400" />
                  <span className="text-amber-400 font-bold" data-testid="text-new-balance">{userCoins}</span>
                </div>
              </div>
            </div>

            <Button className="w-full h-10 rounded-xl font-semibold bg-gradient-to-r from-cyan-500 to-blue-600" onClick={resetDemo} data-testid="button-new-transaction">
              Demo Baru
            </Button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );

  if (isMobile) {
    return <div className="min-h-screen w-full">{widgetContent}</div>;
  }

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      }}
    >
      <div 
        className="w-[380px] h-[680px] rounded-3xl overflow-hidden shadow-2xl"
        style={{
          boxShadow: '0 25px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)',
        }}
      >
        {widgetContent}
      </div>
    </div>
  );
}
