import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";
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
  Minimize2,
  ChevronDown,
  ChevronRight
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
  { id: "va", name: "Virtual Account", description: "VA otomatis", icon: Smartphone, gradient: "from-purple-500 to-violet-600" },
  { id: "crypto", name: "Crypto", description: "BTC, ETH, USDT", icon: Bitcoin, gradient: "from-orange-400 to-amber-600" },
];

// Stacking card colors for payment methods
const stackingCardColors: Record<PaymentMethod, { bg: string; border: string }> = {
  kompas: { bg: "bg-orange-400", border: "border-orange-500" },
  qris: { bg: "bg-violet-500", border: "border-violet-600" },
  bank: { bg: "bg-amber-500", border: "border-amber-600" },
  va: { bg: "bg-emerald-500", border: "border-emerald-600" },
  crypto: { bg: "bg-rose-500", border: "border-rose-600" },
};

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
  coins: number;
}

const products: Product[] = [
  { id: "1", name: "Rp 25.000", price: 25000, coins: 25 },
  { id: "2", name: "Rp 50.000", price: 50000, coins: 50 },
  { id: "3", name: "Rp 100.000", price: 100000, coins: 100 },
  { id: "4", name: "Rp 200.000", price: 200000, coins: 200 },
  { id: "5", name: "Rp 500.000", price: 500000, coins: 500 },
  { id: "6", name: "Rp 1.000.000", price: 1000000, coins: 1000 },
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
  const [paymentCardsExpanded, setPaymentCardsExpanded] = useState(false);
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

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    const userMsg = inputMessage;
    addMessage({ from: "user", content: userMsg });
    const msg = userMsg.toLowerCase();
    setInputMessage("");

    // Check for top up intent first
    if (msg.includes("topup") || msg.includes("top up") || msg.includes("koin") || msg.includes("beli") || msg.includes("isi")) {
      handleAction("topup");
      return;
    }

    // For any other message, use AI with Chatvice Guide knowledge base
    const typingId = addMessage({ from: "bot", content: "", isTyping: true });
    
    try {
      // Build transaction context if available
      let transactionContext = "";
      if (selectedProduct) {
        // Coin value is 1:1 with nominal (Rp 25.000 = 25.000 koin)
        transactionContext = `\n\nKONTEKS TRANSAKSI SAAT INI:
- Produk: ${selectedProduct.name}
- Harga: ${formatRupiah(selectedProduct.price)}
- Koin: ${selectedProduct.price.toLocaleString("id-ID")} koin (rasio 1:1 dengan nominal harga)`;
      }
      if (orderId) {
        transactionContext += `\n- Order ID: ${orderId}`;
      }
      if (customerId) {
        transactionContext += `\n- Customer ID: ${customerId}`;
      }

      // Build conversation history for context
      const history = messages
        .filter(m => !m.isTyping && m.content)
        .slice(-10)
        .map(m => ({ role: m.from === "user" ? "user" : "assistant", content: m.content }));

      const response = await fetch("/api/help/public-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userMsg + transactionContext,
          conversationHistory: history,
        }),
      });

      if (!response.ok) {
        throw new Error("API request failed");
      }

      const data = await response.json();
      setMessages(prev => prev.filter(m => m.id !== typingId));
      
      addMessage({
        from: "bot",
        content: data.answer || "Maaf, saya tidak bisa menjawab saat ini. Silakan coba lagi.",
        actions: selectedProduct ? undefined : [
          { label: "Top Up Koin", action: "topup" },
        ],
      });
    } catch {
      setMessages(prev => prev.filter(m => m.id !== typingId));
      addMessage({
        from: "bot",
        content: "Maaf kak, terjadi kesalahan. Apakah kakak ingin melakukan top up koin?",
        actions: [
          { label: "Ya, Top Up", action: "topup" },
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

      case "go_home":
        // Navigate to homepage (dummy for now - just close widget and show alert)
        setIsOpen(false);
        window.location.href = "/";
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
    <div className="flex flex-col gap-2 mt-3">
      {products.map((product, index) => {
        // Gradient colors for each card icon (like reference)
        const iconColors = [
          'linear-gradient(135deg, #CD7F32 0%, #B8860B 100%)', // Bronze/Gold
          'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', // Gold
          'linear-gradient(135deg, #FF69B4 0%, #FF1493 100%)', // Pink
          'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)', // Purple
          'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)', // Blue
          'linear-gradient(135deg, #10B981 0%, #059669 100%)', // Emerald
        ];
        
        return (
          <button
            key={product.id}
            onClick={() => handleSelectProduct(product)}
            className="p-4 rounded-xl text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.25), 0 1px 2px rgba(255, 255, 255, 0.05) inset',
            }}
            data-testid={`package-${product.id}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-zinc-400 mb-1">Top Up</p>
                <p className="font-bold text-white text-xl tracking-tight">{product.name}</p>
                <p className="text-sm text-zinc-400">{product.coins} Koin</p>
              </div>
              
              {/* Icon Circle */}
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center mr-3"
                style={{ 
                  background: iconColors[index] || iconColors[0],
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
                }}
              >
                <Coins className="w-7 h-7 text-white" />
              </div>
              
              {/* Arrow Indicator */}
              <div className="text-zinc-400">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );

  const AuthComponent = () => {
    const [localEmail, setLocalEmail] = useState(authEmail);
    const [localPassword, setLocalPassword] = useState(authPassword);
    
    const handleSubmit = () => {
      // Directly use local values for submit, update parent state
      setAuthEmail(localEmail);
      setAuthPassword(localPassword);
      
      // Process auth with local values directly
      if (localEmail && localPassword) {
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
    };
    
    return (
      <div className="mt-3 space-y-3">
        <Input
          type="email"
          placeholder="Email"
          value={localEmail}
          onChange={(e) => setLocalEmail(e.target.value)}
          className="h-10 text-sm"
          data-testid="input-auth-email"
        />
        <Input
          type="password"
          placeholder="Password"
          value={localPassword}
          onChange={(e) => setLocalPassword(e.target.value)}
          className="h-10 text-sm"
          data-testid="input-auth-password"
        />
        <Button
          className="w-full h-10 text-white"
          style={{ backgroundColor: PRIMARY_COLOR }}
          onClick={handleSubmit}
          disabled={!localEmail || !localPassword || isProcessing}
          data-testid="button-auth-submit"
        >
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Masuk / Daftar"}
        </Button>
      </div>
    );
  };

  const PaymentComponent = () => {
    const [sliderProgress, setSliderProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [paymentCompleted, setPaymentCompleted] = useState(false);
    const sliderRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef(0);
    
    const CARD_HEIGHT = 52;
    const EXPANDED_GAP = 6;

    const handleCardClick = (methodId: PaymentMethod) => {
      if (!paymentCardsExpanded) {
        setPaymentCardsExpanded(true);
      } else {
        setSelectedPaymentMethod(methodId);
        setTimeout(() => setPaymentCardsExpanded(false), 150);
      }
    };

    const containerHeight = paymentCardsExpanded 
      ? paymentMethods.length * (CARD_HEIGHT + EXPANDED_GAP) - EXPANDED_GAP
      : CARD_HEIGHT;

    // Swipe to pay handler - using ref for accurate progress check
    const handleSliderStart = () => {
      if (isProcessing || paymentCompleted) return;
      setIsDragging(true);
    };

    const handleSliderMove = (clientX: number) => {
      if (!sliderRef.current || isProcessing || paymentCompleted) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, (clientX - rect.left - 24) / (rect.width - 48)));
      progressRef.current = progress;
      setSliderProgress(progress);
    };

    const handleSliderEnd = () => {
      if (isProcessing || paymentCompleted) return;
      setIsDragging(false);
      
      if (progressRef.current > 0.85) {
        // Lock slider at 100% permanently - prevent double transaction
        setSliderProgress(1);
        progressRef.current = 1;
        setPaymentCompleted(true);
        handleAction("process_payment");
      } else {
        // Reset if not completed
        progressRef.current = 0;
        setSliderProgress(0);
      }
    };

    // Static QRIS SVG pattern
    const QRCodeDummy = () => (
      <svg viewBox="0 0 120 120" className="w-full h-full">
        <rect fill="white" width="120" height="120" />
        {/* Position patterns - top left */}
        <rect fill="black" x="10" y="10" width="25" height="25" />
        <rect fill="white" x="15" y="15" width="15" height="15" />
        <rect fill="black" x="18" y="18" width="9" height="9" />
        
        {/* Position patterns - top right */}
        <rect fill="black" x="85" y="10" width="25" height="25" />
        <rect fill="white" x="90" y="15" width="15" height="15" />
        <rect fill="black" x="93" y="18" width="9" height="9" />
        
        {/* Position patterns - bottom left */}
        <rect fill="black" x="10" y="85" width="25" height="25" />
        <rect fill="white" x="15" y="90" width="15" height="15" />
        <rect fill="black" x="18" y="93" width="9" height="9" />
        
        {/* Static data pattern - top right area */}
        <rect fill="black" x="40" y="10" width="4" height="4" />
        <rect fill="black" x="50" y="10" width="4" height="4" />
        <rect fill="black" x="60" y="10" width="4" height="4" />
        <rect fill="black" x="75" y="10" width="4" height="4" />
        <rect fill="black" x="45" y="15" width="4" height="4" />
        <rect fill="black" x="55" y="15" width="4" height="4" />
        <rect fill="black" x="70" y="15" width="4" height="4" />
        <rect fill="black" x="40" y="20" width="4" height="4" />
        <rect fill="black" x="50" y="20" width="4" height="4" />
        <rect fill="black" x="65" y="20" width="4" height="4" />
        <rect fill="black" x="75" y="20" width="4" height="4" />
        <rect fill="black" x="45" y="25" width="4" height="4" />
        <rect fill="black" x="60" y="25" width="4" height="4" />
        <rect fill="black" x="70" y="25" width="4" height="4" />
        <rect fill="black" x="40" y="30" width="4" height="4" />
        <rect fill="black" x="55" y="30" width="4" height="4" />
        <rect fill="black" x="65" y="30" width="4" height="4" />
        
        {/* Static data pattern - left side */}
        <rect fill="black" x="10" y="40" width="4" height="4" />
        <rect fill="black" x="20" y="40" width="4" height="4" />
        <rect fill="black" x="30" y="40" width="4" height="4" />
        <rect fill="black" x="15" y="50" width="4" height="4" />
        <rect fill="black" x="25" y="50" width="4" height="4" />
        <rect fill="black" x="10" y="60" width="4" height="4" />
        <rect fill="black" x="25" y="60" width="4" height="4" />
        <rect fill="black" x="15" y="70" width="4" height="4" />
        <rect fill="black" x="30" y="70" width="4" height="4" />
        <rect fill="black" x="20" y="75" width="4" height="4" />
        
        {/* Static data pattern - right side */}
        <rect fill="black" x="85" y="40" width="4" height="4" />
        <rect fill="black" x="95" y="40" width="4" height="4" />
        <rect fill="black" x="105" y="45" width="4" height="4" />
        <rect fill="black" x="90" y="50" width="4" height="4" />
        <rect fill="black" x="100" y="55" width="4" height="4" />
        <rect fill="black" x="85" y="60" width="4" height="4" />
        <rect fill="black" x="95" y="65" width="4" height="4" />
        <rect fill="black" x="105" y="70" width="4" height="4" />
        <rect fill="black" x="90" y="75" width="4" height="4" />
        
        {/* Static data pattern - bottom right */}
        <rect fill="black" x="85" y="85" width="4" height="4" />
        <rect fill="black" x="95" y="90" width="4" height="4" />
        <rect fill="black" x="105" y="85" width="4" height="4" />
        <rect fill="black" x="90" y="100" width="4" height="4" />
        <rect fill="black" x="100" y="105" width="4" height="4" />
        <rect fill="black" x="85" y="105" width="4" height="4" />
        
        {/* Center logo area */}
        <rect fill="white" x="45" y="45" width="30" height="30" rx="4" />
        <rect fill="#6b5dfc" x="50" y="50" width="20" height="20" rx="2" />
      </svg>
    );

    return (
    <div className="mt-3 space-y-4">
      {/* Payment Method Selector - Fintech style */}
      <div className="relative">
        <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider font-medium">Metode Pembayaran</p>
        
        <motion.div 
          className="relative cursor-pointer overflow-visible" 
          animate={{ height: containerHeight }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30,
            mass: 0.8,
          }}
          onClick={() => !paymentCardsExpanded && setPaymentCardsExpanded(true)}
          data-testid="payment-cards-container"
        >
          <AnimatePresence>
            {paymentMethods.map((method, index) => {
              const IconComponent = method.icon;
              const isSelected = selectedPaymentMethod === method.id;
              const cardColors = stackingCardColors[method.id];
              
              const yPosition = paymentCardsExpanded 
                ? index * (CARD_HEIGHT + EXPANDED_GAP) 
                : 0;
              const shouldShow = paymentCardsExpanded || isSelected;
              
              if (!shouldShow) return null;
              
              return (
                <motion.button
                  key={method.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardClick(method.id);
                  }}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{
                    y: yPosition,
                    scale: 1,
                    opacity: 1,
                  }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 30,
                    mass: 0.8,
                  }}
                  className={`
                    absolute left-0 right-0 p-3 rounded-xl text-left
                    ${cardColors.bg} 
                    ${isSelected ? 'ring-2 ring-white shadow-lg shadow-violet-500/20' : 'shadow-md'}
                  `}
                  style={{
                    zIndex: isSelected ? 100 : paymentMethods.length - index,
                    height: CARD_HEIGHT,
                  }}
                  data-testid={`payment-method-${method.id}`}
                >
                  <div className="flex items-center justify-between h-full">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-white/30 backdrop-blur-sm flex items-center justify-center">
                        <IconComponent className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-white leading-tight">{method.name}</p>
                        <p className="text-[10px] text-white/80 leading-tight">{method.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isSelected && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-5 h-5 rounded-full bg-white flex items-center justify-center"
                        >
                          <Check className="w-3 h-3 text-emerald-600" />
                        </motion.div>
                      )}
                      <motion.div
                        animate={{ rotate: paymentCardsExpanded ? 180 : 0 }}
                        className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center"
                      >
                        <ChevronDown className="w-3 h-3 text-white" />
                      </motion.div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Payment Details - Fintech/Crypto style cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl overflow-hidden"
        style={{ 
          background: 'linear-gradient(135deg, rgba(107, 93, 252, 0.08) 0%, rgba(139, 92, 246, 0.04) 100%)',
          border: '1px solid rgba(107, 93, 252, 0.15)'
        }}
      >
        {selectedPaymentMethod === "kompas" && (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                <ExternalLink className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm">Payment Link</p>
                <p className="text-[10px] text-muted-foreground">Bayar via browser</p>
              </div>
            </div>
            <a 
              href="https://pay.kompas.id/pay" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-medium text-sm text-white"
              style={{ backgroundColor: PRIMARY_COLOR }}
              data-testid="link-kompas-pay"
            >
              <ExternalLink className="w-4 h-4" />
              Buka Payment Link
            </a>
          </div>
        )}

        {selectedPaymentMethod === "qris" && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center">
                  <QrCode className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-sm">QRIS Payment</p>
                  <p className="text-[10px] text-muted-foreground">Berlaku 15 menit</p>
                </div>
              </div>
              <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-600">Aktif</span>
            </div>
            
            {/* QR Code with glow effect */}
            <div className="relative mx-auto w-40 h-40 mb-3">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500/30 to-purple-500/30 rounded-2xl blur-xl" />
              <div className="relative w-full h-full p-3 rounded-2xl bg-white shadow-xl">
                <QRCodeDummy />
              </div>
            </div>
            
            <p className="text-center text-xs text-muted-foreground mb-3">
              Scan dengan GoPay, OVO, DANA, ShopeePay, dll
            </p>
            
            {/* Save button */}
            <Button
              variant="outline"
              className="w-full h-9 text-sm"
              onClick={() => {
                const toast = document.createElement('div');
                toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-zinc-900 text-white text-sm rounded-full z-50';
                toast.textContent = 'QR Code tersimpan';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 2000);
              }}
              data-testid="button-save-qr"
            >
              <Copy className="w-3.5 h-3.5 mr-2" />
              Simpan QR Code
            </Button>
          </div>
        )}

        {selectedPaymentMethod === "bank" && (
          <div className="p-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm">Transfer Bank</p>
                <p className="text-[10px] text-muted-foreground">Pilih bank tujuan</p>
              </div>
            </div>
            
            <div className="space-y-1.5">
              {bankOptions.map((bank) => (
                <button
                  key={bank.id}
                  onClick={() => setSelectedBank(bank.id)}
                  className={`w-full p-2.5 rounded-xl text-left transition-all ${
                    selectedBank === bank.id 
                      ? 'bg-violet-500/15 ring-1 ring-violet-500/50' 
                      : 'bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10'
                  }`}
                  data-testid={`bank-option-${bank.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-[10px]" style={{ background: bank.color }}>{bank.name}</div>
                      <div>
                        <p className="font-mono text-sm font-medium">{bank.accountNumber}</p>
                        <p className="text-[10px] text-muted-foreground">{bank.accountName}</p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); copyToClipboard(bank.accountNumber); }} 
                      className="p-2 rounded-lg hover:bg-violet-500/20 transition-colors" 
                      data-testid={`button-copy-bank-${bank.id}`}
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedPaymentMethod === "va" && (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm">Virtual Account</p>
                <p className="text-[10px] text-muted-foreground">Nomor VA otomatis</p>
              </div>
            </div>
            
            <div className="p-3 rounded-xl bg-white/60 dark:bg-white/5 border border-white/20">
              <p className="text-[10px] text-muted-foreground mb-1">Nomor Virtual Account</p>
              <div className="flex items-center justify-between">
                <span className="font-mono text-lg font-bold tracking-wide" data-testid="text-va-number">{getVANumber()}</span>
                <button 
                  onClick={() => copyToClipboard(getVANumber())} 
                  className="p-2 rounded-lg hover:bg-violet-500/20 transition-colors" 
                  data-testid="button-copy-va"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedPaymentMethod === "crypto" && (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center">
                <Bitcoin className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm">Cryptocurrency</p>
                <p className="text-[10px] text-muted-foreground">Pilih coin</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {cryptoCoins.map((coin) => {
                const CoinIcon = coin.icon;
                const isActive = selectedCrypto === coin.id;
                return (
                  <button 
                    key={coin.id}
                    onClick={() => setSelectedCrypto(coin.id)}
                    className={`p-3 rounded-xl text-center transition-all ${
                      isActive 
                        ? 'bg-violet-500/15 ring-1 ring-violet-500/50 scale-[1.02]' 
                        : 'bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10'
                    }`}
                    data-testid={`crypto-option-${coin.id}`}
                  >
                    <CoinIcon className="w-6 h-6 mx-auto" style={{ color: coin.color }} />
                    <p className="text-xs font-bold mt-1">{coin.symbol}</p>
                  </button>
                );
              })}
            </div>
            
            {selectedCrypto && (() => {
              const coin = cryptoCoins.find(c => c.id === selectedCrypto);
              return (
                <div className="p-3 rounded-xl bg-white/60 dark:bg-white/5 border border-white/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-sm">{coin?.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-600 dark:text-violet-400 font-medium">{coin?.network}</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-zinc-100 dark:bg-zinc-900 rounded-lg">
                    <span className="font-mono text-[10px] break-all flex-1 text-muted-foreground" data-testid="text-crypto-address">{coin?.address}</span>
                    <button 
                      onClick={() => copyToClipboard(coin?.address || "")} 
                      className="p-2 rounded-lg hover:bg-violet-500/20 transition-colors shrink-0" 
                      data-testid="button-copy-crypto"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </motion.div>

      {/* Swipe to Pay Slider - Fintech style */}
      <div className="space-y-2">
        <div 
          ref={sliderRef}
          className="relative h-14 rounded-2xl overflow-hidden select-none touch-none"
          style={{ 
            background: isProcessing 
              ? '#10b981'
              : '#18181b'
          }}
          onMouseDown={handleSliderStart}
          onMouseMove={(e) => handleSliderMove(e.clientX)}
          onMouseUp={handleSliderEnd}
          onMouseLeave={handleSliderEnd}
          onTouchStart={handleSliderStart}
          onTouchMove={(e) => handleSliderMove(e.touches[0].clientX)}
          onTouchEnd={handleSliderEnd}
          data-testid="slider-pay"
        >
          {/* Progress fill */}
          <motion.div 
            className="absolute inset-y-0 left-0"
            style={{ backgroundColor: '#10b981' }}
            animate={{ width: `${sliderProgress * 100}%` }}
          />
          
          {/* Processing text inside slider */}
          {isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex items-center gap-2 text-white font-medium">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Memproses pembayaran...</span>
              </div>
            </div>
          )}
          
          {/* Slider thumb */}
          {!isProcessing && !paymentCompleted && (
            <motion.div
              className="absolute top-1 bottom-1 left-1 w-12 rounded-xl bg-white shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing"
              animate={{ x: sliderProgress * (sliderRef.current?.offsetWidth ? sliderRef.current.offsetWidth - 56 : 0) }}
              style={{ touchAction: 'none' }}
            >
              <div className="flex gap-0.5">
                <div className="w-0.5 h-4 rounded-full bg-zinc-300" />
                <div className="w-0.5 h-4 rounded-full bg-zinc-300" />
                <div className="w-0.5 h-4 rounded-full bg-zinc-300" />
              </div>
            </motion.div>
          )}
          
          {/* Completed checkmark */}
          {paymentCompleted && !isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-2 text-white font-medium">
                <Check className="w-5 h-5" />
                <span>Pembayaran dikonfirmasi</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Text below slider */}
        {!isProcessing && !paymentCompleted && (
          <p className="text-center text-xs text-muted-foreground">
            {sliderProgress > 0.5 ? 'Lepas untuk konfirmasi' : 'Geser untuk selesaikan pembayaran'}
          </p>
        )}
      </div>
    </div>
    );
  };

  const SuccessComponent = ({ data }: { data: any }) => (
    <div 
      className="mt-3 p-5 rounded-2xl"
      style={{ backgroundColor: '#6b5dfc' }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="font-bold text-lg text-white">Transaksi Berhasil!</p>
          <p className="text-sm text-white/80">Top up {data.product?.name}</p>
        </div>
      </div>
      
      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center py-2 border-b border-white/20">
          <span className="text-white/70 text-sm">Order ID</span>
          <span className="font-mono text-sm font-medium text-white" data-testid="text-order-id">{data.orderId}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-white/20">
          <span className="text-white/70 text-sm">Customer ID</span>
          <span className="font-mono text-sm font-medium text-white" data-testid="text-customer-id">{data.customerId}</span>
        </div>
      </div>
      
      <p className="text-sm text-white/90 text-center mb-4">
        Terima kasih telah menggunakan layanan kami. Koin akan segera ditambahkan ke akun Anda.
      </p>
      
      <div className="flex gap-3">
        <Button
          className="flex-1 h-11 text-white border-0 font-semibold"
          variant="outline"
          style={{
            background: 'rgba(255, 255, 255, 0.15)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
          }}
          onClick={() => handleAction("go_home")}
          data-testid="button-go-home"
        >
          Kembali
        </Button>
        <Button
          className="flex-1 h-11 text-violet-600 font-bold border-0"
          style={{
            background: 'white',
            boxShadow: '0 4px 14px rgba(255, 255, 255, 0.3)',
          }}
          onClick={() => handleAction("new_transaction")}
          data-testid="button-new-transaction"
        >
          Transaksi Baru
        </Button>
      </div>
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
                      <div className="flex flex-wrap gap-2 mt-3">
                        {msg.actions.map((action, idx) => (
                          <Button
                            key={idx}
                            size="sm"
                            variant={action.variant === "destructive" ? "outline" : "default"}
                            className={`h-8 text-xs font-semibold ${action.variant === "destructive" ? "border-zinc-600 text-zinc-300 hover:bg-zinc-800 hover:text-white" : "text-white"}`}
                            style={action.variant !== "destructive" ? { 
                              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                              boxShadow: '0 4px 14px rgba(249, 115, 22, 0.4)',
                            } : {
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                            }}
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
