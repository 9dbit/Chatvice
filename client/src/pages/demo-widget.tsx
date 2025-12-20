import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  User, 
  Coins, 
  ShoppingCart, 
  CheckCircle2, 
  ArrowRight, 
  Send, 
  Bot, 
  Wallet,
  CreditCard,
  QrCode,
  Loader2,
  ExternalLink,
  ArrowLeft,
  Package,
  Sparkles,
  Building2,
  Smartphone,
  Bitcoin,
  ChevronRight,
  Copy,
  Check
} from "lucide-react";
import { SiBitcoin, SiEthereum, SiTether, SiSolana, SiBinance, SiDogecoin } from "react-icons/si";

type Step = "login" | "chat" | "topup" | "payment" | "success";
type PaymentMethod = "kompas" | "qris" | "bank" | "va" | "crypto";
type CryptoOption = "btc" | "eth" | "usdt" | "sol" | "bnb" | "doge";

interface PaymentMethodOption {
  id: PaymentMethod;
  name: string;
  description: string;
  icon: typeof QrCode;
}

interface BankOption {
  id: string;
  name: string;
  accountNumber: string;
  accountName: string;
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
  { id: "kompas", name: "Payment Link", description: "Bayar via link pembayaran", icon: ExternalLink },
  { id: "qris", name: "QRIS", description: "Scan QR untuk bayar", icon: QrCode },
  { id: "bank", name: "Transfer Bank", description: "BCA, Mandiri, BNI, BRI", icon: Building2 },
  { id: "va", name: "Virtual Account", description: "Nomor VA otomatis", icon: Smartphone },
  { id: "crypto", name: "Cryptocurrency", description: "BTC, ETH, USDT, SOL", icon: Bitcoin },
];

const bankOptions: BankOption[] = [
  { id: "bca", name: "Bank BCA", accountNumber: "1234567890", accountName: "PT Chatvice Indonesia" },
  { id: "mandiri", name: "Bank Mandiri", accountNumber: "0987654321", accountName: "PT Chatvice Indonesia" },
  { id: "bni", name: "Bank BNI", accountNumber: "1122334455", accountName: "PT Chatvice Indonesia" },
  { id: "bri", name: "Bank BRI", accountNumber: "5544332211", accountName: "PT Chatvice Indonesia" },
];

