import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";
import { 
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
import coinIconUrl from "@assets/coin-icon-64.png";
import bgImageUrl from "@assets/bg-widget-optimized.jpg";
import qrisImageUrl from "@assets/qris-demo.png";
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
const frostedGlassStyle = {
  bg: "bg-white/10 dark:bg-white/5 backdrop-blur-md",
  border: "border border-white/20",
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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [selectedBank, setSelectedBank] = useState<string>("bca");
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoOption>("btc");
  const [copied, setCopied] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [transactionCompleted, setTransactionCompleted] = useState(false);
  const [lastAction, setLastAction] = useState<string>("");
  const [actionRepeatCount, setActionRepeatCount] = useState(0);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [paymentStage, setPaymentStage] = useState<"idle" | "confirming" | "success">("idle");
  const [transactionKey, setTransactionKey] = useState(0);
  const [merchantInfo] = useState({ name: "DinnCafe", domain: "dinncafe.com" });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.from === "bot") {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [messages]);
  
  useEffect(() => {
    if (paymentStage === "success") {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [paymentStage]);

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

    // Check for top up intent
    if (msg.includes("topup") || msg.includes("top up") || msg.includes("koin") || msg.includes("beli") || msg.includes("isi")) {
      handleAction("topup");
      return;
    }

    // Contextual responses based on user intent
    let response = "";
    let actions: { label: string; action: string; variant?: "default" | "destructive" }[] | undefined;

    // Handle login/auth questions
    if (msg.includes("login") || msg.includes("masuk") || msg.includes("daftar") || msg.includes("register") || msg.includes("akun")) {
      response = "Untuk login atau daftar, silakan isi form berikut:";
      addTypingThenMessage({ from: "bot", content: response, component: "auth" as const }, 500);
      return;
    }

    // Handle payment/method questions
    if (msg.includes("bayar") || msg.includes("pembayaran") || msg.includes("metode") || msg.includes("transfer") || msg.includes("qris")) {
      response = "Untuk melakukan pembayaran, silakan pilih nominal top up terlebih dahulu:";
      addTypingThenMessage({ from: "bot", content: response, component: "packages" as const }, 500);
      return;
    }

    // Handle help questions
    if (msg.includes("bantuan") || msg.includes("help") || msg.includes("cara")) {
      response = "Saya bisa membantu kakak untuk:\n\n• Top up koin\n• Login / Daftar akun\n• Informasi pembayaran\n\nSilakan pilih:";
      actions = [
        { label: "Top Up Koin", action: "topup" },
        { label: "Login / Daftar", action: "show_auth" },
      ];
      addTypingThenMessage({ from: "bot", content: response, actions }, 500);
      return;
    }

    // If in transaction, focus on continuing
    if (selectedProduct && !transactionCompleted) {
      if (msg.includes("diskon") || msg.includes("promo") || msg.includes("potongan")) {
        response = `Belum ada diskon untuk ${selectedProduct.name}. Lanjut bayar?`;
        actions = [
          { label: "Lanjut Bayar", action: "confirm_auth" },
          { label: "Pilih Lain", action: "topup" },
        ];
      } else if (msg.includes("batal") || msg.includes("cancel")) {
        response = "Batalkan pesanan ini?";
        actions = [
          { label: "Ya", action: "cancel_package", variant: "destructive" },
          { label: "Tidak", action: "confirm_auth" },
        ];
      } else {
        response = `Lanjut bayar ${selectedProduct.name}?`;
        actions = [
          { label: "Lanjut Bayar", action: "confirm_auth" },
          { label: "Pilih Lain", action: "topup" },
        ];
      }
    } else if (transactionCompleted) {
      response = "Pembayaran selesai. Terima kasih!";
    } else {
      // No active transaction - provide helpful options
      if (msg.includes("diskon") || msg.includes("promo")) {
        response = "Pilih paket dulu ya.";
        actions = [{ label: "Pilih Paket", action: "topup" }];
      } else {
        response = "Ada yang bisa saya bantu?";
        actions = [
          { label: "Top Up Koin", action: "topup" },
          { label: "Login / Daftar", action: "show_auth" },
          { label: "Bantuan", action: "help" },
        ];
      }
    }

    addTypingThenMessage({ from: "bot", content: response, actions }, 500);
  };

  const getRandomGreeting = () => {
    const greetings = ["bosku", "kak", "kakak", "gan", "sis", "boss"];
    return greetings[Math.floor(Math.random() * greetings.length)];
  };

  const handleAction = (action: string) => {
    // Duplicate click prevention - ignore same action clicked 2+ times
    if (action === lastAction && action !== "process_payment" && action !== "new_transaction") {
      const newCount = actionRepeatCount + 1;
      setActionRepeatCount(newCount);
      
      if (newCount >= 2) {
        const greeting = getRandomGreeting();
        addTypingThenMessage({
          from: "bot",
          content: `Apa yang bisa kami bantu ${greeting}? Untuk memperlancar proses, tolong ikuti arahan dari saya ya ${greeting}.`,
          actions: [
            { label: "Top Up Koin", action: "topup" },
            { label: "Beranda", action: "go_home" },
          ],
        }, 300);
        return;
      }
    } else {
      setActionRepeatCount(1);
    }
    setLastAction(action);

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
          content: "Saya bisa membantu kakak untuk:\n\n• Top up koin\n• Login / Daftar akun\n• Informasi pembayaran\n\nApa yang kakak butuhkan?",
          actions: [
            { label: "Top Up Koin", action: "topup" },
            { label: "Login / Daftar", action: "show_auth" },
          ],
        });
        break;

      case "show_auth":
        addTypingThenMessage({
          from: "bot",
          content: "Silakan login atau daftar dengan mengisi form berikut:",
          component: "auth",
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
        // Ask for clarification before canceling
        addTypingThenMessage({
          from: "bot",
          content: "Sebelum dibatalkan, boleh tau alasannya kak?\n\nApakah kakak mau pilih nominal top up yang lain?",
          actions: [
            { label: "Pilih Nominal Lain", action: "topup" },
            { label: "Batalkan", action: "confirm_cancel", variant: "destructive" },
          ],
        });
        break;
      
      case "confirm_cancel":
        setSelectedProduct(null);
        addTypingThenMessage({
          from: "bot",
          content: "Baik kak, pesanan dibatalkan. Ada yang bisa saya bantu lagi?",
          actions: [
            { label: "Top Up Koin", action: "topup" },
            { label: "Beranda", action: "go_home" },
          ],
        });
        break;

      case "confirm_package":
        // Check if user is already logged in
        if (isLoggedIn) {
          const newOrderId = `CVT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
          setOrderId(newOrderId);
          addTypingThenMessage({
            from: "bot",
            content: `Kakak sudah login dari ${merchantInfo.domain}\n\nOrder ID: ${newOrderId}\n\nLanjut ke pembayaran?`,
            actions: [
              { label: "Cancel", action: "cancel_package", variant: "destructive" },
              { label: "Lanjut Bayar", action: "confirm_auth" },
            ],
          });
        } else {
          addTypingThenMessage({
            from: "bot",
            content: "Untuk melanjutkan pembayaran, kakak perlu login atau daftar terlebih dahulu.\n\nSilakan masukkan email dan password:",
            component: "auth",
          });
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
        setPaymentStage("confirming");
        
        // Stage 1: Wait for confirmation (3 seconds loading)
        setTimeout(() => {
          // Stage 2: Payment success
          setPaymentStage("success");
          setIsProcessing(false);
          
          const greeting = getRandomGreeting();
          addMessage({
            from: "bot",
            content: `Pembayaran berhasil ${greeting}! Ada yang bisa saya bantu lagi?`,
            component: "success",
            componentData: {
              orderId,
              customerId,
              product: selectedProduct,
              merchantInfo,
              greeting,
            },
          });
        }, 3000);
        break;

      case "new_transaction":
        setSelectedProduct(null);
        setOrderId("");
        setCustomerId("");
        setAuthEmail("");
        setAuthPassword("");
        setTransactionCompleted(false);
        setPaymentStage("idle");
        setIsProcessing(false);
        setLastAction("");
        setActionRepeatCount(0);
        setSelectedPaymentMethod(null);
        setSelectedBank("bca");
        setSelectedCrypto("btc");
        setCopied(false);
        setTransactionKey(prev => prev + 1);
        addTypingThenMessage({
          from: "bot",
          content: "Baik kak! Silakan pilih nominal top up yang diinginkan:",
          component: "packages",
        });
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
    <div className="flex flex-col gap-1.5 mt-3">
      {products.map((product) => (
        <button
          key={product.id}
          onClick={() => handleSelectProduct(product)}
          className="py-2.5 px-3 rounded-xl text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.25)',
          }}
          data-testid={`package-${product.id}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 flex-1">
              <img 
                src={coinIconUrl} 
                alt="Coin" 
                className="w-8 h-8 object-contain"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))' }}
              />
              <div>
                <p className="font-bold text-white text-base tracking-tight">{product.name}</p>
                <p className="text-[10px] text-zinc-400">{product.coins} Koin</p>
              </div>
            </div>
            <div className="text-zinc-400">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </button>
      ))}
    </div>
  );

  const AuthComponent = () => {
    const [localEmail, setLocalEmail] = useState(authEmail);
    const [localPassword, setLocalPassword] = useState(authPassword);
    const [showForgotPassword, setShowForgotPassword] = useState(loginAttempts >= 3);
    
    const handleEmailLogin = () => {
      setAuthEmail(localEmail);
      setAuthPassword(localPassword);
      
      if (localEmail && localPassword) {
        setIsProcessing(true);
        
        // Simulate login - 80% success rate for demo
        const success = Math.random() > 0.2;
        
        setTimeout(() => {
          setIsProcessing(false);
          
          if (success) {
            const newCustomerId = `CUS-${Date.now().toString(36).toUpperCase()}`;
            const newOrderId = `CVT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
            setCustomerId(newCustomerId);
            setOrderId(newOrderId);
            setIsLoggedIn(true);
            setLoginAttempts(0);
            
            addTypingThenMessage({
              from: "bot",
              content: `Login berhasil!\n\nAsal: ${merchantInfo.domain}\nMerchant: ${merchantInfo.name}\n\nCustomer ID: ${newCustomerId}\nOrder ID: ${newOrderId}\n\nLanjut ke pembayaran?`,
              actions: [
                { label: "Cancel", action: "cancel_auth", variant: "destructive" },
                { label: "Lanjut Bayar", action: "confirm_auth" },
              ],
            });
          } else {
            const attempts = loginAttempts + 1;
            setLoginAttempts(attempts);
            if (attempts >= 3) {
              setShowForgotPassword(true);
            }
            addTypingThenMessage({
              from: "bot",
              content: `Email atau password salah. ${attempts >= 3 ? "Silakan gunakan Lupa Password atau coba login dengan Google/GitHub." : "Silakan coba lagi."}`,
              component: "auth",
            }, 300);
          }
        }, 1500);
      }
    };
    
    const handleSocialLogin = (provider: "google" | "github") => {
      setIsProcessing(true);
      setTimeout(() => {
        const newCustomerId = `CUS-${Date.now().toString(36).toUpperCase()}`;
        const newOrderId = `CVT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        setCustomerId(newCustomerId);
        setOrderId(newOrderId);
        setIsLoggedIn(true);
        setIsProcessing(false);
        setLoginAttempts(0);
        
        addTypingThenMessage({
          from: "bot",
          content: `Login dengan ${provider === "google" ? "Google" : "GitHub"} berhasil!\n\nAsal: ${merchantInfo.domain}\nMerchant: ${merchantInfo.name}\n\nCustomer ID: ${newCustomerId}\nOrder ID: ${newOrderId}\n\nLanjut ke pembayaran?`,
          actions: [
            { label: "Cancel", action: "cancel_auth", variant: "destructive" },
            { label: "Lanjut Bayar", action: "confirm_auth" },
          ],
        });
      }, 1500);
    };

    const handleForgotPassword = () => {
      addTypingThenMessage({
        from: "bot",
        content: `Untuk reset password, silakan kunjungi halaman login ${merchantInfo.name} di ${merchantInfo.domain}`,
        actions: [
          { label: "Coba Login Lagi", action: "confirm_package" },
          { label: "Beranda", action: "go_home" },
        ],
      });
    };
    
    return (
      <div className="mt-3 space-y-3">
        <Input
          type="email"
          placeholder="Email"
          value={localEmail}
          onChange={(e) => setLocalEmail(e.target.value)}
          className="h-10 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/50"
          data-testid="input-auth-email"
        />
        <Input
          type="password"
          placeholder="Password"
          value={localPassword}
          onChange={(e) => setLocalPassword(e.target.value)}
          className="h-10 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/50"
          data-testid="input-auth-password"
        />
        <Button
          className="w-full h-10 text-white"
          style={{ backgroundColor: PRIMARY_COLOR, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)' }}
          onClick={handleEmailLogin}
          disabled={!localEmail || !localPassword || isProcessing}
          data-testid="button-auth-submit"
        >
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Masuk / Daftar"}
        </Button>
        
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <div className="flex-1 h-px bg-zinc-600" />
          <span>atau</span>
          <div className="flex-1 h-px bg-zinc-600" />
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 h-10 text-white border-white/20 hover:bg-white/10"
            onClick={() => handleSocialLogin("google")}
            disabled={isProcessing}
            data-testid="button-auth-google"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-10 text-white border-white/20 hover:bg-white/10"
            onClick={() => handleSocialLogin("github")}
            disabled={isProcessing}
            data-testid="button-auth-github"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub
          </Button>
        </div>
        
        {showForgotPassword && (
          <button
            onClick={handleForgotPassword}
            className="w-full text-sm text-violet-400 hover:text-violet-300 underline"
            data-testid="button-forgot-password"
          >
            Lupa Password?
          </button>
        )}
      </div>
    );
  };

  const PaymentComponent = () => {
    const [sliderProgress, setSliderProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [localPaymentCompleted, setLocalPaymentCompleted] = useState(false);
    const sliderRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef(0);
    
    const isPaymentDone = transactionCompleted || paymentStage === "success";

    // Swipe to pay handler - using ref for accurate progress check
    const handleSliderStart = () => {
      if (isProcessing || localPaymentCompleted) return;
      setIsDragging(true);
    };

    const handleSliderMove = (clientX: number) => {
      if (!sliderRef.current || isProcessing || localPaymentCompleted) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, (clientX - rect.left - 24) / (rect.width - 48)));
      progressRef.current = progress;
      setSliderProgress(progress);
    };

    const handleSliderEnd = () => {
      if (isProcessing || localPaymentCompleted) return;
      setIsDragging(false);
      
      if (progressRef.current > 0.85) {
        // Lock slider at 100% permanently - prevent double transaction
        setSliderProgress(1);
        progressRef.current = 1;
        setLocalPaymentCompleted(true);
        setTransactionCompleted(true);
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
      {/* Payment Method Selector - Frosted glass dropdown style */}
      <div>
        <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider font-medium">Metode Pembayaran</p>
        
        <div className="space-y-2" data-testid="payment-cards-container">
          {paymentMethods.map((method) => {
            const IconComponent = method.icon;
            const isSelected = selectedPaymentMethod === method.id;
            
            return (
              <button
                key={method.id}
                onClick={() => setSelectedPaymentMethod(method.id)}
                className={`
                  w-full p-3 rounded-xl flex items-center gap-3 transition-all
                  ${frostedGlassStyle.bg} ${frostedGlassStyle.border}
                  ${isSelected ? 'ring-2 ring-violet-500/50 shadow-lg shadow-violet-500/10' : 'shadow-md hover:shadow-lg'}
                `}
                data-testid={`payment-method-${method.id}`}
              >
                <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <IconComponent className="w-5 h-5 text-violet-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-sm">{method.name}</p>
                  <p className="text-xs text-muted-foreground">{method.description}</p>
                </div>
                {isSelected && <Check className="w-5 h-5 text-violet-500" />}
              </button>
            );
          })}
        </div>
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
            <div className="relative mx-auto w-48 mb-3">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500/30 to-purple-500/30 rounded-2xl blur-xl" />
              <div className="relative w-full rounded-2xl bg-white shadow-xl overflow-hidden">
                <img 
                  src={qrisImageUrl} 
                  alt="QRIS Payment Code" 
                  className="w-full h-auto"
                />
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
          <div className="p-4 space-y-3">
            <p className="font-semibold text-sm">Pilih bank tujuan</p>
            
            <div className="space-y-2">
              {bankOptions.map((bank) => (
                <button
                  key={bank.id}
                  onClick={() => setSelectedBank(bank.id)}
                  className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${
                    selectedBank === bank.id 
                      ? 'bg-violet-500/15 ring-1 ring-violet-500/50' 
                      : 'bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10'
                  }`}
                  data-testid={`bank-option-${bank.id}`}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0" style={{ background: bank.color }}>{bank.name}</div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold">{bank.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{bank.accountNumber}</p>
                  </div>
                  {selectedBank === bank.id && <Check className="w-5 h-5 text-violet-500" />}
                </button>
              ))}
            </div>
            
            {selectedBank && (() => {
              const bank = bankOptions.find(b => b.id === selectedBank);
              return bank && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Nomor Rekening {bank.name}</p>
                      <p className="font-mono text-base font-bold">{bank.accountNumber}</p>
                      <p className="text-xs text-muted-foreground">{bank.accountName}</p>
                    </div>
                    <button 
                      onClick={() => copyToClipboard(bank.accountNumber)} 
                      className="p-2 rounded-lg hover:bg-violet-500/20 transition-colors" 
                      data-testid={`button-copy-bank-${bank.id}`}
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {selectedPaymentMethod === "va" && (
          <div className="p-4 space-y-3">
            <p className="font-semibold text-sm">Pilih bank Virtual Account</p>
            
            <div className="space-y-2">
              {bankOptions.map((bank) => (
                <button
                  key={bank.id}
                  onClick={() => setSelectedBank(bank.id)}
                  className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${
                    selectedBank === bank.id 
                      ? 'bg-violet-500/15 ring-1 ring-violet-500/50' 
                      : 'bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10'
                  }`}
                  data-testid={`va-option-${bank.id}`}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0" style={{ background: bank.color }}>{bank.name}</div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold">VA {bank.name}</p>
                    <p className="text-xs text-muted-foreground">Virtual Account</p>
                  </div>
                  {selectedBank === bank.id && <Check className="w-5 h-5 text-violet-500" />}
                </button>
              ))}
            </div>
            
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
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
            <p className="font-semibold text-sm">Pilih cryptocurrency</p>
            
            <div className="space-y-2">
              {cryptoCoins.map((coin) => {
                const CoinIcon = coin.icon;
                const isActive = selectedCrypto === coin.id;
                return (
                  <button 
                    key={coin.id}
                    onClick={() => setSelectedCrypto(coin.id)}
                    className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${
                      isActive 
                        ? 'bg-violet-500/15 ring-1 ring-violet-500/50' 
                        : 'bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10'
                    }`}
                    data-testid={`crypto-option-${coin.id}`}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${coin.color}20` }}>
                      <CoinIcon className="w-5 h-5" style={{ color: coin.color }} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold">{coin.name}</p>
                      <p className="text-xs text-muted-foreground">{coin.symbol} • {coin.network}</p>
                    </div>
                    {isActive && <Check className="w-5 h-5 text-violet-500" />}
                  </button>
                );
              })}
            </div>
            
            {selectedCrypto && (() => {
              const coin = cryptoCoins.find(c => c.id === selectedCrypto);
              return (
                <div className="p-3 rounded-xl bg-white/60 dark:bg-white/5 border border-white/20">
                  <p className="text-[10px] text-muted-foreground mb-2">Alamat {coin?.symbol}</p>
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
            background: localPaymentCompleted 
              ? '#10b981'
              : '#18181b',
            willChange: 'transform',
            transform: 'translateZ(0)',
          }}
          onMouseDown={handleSliderStart}
          onMouseMove={(e) => isDragging && handleSliderMove(e.clientX)}
          onMouseUp={handleSliderEnd}
          onMouseLeave={() => isDragging && handleSliderEnd()}
          onTouchStart={handleSliderStart}
          onTouchMove={(e) => handleSliderMove(e.touches[0].clientX)}
          onTouchEnd={handleSliderEnd}
          data-testid="slider-pay"
        >
          {/* Progress fill */}
          <motion.div 
            className="absolute inset-y-0 left-0"
            style={{ 
              backgroundColor: '#10b981',
              willChange: 'width',
            }}
            animate={{ width: `${sliderProgress * 100}%` }}
            transition={{ type: "tween", duration: 0 }}
          />
          
          {/* Stage 1: Confirming payment - locked at 100% */}
          {localPaymentCompleted && paymentStage === "confirming" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex items-center gap-2 text-white font-medium">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Menunggu konfirmasi...</span>
              </div>
            </div>
          )}
          
          {/* Stage 2: Payment success */}
          {localPaymentCompleted && paymentStage === "success" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex items-center gap-2 text-white font-medium">
                <Check className="w-5 h-5" />
                <span>Transaksi berhasil</span>
              </div>
            </div>
          )}
          
          {/* Slider thumb - hidden after payment confirmed */}
          {!localPaymentCompleted && (
            <motion.div
              className="absolute top-1 bottom-1 left-1 w-12 rounded-xl bg-white shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing"
              animate={{ 
                x: sliderProgress * (sliderRef.current?.offsetWidth ? sliderRef.current.offsetWidth - 56 : 0) 
              }}
              style={{ 
                touchAction: 'none',
                willChange: 'transform',
              }}
              transition={{ type: "tween", duration: 0 }}
            >
              <div className="flex gap-0.5">
                <div className="w-0.5 h-4 rounded-full bg-zinc-300" />
                <div className="w-0.5 h-4 rounded-full bg-zinc-300" />
                <div className="w-0.5 h-4 rounded-full bg-zinc-300" />
              </div>
            </motion.div>
          )}
        </div>
        
        {/* Text below slider */}
        {!localPaymentCompleted && (
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
      {/* Left-aligned layout */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-6 h-6 text-white" />
        </div>
        <div className="text-left">
          <p className="font-bold text-lg text-white">Transaksi Berhasil!</p>
          <p className="text-sm text-white/80">Top up {data.product?.name}</p>
        </div>
      </div>
      
      {/* Left-aligned details */}
      <div className="space-y-2 mb-4 text-left">
        <div className="py-2 border-b border-white/20">
          <p className="text-white/70 text-xs">Order ID</p>
          <p className="font-mono text-sm font-medium text-white" data-testid="text-order-id">{data.orderId}</p>
        </div>
        <div className="py-2 border-b border-white/20">
          <p className="text-white/70 text-xs">Customer ID</p>
          <p className="font-mono text-sm font-medium text-white" data-testid="text-customer-id">{data.customerId}</p>
        </div>
        {data.merchantInfo && (
          <div className="py-2 border-b border-white/20">
            <p className="text-white/70 text-xs">Merchant</p>
            <p className="text-sm font-medium text-white">{data.merchantInfo.name} ({data.merchantInfo.domain})</p>
          </div>
        )}
      </div>
      
      <p className="text-sm text-white/90 text-left mb-4">
        Terima kasih {data.greeting || 'kak'}! Koin akan segera ditambahkan ke akun Anda.
      </p>
      
      <div className="flex flex-col gap-2">
        <Button
          className="w-full h-11 text-violet-600 font-bold border-0"
          style={{
            background: 'white',
            boxShadow: '0 4px 14px rgba(255, 255, 255, 0.3)',
          }}
          onClick={() => handleAction("new_transaction")}
          data-testid="button-new-transaction"
        >
          Transaksi Baru
        </Button>
        <Button
          className="w-full h-11 text-white border-0 font-semibold"
          variant="outline"
          style={{
            background: 'rgba(255, 255, 255, 0.15)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
          }}
          onClick={() => handleAction("go_home")}
          data-testid="button-go-home"
        >
          Kembali ke Beranda
        </Button>
      </div>
    </div>
  );

  const renderComponent = (component: string, data?: any) => {
    switch (component) {
      case "packages": return <PackagesComponent key={`packages-${transactionKey}`} />;
      case "auth": return <AuthComponent key={`auth-${transactionKey}`} />;
      case "payment": return <PaymentComponent key={`payment-${transactionKey}`} />;
      case "success": return <SuccessComponent data={data} />;
      default: return null;
    }
  };

  const widgetContent = (
    <div 
      className="h-full w-full flex flex-col"
      style={{
        backgroundImage: `url(${bgImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
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
                <div 
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                  }}
                >
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div
                className={`max-w-[80%] p-3 text-sm rounded-2xl text-white ${
                  msg.from === "user" ? "rounded-br-sm" : "rounded-bl-sm"
                }`}
                style={{
                  background: msg.from === "user" ? PRIMARY_COLOR : 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: msg.from !== "user" ? 'blur(12px)' : undefined,
                  WebkitBackdropFilter: msg.from !== "user" ? 'blur(12px)' : undefined,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                }}
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
                              background: '#6b5dfc',
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
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
      <div 
        className="p-3"
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div className="flex gap-2">
          <Input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Ketik pesan..."
            className="flex-1 h-10 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/50"
            data-testid="input-chat-message"
          />
          <Button 
            size="icon" 
            className="h-10 w-10 text-white" 
            style={{ 
              backgroundColor: PRIMARY_COLOR,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
            }} 
            onClick={handleSendMessage} 
            data-testid="button-send-message"
          >
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
