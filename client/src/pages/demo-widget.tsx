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
  { id: "kompas", name: "Kompas Pay", description: "Bayar via Kompas Pay", icon: Wallet },
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

                  {/* Payment Method Selection */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Pilih Metode Pembayaran</Label>
                    <div className="grid gap-2">
                      {paymentMethods.map((method) => {
                        const IconComponent = method.icon;
                        return (
                          <Card 
                            key={method.id}
                            className={`cursor-pointer transition-all hover-elevate ${
                              selectedPaymentMethod === method.id 
                                ? "border-primary bg-primary/5" 
                                : "hover:border-muted-foreground/30"
                            }`}
                            onClick={() => setSelectedPaymentMethod(method.id)}
                            data-testid={`payment-method-${method.id}`}
                          >
                            <CardContent className="p-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                  selectedPaymentMethod === method.id ? "bg-primary/10" : "bg-muted"
                                }`}>
                                  <IconComponent className={`w-5 h-5 ${
                                    selectedPaymentMethod === method.id ? "text-primary" : "text-muted-foreground"
                                  }`} />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{method.name}</p>
                                  <p className="text-xs text-muted-foreground">{method.description}</p>
                                </div>
                              </div>
                              <ChevronRight className={`w-4 h-4 ${
                                selectedPaymentMethod === method.id ? "text-primary" : "text-muted-foreground"
                              }`} />
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>

                  {/* Payment Details Based on Selected Method */}
                  {selectedPaymentMethod === "kompas" && (
                    <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Wallet className="w-5 h-5 text-blue-600" />
                          <span className="font-semibold">Kompas Pay</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Anda akan diarahkan ke halaman pembayaran Kompas Pay untuk menyelesaikan transaksi.
                        </p>
                        <a 
                          href="https://pay.kompas.id/pay" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
                          data-testid="link-kompas-pay"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Buka Kompas Pay
                        </a>
                      </CardContent>
                    </Card>
                  )}

                  {selectedPaymentMethod === "qris" && (
                    <Card className="bg-muted/50">
                      <CardContent className="p-4 flex flex-col items-center gap-3">
                        <div className="w-36 h-36 bg-white rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                          <div className="text-center">
                            <QrCode className="w-20 h-20 text-muted-foreground mx-auto" />
                            <p className="text-xs text-muted-foreground mt-1">QRIS Demo</p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground text-center">
                          Scan kode QR dengan aplikasi e-wallet atau mobile banking Anda
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {selectedPaymentMethod === "bank" && (
                    <div className="space-y-2">
                      <Label className="text-sm">Pilih Bank Tujuan</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {bankOptions.map((bank) => (
                          <Card 
                            key={bank.id}
                            className={`cursor-pointer transition-all hover-elevate ${
                              selectedBank === bank.id 
                                ? "border-primary bg-primary/5" 
                                : "hover:border-muted-foreground/30"
                            }`}
                            onClick={() => setSelectedBank(bank.id)}
                            data-testid={`bank-option-${bank.id}`}
                          >
                            <CardContent className="p-3 text-center">
                              <Building2 className={`w-6 h-6 mx-auto mb-1 ${
                                selectedBank === bank.id ? "text-primary" : "text-muted-foreground"
                              }`} />
                              <p className="text-xs font-medium">{bank.name}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      {selectedBank && (
                        <Card className="mt-3">
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">No. Rekening</span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-medium">
                                  {bankOptions.find(b => b.id === selectedBank)?.accountNumber}
                                </span>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6"
                                  onClick={() => copyToClipboard(bankOptions.find(b => b.id === selectedBank)?.accountNumber || "")}
                                  data-testid="button-copy-bank"
                                >
                                  {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                </Button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Atas Nama</span>
                              <span className="text-sm">{bankOptions.find(b => b.id === selectedBank)?.accountName}</span>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}

                  {selectedPaymentMethod === "va" && (
                    <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-5 h-5 text-green-600" />
                          <span className="font-semibold">Virtual Account</span>
                        </div>
                        <div className="bg-background rounded-lg p-3 border">
                          <p className="text-xs text-muted-foreground mb-1">Nomor Virtual Account</p>
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-lg font-bold tracking-wider" data-testid="text-va-number">
                              {getVANumber()}
                            </span>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => copyToClipboard(getVANumber())}
                              data-testid="button-copy-va"
                            >
                              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Berlaku hingga 24 jam. Transfer sesuai nominal untuk verifikasi otomatis.
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {selectedPaymentMethod === "crypto" && (
                    <div className="space-y-3">
                      <Label className="text-sm">Pilih Cryptocurrency</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {cryptoCoins.map((coin) => {
                          const CoinIcon = coin.icon;
                          return (
                            <Card 
                              key={coin.id}
                              className={`cursor-pointer transition-all hover-elevate ${
                                selectedCrypto === coin.id 
                                  ? "border-primary bg-primary/5" 
                                  : "hover:border-muted-foreground/30"
                              }`}
                              onClick={() => setSelectedCrypto(coin.id)}
                              data-testid={`crypto-option-${coin.id}`}
                            >
                              <CardContent className="p-2 text-center">
                                <CoinIcon className="w-6 h-6 mx-auto mb-1" style={{ color: coin.color }} />
                                <p className="text-xs font-medium">{coin.symbol}</p>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                      {selectedCrypto && (() => {
                        const coin = cryptoCoins.find(c => c.id === selectedCrypto);
                        const CoinIcon = coin?.icon || SiBitcoin;
                        return (
                          <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
                            <CardContent className="p-4 space-y-3">
                              <div className="flex items-center gap-2">
                                <CoinIcon className="w-5 h-5" style={{ color: coin?.color }} />
                                <span className="font-semibold">{coin?.name}</span>
                                <Badge variant="secondary" className="text-xs">{coin?.network}</Badge>
                              </div>
                              <div className="bg-background rounded-lg p-3 border">
                                <p className="text-xs text-muted-foreground mb-1">Alamat Wallet</p>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs break-all flex-1" data-testid="text-crypto-address">
                                    {coin?.address}
                                  </span>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="shrink-0"
                                    onClick={() => copyToClipboard(coin?.address || "")}
                                    data-testid="button-copy-crypto"
                                  >
                                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                  </Button>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Kirim hanya {coin?.symbol} ke alamat di atas. Pengiriman aset lain dapat menyebabkan kehilangan dana.
                              </p>
                            </CardContent>
                          </Card>
                        );
                      })()}
                    </div>
                  )}

                  {/* Processing State */}
                  {isProcessing && (
                    <Card className="bg-primary/5 border-primary/30">
                      <CardContent className="p-4 flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <div className="text-center">
                          <p className="font-medium">Memproses Pembayaran...</p>
                          <p className="text-sm text-muted-foreground">Mohon tunggu sebentar</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
              <div className="p-4 border-t space-y-2">
                {selectedPaymentMethod === "kompas" && (
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700" 
                    onClick={() => window.open("https://pay.kompas.id/pay", "_blank")}
                    data-testid="button-open-kompas"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Buka Kompas Pay
                  </Button>
                )}
                <Button 
                  className="w-full" 
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
