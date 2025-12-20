import { useState } from "react";
import { Button } from "@/components/ui/button";
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
  Play
} from "lucide-react";
import { SiBitcoin, SiEthereum, SiTether, SiSolana, SiBinance, SiDogecoin } from "react-icons/si";
import backgroundImage from "@assets/IMG_0743_1766214855038.jpeg";

type Step = "welcome" | "chat" | "topup" | "payment" | "success";
type PaymentMethod = "kompas" | "qris" | "bank" | "va" | "crypto";
type CryptoOption = "btc" | "eth" | "usdt" | "sol" | "bnb" | "doge";

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
  bonus: number;
  popular?: boolean;
  color: string;
}

const products: Product[] = [
  { id: "1", name: "Hemat", price: 25000, coins: 25, bonus: 0, color: "from-slate-500 to-slate-700" },
  { id: "2", name: "Populer", price: 50000, coins: 50, bonus: 5, popular: true, color: "from-violet-500 to-purple-700" },
  { id: "3", name: "Super", price: 100000, coins: 100, bonus: 15, color: "from-blue-500 to-cyan-600" },
  { id: "4", name: "Mega", price: 200000, coins: 200, bonus: 40, color: "from-emerald-500 to-teal-600" },
  { id: "5", name: "Ultimate", price: 500000, coins: 500, bonus: 125, color: "from-amber-500 to-orange-600" },
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
  chat: 20,
  topup: 40,
  payment: 70,
  success: 100,
};

