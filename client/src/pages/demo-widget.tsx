import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Coins, 
  CheckCircle2, 
  Send, 
  Bot, 
  QrCode,
  Loader2,
  ExternalLink,
  Sparkles,
  Building2,
  Smartphone,
  Bitcoin,
  Copy,
  Check,
  X,
  Minimize2
} from "lucide-react";
import { SiBitcoin, SiEthereum, SiTether, SiSolana, SiBinance, SiDogecoin } from "react-icons/si";

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
  actions?: { label: string; action: string; variant?: "default" | "destructive" }[];
  isTyping?: boolean;
  component?: "packages" | "auth" | "payment" | "success";
  componentData?: any;
}

interface Product {
  id: string;
  name: string;
  price: number;
}

const products: Product[] = [
  { id: "1", name: "Rp 25.000", price: 25000 },
  { id: "2", name: "Rp 50.000", price: 50000 },
  { id: "3", name: "Rp 100.000", price: 100000 },
  { id: "4", name: "Rp 200.000", price: 200000 },
  { id: "5", name: "Rp 500.000", price: 500000 },
];

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

const PRIMARY_COLOR = "#6b5dfc";

export default function DemoWidgetPage() {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
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
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getVANumber = () => {
    const bankCode = selectedBank.toUpperCase();
    return `${bankCode}${Date.now().toString().slice(-10)}`;
  };

  const addMessage = (msg: Omit<Message, "id" | "timestamp">) => {
    const newMessage: Message = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage.id;
  };

  const addTypingThenMessage = (msg: Omit<Message, "id" | "timestamp">, delay: number = 1000) => {
    const typingId = addMessage({ from: "bot", content: "", isTyping: true });
    setTimeout(() => {
      setMessages(prev => prev.filter(m => m.id !== typingId));
      addMessage(msg);
    }, delay);
  };

  const startChat = () => {
    setIsOpen(true);
    setMessages([]);
    setTimeout(() => {
      addMessage({
        from: "bot",
        content: "Halo kak! Selamat datang di Chatvice.\n\nAda yang bisa saya bantu hari ini?",
        actions: [
          { label: "Top Up Koin", action: "topup" },
          { label: "Bantuan", action: "help" },
        ],
      });
    }, 300);
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    
    addMessage({ from: "user", content: inputMessage });
    const msg = inputMessage.toLowerCase();
    setInputMessage("");

    if (msg.includes("topup") || msg.includes("top up") || msg.includes("koin") || msg.includes("beli") || msg.includes("isi")) {
      handleAction("topup");
    } else {
      addTypingThenMessage({
        from: "bot",
        content: "Maaf kak, saya belum mengerti. Apakah kakak ingin melakukan top up koin?",
        actions: [
          { label: "Ya, Top Up", action: "topup" },
          { label: "Tidak", action: "cancel_chat" },
        ],
      });
    }
  };

  const handleAction = (action: string) => {
    switch (action) {
      case "topup":
        addTypingThenMessage({
          from: "bot",
          content: "Baik kak! Silakan pilih nominal top up yang diinginkan:",
          component: "packages",
        });
        break;

      case "help":
        addTypingThenMessage({
          from: "bot",
          content: "Saya bisa membantu kakak untuk:\n\n• Top up koin\n• Informasi pembayaran\n• Bantuan teknis\n\nApa yang kakak butuhkan?",
          actions: [
            { label: "Top Up Koin", action: "topup" },
          ],
        });
        break;

      case "cancel_chat":
        addTypingThenMessage({
          from: "bot",
          content: "Baik kak, jika ada yang bisa saya bantu silakan tanyakan ya!",
          actions: [
            { label: "Top Up Koin", action: "topup" },
          ],
        });
        break;

      case "cancel_package":
        setSelectedProduct(null);
        addTypingThenMessage({
          from: "bot",
          content: "Baik kak, pesanan dibatalkan.\n\nApakah kakak ingin memilih nominal lain?",
          component: "packages",
        });
        break;

      case "confirm_package":
        addTypingThenMessage({
          from: "bot",
          content: "Untuk melanjutkan pembayaran, kakak perlu login atau daftar terlebih dahulu.\n\nSilakan masukkan email dan password:",
          component: "auth",
        });
        break;

      case "submit_auth":
        if (authEmail && authPassword) {
          setIsProcessing(true);
          const newCustomerId = `CUS-${Date.now().toString(36).toUpperCase()}`;
          const newOrderId = `CVT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
          
          setTimeout(() => {
            setCustomerId(newCustomerId);
            setOrderId(newOrderId);
            setIsProcessing(false);
            
            addTypingThenMessage({
              from: "bot",
              content: `Login berhasil!\n\nCustomer ID: ${newCustomerId}\nOrder ID: ${newOrderId}\n\nJika setuju, akan saya proses ke pembayaran kak.`,
              actions: [
                { label: "Cancel", action: "cancel_auth", variant: "destructive" },
                { label: "Setuju", action: "confirm_auth" },
              ],
            });
          }, 1500);
        }
        break;

      case "cancel_auth":
        setCustomerId("");
        setOrderId("");
        addTypingThenMessage({
          from: "bot",
          content: "Baik kak, proses dibatalkan.\n\nApakah kakak ingin mencoba lagi?",
          actions: [
            { label: "Ya, Coba Lagi", action: "confirm_package" },
            { label: "Pilih Nominal Lain", action: "topup" },
          ],
        });
        break;

      case "confirm_auth":
        addTypingThenMessage({
          from: "bot",
          content: `Silakan pilih metode pembayaran untuk top up ${selectedProduct?.name}:`,
          component: "payment",
        });
        break;

      case "process_payment":
        setIsProcessing(true);
        addMessage({
          from: "bot",
          content: "Memproses pembayaran...",
          isTyping: true,
        });

        setTimeout(() => {
          setMessages(prev => prev.filter(m => !m.isTyping));
          setIsProcessing(false);
          
          addMessage({
            from: "bot",
            content: "Pembayaran berhasil!",
            component: "success",
            componentData: {
              orderId,
              customerId,
              product: selectedProduct,
            },
          });
        }, 2000);
        break;

      case "new_transaction":
        setSelectedProduct(null);
        setOrderId("");
        setCustomerId("");
        setAuthEmail("");
        setAuthPassword("");
        setMessages([]);
        startChat();
        break;
    }
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    addMessage({ from: "user", content: `Top up ${product.name}` });
    addTypingThenMessage({
      from: "bot",
      content: `Kakak memilih top up ${product.name}.\n\nJika setuju, akan saya proses ke tahap selanjutnya kak.`,
      actions: [
        { label: "Cancel", action: "cancel_package", variant: "destructive" },
        { label: "Setuju", action: "confirm_package" },
      ],
    });
  };

  const PackagesComponent = () => (
    <div className="grid grid-cols-2 gap-2 mt-3">
      {products.map((product) => (
        <button
          key={product.id}
          onClick={() => handleSelectProduct(product)}
          className="p-3 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: 'rgba(107, 93, 252, 0.1)',
            border: '1px solid rgba(107, 93, 252, 0.3)',
          }}
          data-testid={`package-${product.id}`}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Coins className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm">{product.name}</span>
          </div>
        </button>
      ))}
    </div>
  );

  const AuthComponent = () => (
    <div className="mt-3 space-y-3">
      <Input
        type="email"
        placeholder="Email"
        value={authEmail}
        onChange={(e) => setAuthEmail(e.target.value)}
        className="h-10 text-sm"
        data-testid="input-auth-email"
      />
      <Input
        type="password"
        placeholder="Password"
        value={authPassword}
        onChange={(e) => setAuthPassword(e.target.value)}
        className="h-10 text-sm"
        data-testid="input-auth-password"
      />
      <Button
        className="w-full h-10 text-white"
        style={{ backgroundColor: PRIMARY_COLOR }}
        onClick={() => handleAction("submit_auth")}
        disabled={!authEmail || !authPassword || isProcessing}
        data-testid="button-auth-submit"
      >
        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Masuk / Daftar"}
      </Button>
    </div>
  );

  const PaymentComponent = () => (
    <div className="mt-3 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {paymentMethods.map((method) => {
          const IconComponent = method.icon;
          const isSelected = selectedPaymentMethod === method.id;
          return (
            <button
              key={method.id}
              onClick={() => setSelectedPaymentMethod(method.id)}
              className={`p-2.5 rounded-xl text-left transition-all ${isSelected ? 'ring-2 ring-violet-500' : ''}`}
              style={{
                background: isSelected ? 'rgba(107, 93, 252, 0.15)' : 'rgba(0,0,0,0.03)',
              }}
              data-testid={`payment-method-${method.id}`}
            >
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${method.gradient} flex items-center justify-center mb-1.5`}>
                <IconComponent className="w-4 h-4 text-white" />
              </div>
              <p className="font-semibold text-xs">{method.name}</p>
              <p className="text-[10px] text-muted-foreground">{method.description}</p>
            </button>
          );
        })}
      </div>

      {selectedPaymentMethod === "kompas" && (
        <div className="p-3 rounded-xl bg-muted/50">
          <p className="text-xs text-muted-foreground mb-2">Klik tombol di bawah untuk membuka halaman pembayaran:</p>
          <a href="https://pay.kompas.id/pay" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm font-medium" style={{ color: PRIMARY_COLOR }} data-testid="link-kompas-pay">
            <ExternalLink className="w-3 h-3" />Buka Payment Link
          </a>
        </div>
      )}

      {selectedPaymentMethod === "qris" && (
        <div className="p-3 rounded-xl bg-muted/50 text-center">
          <div className="w-32 h-32 mx-auto rounded-xl bg-white flex items-center justify-center mb-2 border">
            <QrCode className="w-20 h-20 text-gray-300" />
          </div>
          <p className="text-xs text-muted-foreground">Scan dengan e-wallet</p>
        </div>
      )}

      {selectedPaymentMethod === "bank" && (
        <div className="space-y-2">
          {bankOptions.map((bank) => (
            <button
              key={bank.id}
              onClick={() => setSelectedBank(bank.id)}
              className={`w-full p-2.5 rounded-xl text-left ${selectedBank === bank.id ? 'ring-2 ring-violet-500' : ''}`}
              style={{
                background: selectedBank === bank.id ? 'rgba(107, 93, 252, 0.1)' : 'rgba(0,0,0,0.03)',
              }}
              data-testid={`bank-option-${bank.id}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded flex items-center justify-center text-white font-bold text-[10px]" style={{ background: bank.color }}>{bank.name}</div>
                  <div>
                    <p className="font-mono text-sm">{bank.accountNumber}</p>
                    <p className="text-[10px] text-muted-foreground">{bank.accountName}</p>
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); copyToClipboard(bank.accountNumber); }} className="p-1.5 rounded hover:bg-muted" data-testid={`button-copy-bank-${bank.id}`}>
                  {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                </button>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedPaymentMethod === "va" && (
        <div className="p-3 rounded-xl bg-muted/50">
          <p className="text-xs text-muted-foreground mb-1">Virtual Account Number:</p>
          <div className="flex items-center justify-between">
            <span className="font-mono font-semibold" data-testid="text-va-number">{getVANumber()}</span>
            <button onClick={() => copyToClipboard(getVANumber())} className="p-1.5 rounded hover:bg-muted" data-testid="button-copy-va">
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
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
                <button 
                  key={coin.id}
                  onClick={() => setSelectedCrypto(coin.id)}
                  className={`p-2 rounded-lg text-center ${selectedCrypto === coin.id ? 'ring-2 ring-violet-500' : ''}`}
                  style={{
                    background: selectedCrypto === coin.id ? 'rgba(107, 93, 252, 0.1)' : 'rgba(0,0,0,0.03)',
                  }}
                  data-testid={`crypto-option-${coin.id}`}
                >
                  <CoinIcon className="w-5 h-5 mx-auto" style={{ color: coin.color }} />
                  <p className="text-[10px] font-semibold mt-0.5">{coin.symbol}</p>
                </button>
              );
            })}
          </div>
          {selectedCrypto && (() => {
            const coin = cryptoCoins.find(c => c.id === selectedCrypto);
            return (
              <div className="p-3 rounded-xl bg-muted/50">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="font-semibold text-sm">{coin?.name}</span>
                  <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">{coin?.network}</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-background rounded-lg border">
                  <span className="font-mono text-[10px] break-all flex-1" data-testid="text-crypto-address">{coin?.address}</span>
                  <button onClick={() => copyToClipboard(coin?.address || "")} className="p-1 rounded hover:bg-muted shrink-0" data-testid="button-copy-crypto">
                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      <Button
        className="w-full h-10 text-white"
        style={{ backgroundColor: '#10b981' }}
        onClick={() => handleAction("process_payment")}
        disabled={isProcessing}
        data-testid="button-pay"
      >
        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : `Bayar ${selectedProduct?.name}`}
      </Button>
    </div>
  );

  const SuccessComponent = ({ data }: { data: any }) => (
    <div className="mt-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-semibold text-emerald-700 dark:text-emerald-300">Transaksi Berhasil!</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">Top up {data.product?.name}</p>
        </div>
      </div>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Order ID</span>
          <span className="font-mono text-xs" data-testid="text-order-id">{data.orderId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Customer ID</span>
          <span className="font-mono text-xs" data-testid="text-customer-id">{data.customerId}</span>
        </div>
      </div>
      <Button
        className="w-full h-9 mt-3 text-white"
        style={{ backgroundColor: PRIMARY_COLOR }}
        onClick={() => handleAction("new_transaction")}
        data-testid="button-new-transaction"
      >
        Transaksi Baru
      </Button>
    </div>
  );

  const renderComponent = (component: string, data?: any) => {
    switch (component) {
      case "packages": return <PackagesComponent />;
      case "auth": return <AuthComponent />;
      case "payment": return <PaymentComponent />;
      case "success": return <SuccessComponent data={data} />;
      default: return null;
    }
  };

  const widgetContent = (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Header - Same as internal Chatvice */}
      <div className="p-4 flex items-center justify-between" style={{ backgroundColor: PRIMARY_COLOR }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="text-white">
            <p className="font-medium text-sm">Chatvice Demo</p>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs opacity-80">Online</span>
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="text-white hover:bg-white/20" onClick={() => setIsOpen(false)} data-testid="button-minimize-widget">
            <Minimize2 className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" className="text-white hover:bg-white/20" onClick={() => setIsOpen(false)} data-testid="button-close-widget">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id}>
            <div className={`flex gap-2 ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
              {msg.from !== "user" && (
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${PRIMARY_COLOR}20` }}>
                  <Bot className="w-3.5 h-3.5" style={{ color: PRIMARY_COLOR }} />
                </div>
              )}
              <div
                className={`max-w-[80%] p-3 text-sm ${
                  msg.from === "user"
                    ? "rounded-2xl rounded-br-sm text-white"
                    : "bg-muted rounded-2xl rounded-bl-sm"
                }`}
                style={msg.from === "user" ? { backgroundColor: PRIMARY_COLOR } : undefined}
              >
                {msg.isTyping ? (
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.actions && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {msg.actions.map((action, idx) => (
                          <Button
                            key={idx}
                            size="sm"
                            variant={action.variant === "destructive" ? "outline" : "default"}
                            className={`h-7 text-xs ${action.variant === "destructive" ? "border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground" : "text-white"}`}
                            style={action.variant !== "destructive" ? { backgroundColor: PRIMARY_COLOR } : undefined}
                            onClick={() => handleAction(action.action)}
                            data-testid={`action-${action.action}`}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    )}
                    {msg.component && renderComponent(msg.component, msg.componentData)}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Ketik pesan..."
            className="flex-1 h-10 text-sm"
            data-testid="input-chat-message"
          />
          <Button size="icon" className="h-10 w-10 text-white" style={{ backgroundColor: PRIMARY_COLOR }} onClick={handleSendMessage} data-testid="button-send-message">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  const FloatingButton = () => (
    <button
      onClick={startChat}
      className="shadow-lg flex items-center justify-center transition-transform hover:scale-105"
      style={{
        width: 60,
        height: 60,
        backgroundColor: PRIMARY_COLOR,
        borderRadius: '50%',
      }}
      data-testid="button-open-widget"
    >
      <Sparkles className="w-7 h-7 text-white" />
      <span className="absolute bottom-1 right-1 w-3 h-3 rounded-full border-2 border-white bg-emerald-400" />
    </button>
  );

  if (isMobile) {
    if (!isOpen) {
      return (
        <div className="fixed bottom-5 right-5 z-50">
          <FloatingButton />
        </div>
      );
    }
    return <div className="fixed inset-0 z-50">{widgetContent}</div>;
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800">
      {!isOpen ? (
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Chatvice Demo Widget</h1>
          <p className="text-muted-foreground mb-6">Klik tombol di bawah untuk memulai demo</p>
          <div className="inline-block relative">
            <FloatingButton />
          </div>
        </div>
      ) : (
        <div 
          className="w-[380px] h-[600px] rounded-2xl overflow-hidden shadow-2xl border"
          style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.15)' }}
        >
          {widgetContent}
        </div>
      )}
    </div>
  );
}