const cryptoCoins: CryptoCoin[] = [
  { id: "btc", name: "Bitcoin", symbol: "BTC", network: "Bitcoin Network", address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", icon: SiBitcoin, color: "#F7931A" },
  { id: "eth", name: "Ethereum", symbol: "ETH", network: "ERC-20", address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", icon: SiEthereum, color: "#627EEA" },
  { id: "usdt", name: "Tether", symbol: "USDT", network: "TRC-20", address: "TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9", icon: SiTether, color: "#26A17B" },
  { id: "sol", name: "Solana", symbol: "SOL", network: "Solana Network", address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", icon: SiSolana, color: "#9945FF" },
  { id: "bnb", name: "BNB", symbol: "BNB", network: "BEP-20", address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", icon: SiBinance, color: "#F3BA2F" },
  { id: "doge", name: "Dogecoin", symbol: "DOGE", network: "Dogecoin Network", address: "DFundmtrigzA6E25Swr2pRe4Eb79bGP8G1", icon: SiDogecoin, color: "#C2A633" },
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
}

const products: Product[] = [
  { id: "1", name: "Paket Hemat", price: 25000, coins: 25, bonus: 0 },
  { id: "2", name: "Paket Populer", price: 50000, coins: 50, bonus: 5, popular: true },
  { id: "3", name: "Paket Super", price: 100000, coins: 100, bonus: 15 },
  { id: "4", name: "Paket Mega", price: 200000, coins: 200, bonus: 40 },
  { id: "5", name: "Paket Ultimate", price: 500000, coins: 500, bonus: 125 },
];

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function DemoWidgetPage() {
  const [step, setStep] = useState<Step>("login");
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState("");
  const [userCoins, setUserCoins] = useState(0);
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

  const handleLogin = () => {
    if (!username.trim()) return;
    
    const generatedUserId = `USR-${Date.now().toString(36).toUpperCase()}`;
    setUserId(generatedUserId);
    setUserCoins(Math.floor(Math.random() * 50) + 10);
    setStep("chat");
    
    setTimeout(() => {
      addMessage("bot", `Selamat datang, ${username}!\n\nSaya adalah asisten virtual yang siap membantu Anda.\n\nApa yang bisa saya bantu hari ini?`, [
        { label: "Top Up Koin", action: "topup" },
        { label: "Lihat Produk", action: "products" },
        { label: "Bantuan", action: "help" },
      ]);
    }, 500);
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
        addMessage("bot", "Berikut produk-produk yang tersedia di platform kami. Untuk membeli produk, Anda membutuhkan koin.", [
          { label: "Top Up Koin", action: "topup" },
        ]);
      } else if (msg.includes("bantuan") || msg.includes("help")) {
        addMessage("bot", "Saya bisa membantu Anda dengan:\n\n- Top up koin untuk pembelian\n- Informasi produk\n- Status transaksi\n- Pertanyaan umum\n\nSilakan pilih atau ketik pertanyaan Anda.", [
          { label: "Top Up Koin", action: "topup" },
          { label: "Lihat Produk", action: "products" },
        ]);
      } else {
        addMessage("bot", "Terima kasih atas pesan Anda! Ada yang bisa saya bantu lagi?", [
          { label: "Top Up Koin", action: "topup" },
          { label: "Bantuan", action: "help" },
        ]);
      }
    }, 800);
  };

  const handleAction = (action: string) => {
    if (action === "topup") {
      addMessage("user", "Saya ingin top up koin");
      setTimeout(() => {
        addMessage("bot", "Baik! Mengarahkan Anda ke halaman top up...");
        setTimeout(() => setStep("topup"), 500);
      }, 500);
    } else if (action === "products") {
      addMessage("user", "Lihat produk");
      setTimeout(() => {
        addMessage("bot", "Untuk melihat dan membeli produk, Anda membutuhkan koin. Saldo koin Anda saat ini: " + userCoins + " koin.\n\nApakah Anda ingin top up koin terlebih dahulu?", [
          { label: "Top Up Koin", action: "topup" },
        ]);
      }, 500);
    } else if (action === "help") {
      addMessage("user", "Bantuan");
      setTimeout(() => {
        addMessage("bot", "Saya bisa membantu Anda dengan:\n\n- Top up koin untuk pembelian\n- Informasi produk\n- Status transaksi\n- Pertanyaan umum\n\nSilakan pilih atau ketik pertanyaan Anda.", [
          { label: "Top Up Koin", action: "topup" },
        ]);
      }, 500);
    }
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setStep("payment");
  };

  const handlePayment = () => {
    setIsProcessing(true);
    const newOrderId = `CVT-DEMO-${Date.now().toString(36).toUpperCase()}`;
    setOrderId(newOrderId);
    
    setTimeout(() => {
      setIsProcessing(false);
      if (selectedProduct) {
        setUserCoins(prev => prev + selectedProduct.coins + selectedProduct.bonus);
      }
      setStep("success");
    }, 3000);
  };

  const handleBackToChat = () => {
    setStep("chat");
    setSelectedProduct(null);
    
    if (step === "success" && selectedProduct) {
      setTimeout(() => {
        addMessage("bot", `Selamat! Top up berhasil!\n\nAnda mendapatkan ${selectedProduct.coins + selectedProduct.bonus} koin.\nSaldo koin Anda sekarang: ${userCoins} koin.\n\nAda yang bisa saya bantu lagi?`, [
          { label: "Top Up Lagi", action: "topup" },
          { label: "Lihat Produk", action: "products" },
        ]);
      }, 300);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md h-[700px] flex flex-col shadow-2xl">
        {/* Header */}
        <CardHeader className="border-b bg-primary text-primary-foreground rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Demo Widget</CardTitle>
                <CardDescription className="text-primary-foreground/70 text-xs">
                  {step === "login" ? "Login untuk memulai" : `${username} • ${userCoins} koin`}
                </CardDescription>
              </div>
            </div>
            {step !== "login" && (
              <Badge variant="secondary" className="gap-1" data-testid="badge-coin-balance">
                <Coins className="w-3 h-3" />
                {userCoins}
              </Badge>
            )}
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="flex-1 overflow-hidden p-0">
          {/* Login Step */}
          {step === "login" && (
            <div className="h-full flex flex-col items-center justify-center p-6 space-y-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-10 h-10 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">Selamat Datang</h2>
                <p className="text-sm text-muted-foreground">
                  Masukkan nama Anda untuk memulai demo
                </p>
              </div>
              <div className="w-full space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Nama Pengguna</Label>
                  <Input
                    id="username"
                    placeholder="Masukkan nama Anda..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    data-testid="input-username"
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleLogin}
                  disabled={!username.trim()}
                  data-testid="button-login"
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Mulai Demo
                </Button>
              </div>
            </div>
          )}

          {/* Chat Step */}
          {step === "chat" && (
            <div className="h-full flex flex-col">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((msg, msgIndex) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2 ${msg.from === "user" ? "justify-end" : "justify-start"}`}
                      data-testid={`chat-message-${msg.from}-${msgIndex}`}
                    >
                      {msg.from === "bot" && (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Bot className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <div className={`max-w-[80%] space-y-2`}>
                        <div
                          className={`rounded-2xl px-4 py-2 ${
                            msg.from === "user"
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted rounded-bl-md"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-line" data-testid={`text-message-content-${msgIndex}`}>{msg.content}</p>
                        </div>
                        {msg.actions && msg.actions.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {msg.actions.map((action, idx) => (
                              <Button
                                key={idx}
                                size="sm"
                                variant="outline"
                                onClick={() => handleAction(action.action)}
                                className="text-xs"
                                data-testid={`button-action-${action.action}`}
                              >
                                {action.label}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                      {msg.from === "user" && (
                        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ketik pesan..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    data-testid="input-message"
                  />
                  <Button onClick={handleSendMessage} size="icon" data-testid="button-send">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TopUp Step */}
          {step === "topup" && (
            <div className="h-full flex flex-col">
              <div className="p-4 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setStep("chat")} data-testid="button-back-chat">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <div>
                    <h3 className="font-semibold">Pilih Paket Koin</h3>
                    <p className="text-xs text-muted-foreground">Saldo: {userCoins} koin</p>
                  </div>
                </div>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {products.map((product) => (
                    <Card
                      key={product.id}
                      className={`hover-elevate cursor-pointer transition-all ${
                        product.popular ? "border-primary" : ""
                      }`}
                      onClick={() => handleSelectProduct(product)}
                      data-testid={`card-product-${product.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                              product.popular ? "bg-primary/10" : "bg-muted"
                            }`}>
                              <Coins className={`w-6 h-6 ${product.popular ? "text-primary" : "text-muted-foreground"}`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{product.name}</p>
                                {product.popular && (
                                  <Badge variant="default" className="text-xs">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    Populer
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {product.coins} koin {product.bonus > 0 && `+ ${product.bonus} bonus`}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-primary">{formatRupiah(product.price)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Payment Step */}
          {step === "payment" && selectedProduct && (
            <div className="h-full flex flex-col">
              <div className="p-4 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setStep("topup")} data-testid="button-back-topup">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <div>
                    <h3 className="font-semibold">Pembayaran</h3>
                    <p className="text-xs text-muted-foreground">{selectedProduct.name} - {formatRupiah(selectedProduct.price)}</p>
                  </div>
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {/* Order Summary */}
                  <Card>
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Paket</span>
                        <span className="font-medium">{selectedProduct.name}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Koin</span>
                        <span className="font-medium">{selectedProduct.coins} + {selectedProduct.bonus} bonus</span>
                      </div>
                      <div className="border-t pt-2 flex items-center justify-between">
                        <span className="font-semibold">Total</span>
                        <span className="font-bold text-primary">{formatRupiah(selectedProduct.price)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Payment Method Selection - Apple Style Floating Menu */}
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-gray-700">Pilih Metode Pembayaran</p>
                    <div 
                      className="rounded-2xl overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.85) 100%)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(255,255,255,0.5)',
                      }}
                    >
                      {paymentMethods.map((method, index) => {
                        const IconComponent = method.icon;
                        const isSelected = selectedPaymentMethod === method.id;
                        const gradients: Record<PaymentMethod, string> = {
                          kompas: 'from-blue-500 to-purple-600',
                          qris: 'from-emerald-400 to-teal-600',
                          bank: 'from-slate-700 to-slate-900',
                          va: 'from-green-500 to-emerald-600',
                          crypto: 'from-orange-400 to-amber-600',
                        };
                        return (
                          <div 
                            key={method.id}
                            className={`cursor-pointer transition-all p-3 flex items-center justify-between ${
                              isSelected ? "bg-blue-50/80" : "hover:bg-white/50"
                            } ${index !== paymentMethods.length - 1 ? "border-b border-gray-100" : ""}`}
                            onClick={() => setSelectedPaymentMethod(method.id)}
                            data-testid={`payment-method-${method.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md bg-gradient-to-br ${gradients[method.id]}`}>
                                <IconComponent className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <p className={`font-medium text-sm ${isSelected ? "text-blue-700" : "text-gray-900"}`}>
                                  {method.name}
                                </p>
                                <p className="text-xs text-gray-500">{method.description}</p>
                              </div>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              isSelected 
                                ? "border-blue-500 bg-blue-500" 
                                : "border-gray-300"
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Payment Details Based on Selected Method */}
                  {selectedPaymentMethod === "kompas" && (
                    <div 
                      className="relative overflow-hidden rounded-2xl p-4 space-y-3"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(255,255,255,0.5)',
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/10 pointer-events-none" />
                      <div className="relative flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                          <ExternalLink className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Payment Link</p>
                          <p className="text-xs text-gray-500">Pembayaran aman via link</p>
                        </div>
                      </div>
                      <p className="relative text-sm text-gray-600">
                        Klik tombol di bawah untuk melanjutkan ke halaman pembayaran yang aman.
                      </p>
                      <a 
                        href="https://pay.kompas.id/pay" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="relative inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                        data-testid="link-kompas-pay"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Buka Halaman Pembayaran
                      </a>
                    </div>
                  )}

                  {selectedPaymentMethod === "qris" && (
                    <div 
                      className="relative overflow-hidden rounded-2xl p-4 space-y-4"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(255,255,255,0.6)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg">
                          <QrCode className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">QRIS Payment</p>
                          <p className="text-xs text-gray-500">Scan dengan e-wallet atau m-banking</p>
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <div 
                          className="w-40 h-40 rounded-2xl flex items-center justify-center"
                          style={{
                            background: 'white',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.06), inset 0 0 0 1px rgba(0,0,0,0.05)',
                          }}
                        >
                          <div className="text-center">
                            <QrCode className="w-24 h-24 text-gray-400 mx-auto" />
                            <p className="text-xs text-gray-400 mt-1 font-medium">QRIS Demo</p>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 text-center">
                        Scan kode QR di atas dengan aplikasi favorit Anda
                      </p>
                    </div>
                  )}

                  {selectedPaymentMethod === "bank" && (
                    <div 
                      className="relative overflow-hidden rounded-2xl p-4 space-y-4"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(255,255,255,0.6)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-lg">
                          <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Transfer Bank</p>
                          <p className="text-xs text-gray-500">Pilih bank tujuan transfer</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {bankOptions.map((bank) => (
                          <div 
                            key={bank.id}
                            className={`cursor-pointer transition-all rounded-xl p-3 text-center ${
                              selectedBank === bank.id 
                                ? "ring-2 ring-blue-500 bg-blue-50" 
                                : "bg-white/60 hover:bg-white"
                            }`}
                            style={{
                              boxShadow: selectedBank === bank.id 
                                ? '0 4px 12px rgba(59,130,246,0.15)' 
                                : '0 2px 8px rgba(0,0,0,0.04)',
                            }}
                            onClick={() => setSelectedBank(bank.id)}
                            data-testid={`bank-option-${bank.id}`}
                          >
                            <Building2 className={`w-6 h-6 mx-auto mb-1 ${
                              selectedBank === bank.id ? "text-blue-600" : "text-gray-400"
                            }`} />
                            <p className={`text-xs font-medium ${
                              selectedBank === bank.id ? "text-blue-700" : "text-gray-600"
                            }`}>{bank.name}</p>
                          </div>
                        ))}
                      </div>
                      {selectedBank && (
                        <div 
                          className="rounded-xl p-4 space-y-3"
                          style={{
                            background: 'white',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.06), inset 0 0 0 1px rgba(0,0,0,0.05)',
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Nomor Rekening</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-bold text-gray-900">
                                {bankOptions.find(b => b.id === selectedBank)?.accountNumber}
                              </span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 rounded-lg hover:bg-gray-100"
                                onClick={() => copyToClipboard(bankOptions.find(b => b.id === selectedBank)?.accountNumber || "")}
                                data-testid="button-copy-bank"
                              >
                                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Atas Nama</span>
                            <span className="text-sm font-medium text-gray-700">{bankOptions.find(b => b.id === selectedBank)?.accountName}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedPaymentMethod === "va" && (
                    <div 
                      className="relative overflow-hidden rounded-2xl p-4 space-y-4"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(255,255,255,0.6)',
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/10 pointer-events-none" />
                      <div className="relative flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                          <Smartphone className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Virtual Account</p>
                          <p className="text-xs text-gray-500">Transfer via nomor VA</p>
                        </div>
                      </div>
                      <div 
                        className="relative rounded-xl p-4"
                        style={{
                          background: 'white',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.06), inset 0 0 0 1px rgba(0,0,0,0.05)',
                        }}
                      >
                        <p className="text-xs text-gray-500 mb-2">Nomor Virtual Account</p>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xl font-bold tracking-wider text-gray-900" data-testid="text-va-number">
                            {getVANumber()}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 rounded-lg hover:bg-gray-100"
                            onClick={() => copyToClipboard(getVANumber())}
                            data-testid="button-copy-va"
                          >
                            {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-gray-400" />}
                          </Button>
                        </div>
                      </div>
                      <p className="relative text-xs text-gray-500">
                        Berlaku hingga 24 jam. Transfer sesuai nominal untuk verifikasi otomatis.
                      </p>
                    </div>
                  )}

                  {selectedPaymentMethod === "crypto" && (
                    <div 
                      className="relative overflow-hidden rounded-2xl p-4 space-y-4"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(255,255,255,0.6)',
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-yellow-500/10 pointer-events-none" />
                      <div className="relative flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center shadow-lg">
                          <Bitcoin className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Cryptocurrency</p>
                          <p className="text-xs text-gray-500">Bayar dengan crypto</p>
                        </div>
                      </div>
                      <div className="relative grid grid-cols-3 gap-2">
                        {cryptoCoins.map((coin) => {
                          const CoinIcon = coin.icon;
                          return (
                            <div 
                              key={coin.id}
                              className={`cursor-pointer transition-all rounded-xl p-3 text-center ${
                                selectedCrypto === coin.id 
                                  ? "ring-2 ring-amber-500 bg-amber-50" 
                                  : "bg-white/60 hover:bg-white"
                              }`}
                              style={{
                                boxShadow: selectedCrypto === coin.id 
                                  ? '0 4px 12px rgba(245,158,11,0.15)' 
                                  : '0 2px 8px rgba(0,0,0,0.04)',
                              }}
                              onClick={() => setSelectedCrypto(coin.id)}
                              data-testid={`crypto-option-${coin.id}`}
                            >
                              <CoinIcon className="w-7 h-7 mx-auto mb-1" style={{ color: coin.color }} />
                              <p className={`text-xs font-bold ${
                                selectedCrypto === coin.id ? "text-amber-700" : "text-gray-600"
                              }`}>{coin.symbol}</p>
                            </div>
                          );
                        })}
                      </div>
                      {selectedCrypto && (() => {
                        const coin = cryptoCoins.find(c => c.id === selectedCrypto);
                        const CoinIcon = coin?.icon || SiBitcoin;
                        return (
                          <div 
                            className="relative rounded-xl p-4 space-y-3"
                            style={{
                              background: 'white',
                              boxShadow: '0 4px 16px rgba(0,0,0,0.06), inset 0 0 0 1px rgba(0,0,0,0.05)',
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <CoinIcon className="w-5 h-5" style={{ color: coin?.color }} />
                              <span className="font-semibold text-gray-900">{coin?.name}</span>
                              <span 
                                className="text-xs font-medium px-2 py-0.5 rounded-full"
                                style={{ background: `${coin?.color}15`, color: coin?.color }}
                              >
                                {coin?.network}
                              </span>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Alamat Wallet</p>
                              <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                                <span className="font-mono text-xs break-all flex-1 text-gray-700" data-testid="text-crypto-address">
                                  {coin?.address}
                                </span>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="shrink-0 h-7 w-7 rounded-lg hover:bg-gray-200"
                                  onClick={() => copyToClipboard(coin?.address || "")}
                                  data-testid="button-copy-crypto"
                                >
                                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500">
                              Kirim hanya {coin?.symbol} ke alamat di atas. Aset lain dapat hilang.
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Processing State */}
                  {isProcessing && (
                    <div 
                      className="relative overflow-hidden rounded-2xl p-6"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(255,255,255,0.6)',
                      }}
                    >
                      <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                            <Loader2 className="w-8 h-8 animate-spin text-white" />
                          </div>
                          <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-blue-500" />
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-gray-900">Memproses Pembayaran...</p>
                          <p className="text-sm text-gray-500">Mohon tunggu sebentar</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div 
                className="p-4 space-y-2"
                style={{
                  background: 'linear-gradient(to top, rgba(255,255,255,0.95), rgba(255,255,255,0.8))',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  borderTop: '1px solid rgba(0,0,0,0.05)',
                }}
              >
                {selectedPaymentMethod === "kompas" && (
                  <Button 
                    asChild
                    className="w-full rounded-xl h-11 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg" 
                    data-testid="button-open-kompas"
                  >
                    <a 
                      href="https://pay.kompas.id/pay" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Buka Payment Link
                    </a>
                  </Button>
                )}
                <Button 
                  className="w-full rounded-xl h-11 shadow-lg" 
                  onClick={handlePayment}
                  disabled={isProcessing}
                  data-testid="button-pay"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      {selectedPaymentMethod === "kompas" ? "Konfirmasi Pembayaran" : "Bayar Sekarang"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Success Step */}
          {step === "success" && selectedProduct && (
            <div className="h-full flex flex-col items-center justify-center p-6 space-y-6">
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">Pembayaran Berhasil!</h2>
                <p className="text-sm text-muted-foreground">
                  Transaksi Anda telah selesai
                </p>
              </div>
              <Card className="w-full" data-testid="card-order-summary">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Order ID</span>
                    <span className="font-mono text-xs" data-testid="text-order-id">{orderId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Paket</span>
                    <span className="font-medium" data-testid="text-order-package">{selectedProduct.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Koin Diterima</span>
                    <span className="font-medium text-primary" data-testid="text-coins-received">
                      +{selectedProduct.coins + selectedProduct.bonus} koin
                    </span>
                  </div>
                  <div className="border-t pt-3 flex items-center justify-between">
                    <span className="font-semibold">Saldo Koin</span>
                    <Badge variant="default" className="text-sm gap-1" data-testid="badge-final-balance">
                      <Coins className="w-3 h-3" />
                      {userCoins} koin
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              <Button className="w-full" onClick={handleBackToChat} data-testid="button-back-success">
                <ArrowRight className="w-4 h-4 mr-2" />
                Kembali ke Chat
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