export default function DemoWidgetPage() {
  const [step, setStep] = useState<Step>("welcome");
  const [userCoins, setUserCoins] = useState(52);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("qris");
  const [selectedBank, setSelectedBank] = useState<string>("bca");
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoOption>("btc");
  const [copied, setCopied] = useState(false);

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
      addMessage("bot", "Halo! Selamat datang di Chatvice Demo.\n\nSaya adalah asisten virtual yang siap membantu Anda. Apa yang bisa saya bantu?", [
        { label: "Top Up Koin", action: "topup" },
        { label: "Lihat Produk", action: "products" },
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
      if (msg.includes("topup") || msg.includes("top up") || msg.includes("koin") || msg.includes("coin") || msg.includes("beli")) {
        addMessage("bot", "Tentu! Silakan pilih paket koin yang Anda inginkan:", [
          { label: "Lihat Paket Koin", action: "topup" },
        ]);
      } else if (msg.includes("produk") || msg.includes("product")) {
        addMessage("bot", "Untuk membeli produk, Anda membutuhkan koin.", [
          { label: "Top Up Koin", action: "topup" },
        ]);
      } else {
        addMessage("bot", "Terima kasih! Ada yang bisa saya bantu lagi?", [
          { label: "Top Up Koin", action: "topup" },
          { label: "Bantuan", action: "help" },
        ]);
      }
    }, 600);
  };

  const handleAction = (action: string) => {
    if (action === "topup") {
      addMessage("user", "Saya ingin top up koin");
      setTimeout(() => {
        addMessage("bot", "Baik! Mengarahkan ke halaman top up...");
        setTimeout(() => setStep("topup"), 400);
      }, 400);
    } else if (action === "products") {
      addMessage("user", "Lihat produk");
      setTimeout(() => {
        addMessage("bot", `Saldo koin Anda: ${userCoins} koin. Top up dulu?`, [
          { label: "Top Up Koin", action: "topup" },
        ]);
      }, 400);
    } else if (action === "help") {
      addMessage("user", "Bantuan");
      setTimeout(() => {
        addMessage("bot", "Saya bisa membantu:\n\n- Top up koin\n- Info produk\n- Status transaksi", [
          { label: "Top Up Koin", action: "topup" },
        ]);
      }, 400);
    }
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setStep("payment");
  };

  const handlePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const newOrderId = `CVT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      setOrderId(newOrderId);
      if (selectedProduct) {
        setUserCoins(prev => prev + selectedProduct.coins + selectedProduct.bonus);
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
  };

  const progress = stepProgress[step];

  return (
    <div 
      className="min-h-screen w-full flex flex-col"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Progress Bar */}
      {step !== "welcome" && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <div className="h-1 bg-white/10">
            <div 
              className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between px-4 py-2 text-xs font-light text-white/60">
            <span>Chat</span>
            <span>Pilih Paket</span>
            <span>Pembayaran</span>
            <span>Selesai</span>
          </div>
        </div>
      )}

      {/* Welcome Screen */}
      {step === "welcome" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div 
            className="text-center space-y-8 p-8 rounded-3xl max-w-sm w-full"
            style={{
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-2xl shadow-blue-500/30">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Chatvice Demo</h1>
              <p className="text-white/60 font-light text-sm">Simulasi pengalaman top up koin</p>
            </div>
            <Button 
              className="w-full h-14 rounded-2xl text-lg font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 border-0 shadow-xl shadow-blue-500/30"
              onClick={startDemo}
              data-testid="button-start-demo"
            >
              <Play className="w-5 h-5 mr-2" />
              Mulai Demo
            </Button>
          </div>
        </div>
      )}

      {/* Chat Screen */}
      {step === "chat" && (
        <div className="flex-1 flex flex-col pt-12">
          {/* Header */}
          <div 
            className="px-4 py-3"
            style={{
              background: 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Chatvice Assistant</p>
                <p className="text-xs text-white/50 font-light">Online</p>
              </div>
              <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20">
                <Coins className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 font-bold text-sm">{userCoins}</span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                <div 
                  className={`max-w-[85%] rounded-2xl p-4 ${
                    msg.from === "user" 
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600" 
                      : ""
                  }`}
                  style={msg.from === "bot" ? {
                    background: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  } : undefined}
                >
                  <p className="text-white text-sm font-light whitespace-pre-line">{msg.content}</p>
                  {msg.actions && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {msg.actions.map((action, idx) => (
                        <button
                          key={idx}
                          className="px-4 py-2 rounded-xl text-xs font-medium text-white bg-white/20 hover:bg-white/30 transition-all"
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

          {/* Input */}
          <div 
            className="p-4"
            style={{
              background: 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Ketik pesan..."
                className="flex-1 h-12 px-4 rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-500/50 text-sm"
                data-testid="input-chat-message"
              />
              <Button 
                size="icon"
                className="h-12 w-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600"
                onClick={handleSendMessage}
                data-testid="button-send-message"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Top Up Selection - 3D Frosted Glass Cards */}
      {step === "topup" && (
        <div className="flex-1 flex flex-col pt-12">
          <div 
            className="px-4 py-3 flex items-center gap-3"
            style={{
              background: 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <button 
              onClick={() => setStep("chat")}
              className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"
              data-testid="button-back-to-chat"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <p className="font-bold text-white text-lg">Pilih Paket</p>
              <p className="text-xs text-white/50 font-light">Saldo: {userCoins} koin</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              {products.map((product, index) => (
                <div
                  key={product.id}
                  onClick={() => handleSelectProduct(product)}
                  className="cursor-pointer transform transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    perspective: '1000px',
                    animation: `slideInUp 0.4s ease-out ${index * 0.08}s both`,
                  }}
                  data-testid={`package-${product.id}`}
                >
                  <div 
                    className="relative rounded-2xl p-4 overflow-hidden"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      backdropFilter: 'blur(40px)',
                      WebkitBackdropFilter: 'blur(40px)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                      transform: 'translateZ(0)',
                    }}
                  >
                    {product.popular && (
                      <div className="absolute top-0 right-0 px-3 py-1 rounded-bl-xl bg-gradient-to-r from-amber-400 to-orange-500 text-xs font-bold text-black">
                        POPULER
                      </div>
                    )}
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${product.color} flex items-center justify-center shadow-lg`}>
                        <Coins className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-white text-lg">{product.name}</p>
                        <p className="text-white/50 font-light text-sm">
                          {product.coins} koin {product.bonus > 0 && <span className="text-emerald-400">+{product.bonus} bonus</span>}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-white text-lg">{formatRupiah(product.price)}</p>
                        <ArrowRight className="w-5 h-5 text-white/40 ml-auto" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Payment Screen - 3D Card Selection */}
      {step === "payment" && selectedProduct && (
        <div className="flex-1 flex flex-col pt-12">
          <div 
            className="px-4 py-3 flex items-center gap-3"
            style={{
              background: 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <button 
              onClick={() => setStep("topup")}
              className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"
              data-testid="button-back-to-topup"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <p className="font-bold text-white text-lg">Pembayaran</p>
              <p className="text-xs text-white/50 font-light">{selectedProduct.name} - {formatRupiah(selectedProduct.price)}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Order Summary */}
            <div 
              className="rounded-2xl p-4"
              style={{
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(40px)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${selectedProduct.color} flex items-center justify-center`}>
                  <Coins className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white">{selectedProduct.name}</p>
                  <p className="text-white/50 text-sm font-light">
                    {selectedProduct.coins + selectedProduct.bonus} koin total
                  </p>
                </div>
                <p className="font-bold text-white text-xl">{formatRupiah(selectedProduct.price)}</p>
              </div>
            </div>

            {/* Payment Method Title */}
            <p className="text-white font-bold text-lg px-1">Metode Pembayaran</p>

            {/* 3D Payment Method Cards */}
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map((method, index) => {
                const IconComponent = method.icon;
                const isSelected = selectedPaymentMethod === method.id;
                return (
                  <div
                    key={method.id}
                    onClick={() => setSelectedPaymentMethod(method.id)}
                    className="cursor-pointer"
                    style={{
                      perspective: '1000px',
                      animation: `slideInUp 0.3s ease-out ${index * 0.05}s both`,
                    }}
                    data-testid={`payment-method-${method.id}`}
                  >
                    <div 
                      className={`relative rounded-2xl p-4 transform transition-all duration-300 ${
                        isSelected ? 'scale-[1.02]' : 'hover:scale-[1.02]'
                      }`}
                      style={{
                        background: isSelected 
                          ? 'rgba(59,130,246,0.2)' 
                          : 'rgba(255,255,255,0.08)',
                        backdropFilter: 'blur(40px)',
                        border: isSelected 
                          ? '2px solid rgba(59,130,246,0.5)' 
                          : '1px solid rgba(255,255,255,0.1)',
                        boxShadow: isSelected 
                          ? '0 8px 32px rgba(59,130,246,0.3)' 
                          : '0 4px 16px rgba(0,0,0,0.2)',
                        transform: isSelected ? 'translateY(-4px)' : 'translateY(0)',
                      }}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${method.gradient} flex items-center justify-center mb-3 shadow-lg`}>
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <p className="font-bold text-white text-sm">{method.name}</p>
                      <p className="text-white/50 text-xs font-light">{method.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Payment Details */}
            {selectedPaymentMethod === "kompas" && (
              <div 
                className="rounded-2xl p-4"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(40px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <p className="text-white/60 text-sm font-light mb-3">
                  Klik tombol di bawah untuk melanjutkan ke halaman pembayaran.
                </p>
                <a 
                  href="https://pay.kompas.id/pay" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-cyan-400 text-sm font-medium"
                  data-testid="link-kompas-pay"
                >
                  <ExternalLink className="w-4 h-4" />
                  Buka Halaman Pembayaran
                </a>
              </div>
            )}

            {selectedPaymentMethod === "qris" && (
              <div 
                className="rounded-2xl p-4 text-center"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(40px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div className="w-32 h-32 mx-auto rounded-2xl bg-white flex items-center justify-center mb-3">
                  <QrCode className="w-20 h-20 text-gray-400" />
                </div>
                <p className="text-white/60 text-sm font-light">Scan dengan e-wallet atau m-banking</p>
              </div>
            )}

            {selectedPaymentMethod === "bank" && (
              <div className="space-y-2">
                {bankOptions.map((bank) => (
                  <div
                    key={bank.id}
                    onClick={() => setSelectedBank(bank.id)}
                    className={`rounded-2xl p-4 cursor-pointer transition-all ${
                      selectedBank === bank.id ? 'scale-[1.01]' : ''
                    }`}
                    style={{
                      background: selectedBank === bank.id 
                        ? 'rgba(59,130,246,0.15)' 
                        : 'rgba(255,255,255,0.05)',
                      backdropFilter: 'blur(20px)',
                      border: selectedBank === bank.id 
                        ? '1px solid rgba(59,130,246,0.3)' 
                        : '1px solid rgba(255,255,255,0.1)',
                    }}
                    data-testid={`bank-option-${bank.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                          style={{ background: bank.color }}
                        >
                          {bank.name}
                        </div>
                        <div>
                          <p className="font-mono text-white text-sm">{bank.accountNumber}</p>
                          <p className="text-white/50 text-xs font-light">{bank.accountName}</p>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(bank.accountNumber); }}
                        className="p-2 rounded-lg bg-white/10"
                        data-testid={`button-copy-bank-${bank.id}`}
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-white/60" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedPaymentMethod === "va" && (
              <div 
                className="rounded-2xl p-4"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(40px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <p className="text-white/50 text-xs font-light mb-2">Nomor Virtual Account</p>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-white text-xl font-bold" data-testid="text-va-number">
                    {getVANumber()}
                  </span>
                  <button 
                    onClick={() => copyToClipboard(getVANumber())}
                    className="p-2 rounded-lg bg-white/10"
                    data-testid="button-copy-va"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-white/60" />}
                  </button>
                </div>
                <p className="text-white/40 text-xs font-light mt-2">Berlaku 24 jam</p>
              </div>
            )}

            {selectedPaymentMethod === "crypto" && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {cryptoCoins.map((coin) => {
                    const CoinIcon = coin.icon;
                    return (
                      <div 
                        key={coin.id}
                        onClick={() => setSelectedCrypto(coin.id)}
                        className={`rounded-xl p-3 text-center cursor-pointer transition-all ${
                          selectedCrypto === coin.id ? 'scale-[1.05]' : ''
                        }`}
                        style={{
                          background: selectedCrypto === coin.id 
                            ? 'rgba(255,255,255,0.15)' 
                            : 'rgba(255,255,255,0.05)',
                          border: selectedCrypto === coin.id 
                            ? `2px solid ${coin.color}` 
                            : '1px solid rgba(255,255,255,0.1)',
                        }}
                        data-testid={`crypto-option-${coin.id}`}
                      >
                        <CoinIcon className="w-7 h-7 mx-auto mb-1" style={{ color: coin.color }} />
                        <p className="text-white text-xs font-bold">{coin.symbol}</p>
                      </div>
                    );
                  })}
                </div>
                {selectedCrypto && (() => {
                  const coin = cryptoCoins.find(c => c.id === selectedCrypto);
                  const CoinIcon = coin?.icon || SiBitcoin;
                  return (
                    <div 
                      className="rounded-2xl p-4"
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        backdropFilter: 'blur(40px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <CoinIcon className="w-5 h-5" style={{ color: coin?.color }} />
                        <span className="font-bold text-white">{coin?.name}</span>
                        <span className="text-xs text-white/50 px-2 py-0.5 rounded-full bg-white/10">{coin?.network}</span>
                      </div>
                      <p className="text-white/50 text-xs font-light mb-1">Alamat Wallet</p>
                      <div className="flex items-center gap-2 bg-black/30 rounded-lg p-2">
                        <span className="font-mono text-xs text-white/80 break-all flex-1" data-testid="text-crypto-address">
                          {coin?.address}
                        </span>
                        <button 
                          onClick={() => copyToClipboard(coin?.address || "")}
                          className="p-1.5 rounded-lg bg-white/10 shrink-0"
                          data-testid="button-copy-crypto"
                        >
                          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-white/60" />}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Processing State */}
            {isProcessing && (
              <div 
                className="rounded-2xl p-6 text-center"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(40px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div className="relative mx-auto w-16 h-16 mb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                  </div>
                  <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-cyan-400" />
                </div>
                <p className="font-bold text-white">Memproses Pembayaran...</p>
                <p className="text-white/50 text-sm font-light">Mohon tunggu</p>
              </div>
            )}
          </div>

          {/* Footer Button */}
          <div 
            className="p-4"
            style={{
              background: 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {selectedPaymentMethod === "kompas" && (
              <Button 
                asChild
                className="w-full h-14 rounded-2xl text-base font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 mb-2" 
                data-testid="button-open-kompas"
              >
                <a href="https://pay.kompas.id/pay" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Buka Payment Link
                </a>
              </Button>
            )}
            <Button 
              className="w-full h-14 rounded-2xl text-base font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 shadow-xl shadow-emerald-500/20" 
              onClick={handlePayment}
              disabled={isProcessing}
              data-testid="button-pay"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 mr-2" />
                  Bayar {formatRupiah(selectedProduct.price)}
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Success Screen */}
      {step === "success" && selectedProduct && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 pt-12">
          <div 
            className="text-center p-8 rounded-3xl max-w-sm w-full"
            style={{
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(40px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center mb-6 shadow-2xl shadow-emerald-500/30">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Pembayaran Berhasil!</h2>
            <p className="text-white/50 font-light text-sm mb-6">Transaksi telah selesai</p>
            
            <div className="space-y-3 text-left mb-6">
              <div className="flex justify-between">
                <span className="text-white/50 font-light text-sm">Order ID</span>
                <span className="font-mono text-white text-xs" data-testid="text-order-id">{orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50 font-light text-sm">Paket</span>
                <span className="text-white font-medium" data-testid="text-order-package">{selectedProduct.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50 font-light text-sm">Koin Diterima</span>
                <span className="text-emerald-400 font-bold" data-testid="text-coins-received">
                  +{selectedProduct.coins + selectedProduct.bonus}
                </span>
              </div>
              <div className="flex justify-between pt-3 border-t border-white/10">
                <span className="text-white/50 font-light text-sm">Saldo Baru</span>
                <div className="flex items-center gap-1">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-400 font-bold" data-testid="text-new-balance">{userCoins}</span>
                </div>
              </div>
            </div>

            <Button 
              className="w-full h-12 rounded-2xl font-semibold bg-gradient-to-r from-cyan-500 to-blue-600"
              onClick={resetDemo}
              data-testid="button-new-transaction"
            >
              Demo Baru
            </Button>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
