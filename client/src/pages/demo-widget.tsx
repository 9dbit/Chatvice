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
  Sparkles
} from "lucide-react";

type Step = "login" | "chat" | "topup" | "payment" | "success";

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
                    <p className="text-xs text-muted-foreground">{selectedProduct.name}</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 p-4 space-y-4">
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Paket</span>
                      <span className="font-medium">{selectedProduct.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Koin</span>
                      <span className="font-medium">{selectedProduct.coins} + {selectedProduct.bonus} bonus</span>
                    </div>
                    <div className="border-t pt-3 flex items-center justify-between">
                      <span className="font-semibold">Total</span>
                      <span className="font-bold text-lg text-primary">{formatRupiah(selectedProduct.price)}</span>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <Label>Metode Pembayaran</Label>
                  <Card className="border-primary bg-primary/5">
                    <CardContent className="p-4 flex items-center gap-3">
                      <QrCode className="w-8 h-8 text-primary" />
                      <div>
                        <p className="font-medium">QRIS</p>
                        <p className="text-xs text-muted-foreground">Scan QR untuk bayar</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {isProcessing && (
                  <Card className="bg-muted/50">
                    <CardContent className="p-6 flex flex-col items-center gap-3">
                      <div className="w-32 h-32 bg-white rounded-lg flex items-center justify-center border">
                        <div className="text-center">
                          <QrCode className="w-16 h-16 text-muted-foreground mx-auto mb-2" />
                          <p className="text-xs text-muted-foreground">QR Code Demo</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-primary">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Menunggu pembayaran...</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
              <div className="p-4 border-t">
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
                      Bayar Sekarang
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
