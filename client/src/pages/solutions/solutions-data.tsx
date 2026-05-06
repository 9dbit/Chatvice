import { Link } from "wouter";
import type { LucideIcon } from "lucide-react";
import { MessageCircle, Globe, Zap, Brain, HeadphonesIcon, BarChart3, Shield, Clock, CheckCircle2, Users, Database, Sparkles, Store } from "lucide-react";

export interface SolutionFeature {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface SolutionPageData {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  subtitle: string;
  introParagraphs: React.ReactNode[];
  features: SolutionFeature[];
  useCases: string[];
  whyChatvice: string[];
  stats: { value: string; label: string }[];
  ctaHeading: string;
  ctaSubtext: string;
  relatedSlugs: string[];
}

export const solutionsData: SolutionPageData[] = [
  {
    slug: "chatbot-customer-service",
    metaTitle: "Chatbot Customer Service Indonesia Terbaik | Chatvice",
    metaDescription: "Chatbot customer service AI untuk bisnis Indonesia. Otomasi jawaban, eskalasi ke manusia, knowledge base pintar. Coba gratis sekarang.",
    h1: "Chatbot Customer Service AI untuk Bisnis Indonesia",
    subtitle: "Layani pelanggan 24/7 dengan AI pintar yang memahami bahasa Indonesia — tanpa perlu menambah tim support.",
    introParagraphs: [
      <>
        Di era digital yang terus bergerak cepat, pelanggan mengharapkan respons instan kapan pun mereka menghubungi bisnis Anda — siang malam, hari kerja maupun libur nasional. Penelitian menunjukkan bahwa lebih dari 60% konsumen Indonesia lebih memilih mendapatkan jawaban langsung dari chatbot daripada menunggu dibalas oleh agen manusia. Namun membangun tim customer service yang besar dan terlatih membutuhkan biaya rekrutmen, pelatihan, gaji, dan manajemen yang sangat signifikan. Belum lagi risiko turnover tinggi yang umum terjadi di divisi customer service. Di sinilah chatbot customer service berbasis AI hadir sebagai solusi nyata yang sudah terbukti efektif.
      </>,
      <>
        Chatvice menghadirkan platform chatbot customer service yang ditenagai oleh <Link href="/features" className="text-purple-600 hover:underline">LEXA1 AI Engine</Link> — dirancang khusus untuk memenuhi kebutuhan bisnis Indonesia. Berbeda dari chatbot berbasis aturan (rule-based chatbot) yang hanya menjawab pertanyaan sesuai skrip yang diprogramkan, LEXA1 menggunakan teknologi semantic search dan large language model untuk benar-benar memahami maksud di balik pertanyaan pelanggan. Artinya, meski pelanggan menggunakan kata-kata berbeda atau bahkan mencampur Bahasa Indonesia dengan Inggris dan bahasa daerah, AI Anda tetap menemukan jawaban yang paling relevan dari <Link href="/features" className="text-purple-600 hover:underline">knowledge base bisnis Anda</Link>. Tidak perlu memprogram setiap kemungkinan pertanyaan — cukup latih AI dengan informasi bisnis Anda, dan biarkan LEXA1 bekerja.
      </>,
      <>
        Keunggulan utama chatbot customer service Chatvice bukan hanya pada kemampuan menjawab otomatis, tetapi pada sistem eskalasi pintarnya. Ketika pelanggan memiliki masalah kompleks yang membutuhkan keputusan manusia — seperti permintaan refund, keluhan khusus, atau negosiasi — chatbot secara otomatis mengalihkan percakapan ke supervisor manusia di <Link href="/features" className="text-purple-600 hover:underline">supervisor panel</Link> real-time kami. Pelanggan tidak merasakan perpindahan yang janggal, dan supervisor mendapatkan konteks percakapan lengkap sehingga tidak perlu menanyakan ulang dari awal. Hasilnya adalah pengalaman pelanggan yang mulus dan profesional di setiap titik kontak. Dengan <Link href="/pricing" className="text-purple-600 hover:underline">paket harga yang fleksibel</Link> mulai dari gratis, bisnis dari skala UMKM hingga enterprise dapat mulai mengotomasi customer service mereka hari ini juga.
      </>,
      <>
        Implementasi chatbot customer service Chatvice tidak memerlukan pengetahuan teknis. Dashboard merchant yang intuitif memungkinkan Anda mengunggah dokumen FAQ, mengisi knowledge base dengan format tanya-jawab, atau bahkan membiarkan AI menghasilkan konten knowledge base secara otomatis berdasarkan deskripsi bisnis Anda. Widget chat yang sudah jadi dapat dipasang di website dengan satu baris kode JavaScript — kompatibel dengan WordPress, Shopify, Wix, Webflow, dan platform website lainnya. Analitik real-time memperlihatkan berapa banyak chat yang berhasil diselesaikan oleh AI, topik pertanyaan yang paling sering muncul, dan waktu respons rata-rata — data yang sangat berharga untuk terus meningkatkan kualitas layanan Anda. Bergabunglah dengan ratusan bisnis Indonesia yang sudah membuktikan bahwa customer service yang baik tidak harus mahal.
      </>,
    ],
    features: [
      { icon: Brain, title: "AI Memahami Bahasa Indonesia", description: "LEXA1 Engine terlatih untuk memahami nuansa Bahasa Indonesia, termasuk bahasa informal dan campuran Indonesia-Inggris." },
      { icon: Database, title: "Knowledge Base Pintar", description: "Latih AI dengan FAQ, dokumen produk, dan SOP bisnis Anda. AI menjawab berdasarkan informasi nyata dari bisnis Anda." },
      { icon: HeadphonesIcon, title: "Eskalasi ke Manusia", description: "Ketika AI tidak cukup, percakapan otomatis dialihkan ke supervisor manusia tanpa pelanggan merasakan perbedaan." },
      { icon: BarChart3, title: "Analitik Real-Time", description: "Pantau performa chatbot, tingkat kepuasan pelanggan, dan topik pertanyaan terbanyak melalui dashboard analitik." },
      { icon: Clock, title: "Aktif 24/7", description: "Chatbot melayani pelanggan sepanjang waktu tanpa istirahat, memastikan tidak ada pertanyaan yang tidak terjawab." },
      { icon: Shield, title: "Keamanan Data Terjamin", description: "Enkripsi end-to-end dan kontrol akses domain memastikan data pelanggan Anda selalu aman." },
    ],
    useCases: [
      "Menjawab pertanyaan umum tentang produk, harga, dan ketersediaan",
      "Membantu pelanggan melacak status pesanan",
      "Mengarahkan pelanggan ke divisi yang tepat berdasarkan kebutuhan",
      "Mengumpulkan informasi awal sebelum ditangani agen manusia",
      "Memberikan informasi jam operasional, lokasi, dan kontak",
      "Menangani keluhan awal dan eskalasi kasus kompleks",
    ],
    whyChatvice: [
      "Satu-satunya platform dengan dukungan Bahasa Indonesia first-class",
      "Integrasi mudah — pasang di website hanya dengan satu baris kode",
      "Tidak perlu programmer — semua konfigurasi bisa dilakukan dari dashboard",
      "Harga terjangkau mulai dari gratis, cocok untuk UKM hingga enterprise",
      "Support tim berbasis Indonesia yang memahami kebutuhan bisnis lokal",
    ],
    stats: [
      { value: "10.000+", label: "Percakapan diotomasi setiap hari" },
      { value: "85%", label: "Pertanyaan diselesaikan tanpa agen manusia" },
      { value: "24/7", label: "Ketersediaan tanpa biaya tambahan" },
      { value: "<1 detik", label: "Waktu respons rata-rata" },
    ],
    ctaHeading: "Mulai Otomasi Customer Service Bisnis Anda",
    ctaSubtext: "Coba Chatvice gratis selama 14 hari. Tidak perlu kartu kredit.",
    relatedSlugs: ["ai-chatbot-whatsapp", "live-chat-website", "chatbot-toko-online", "chatbot-jakarta", "chatbot-restoran", "chatbot-klinik"],
  },
  {
    slug: "ai-chatbot-whatsapp",
    metaTitle: "AI Chatbot WhatsApp Bisnis Otomatis | Chatvice",
    metaDescription: "Chatbot WhatsApp bisnis dengan AI. Otomasi pesan WhatsApp, integrasi widget chat, dan eskalasi ke supervisor. Solusi terbaik untuk bisnis Indonesia.",
    h1: "AI Chatbot WhatsApp untuk Bisnis — Otomasi Pesan, Tingkatkan Penjualan",
    subtitle: "Hubungkan chatbot AI Chatvice dengan WhatsApp bisnis Anda dan layani ribuan pelanggan secara otomatis tanpa kewalahan.",
    introParagraphs: [
      <>
        WhatsApp adalah aplikasi pesan nomor satu di Indonesia dengan lebih dari 100 juta pengguna aktif setiap harinya. Bagi bisnis Indonesia — mulai dari UMKM hingga perusahaan besar — WhatsApp bukan sekadar alat komunikasi. Ini adalah saluran penjualan, customer service, dan follow-up yang paling efektif sekaligus paling personal. Pelanggan sudah terbiasa mengirim pesan WhatsApp ke toko favorit mereka untuk menanyakan stok, harga, cara penggunaan produk, hingga status pengiriman. Masalahnya: volume pesan yang masuk bisa ratusan hingga ribuan per hari, dan tim yang kewalahan berarti respons lambat, pelanggan frustrasi, dan penjualan yang terlewat.
      </>,
      <>
        Chatvice hadir dengan solusi yang menggabungkan kecuatan AI dengan ekosistem komunikasi WhatsApp yang sudah Anda gunakan. Widget <Link href="/live-chat-website" className="text-purple-600 hover:underline">live chat</Link> Chatvice yang dipasang di website Anda menampilkan tombol WhatsApp terintegrasi, sehingga pelanggan yang ingin melanjutkan percakapan via WhatsApp dapat langsung diarahkan dengan satu klik — sementara <Link href="/features" className="text-purple-600 hover:underline">LEXA1 AI Engine</Link> tetap menangani pertanyaan umum secara otomatis di widget chat. Kombinasi ini memastikan bahwa hanya percakapan yang benar-benar membutuhkan sentuhan personal yang masuk ke WhatsApp tim Anda, sementara pertanyaan berulang sudah diselesaikan oleh AI bahkan sebelum pelanggan perlu menghubungi langsung.
      </>,
      <>
        Dengan sistem knowledge base yang bisa diisi dengan katalog produk, FAQ, kebijakan toko, dan panduan layanan Anda, chatbot AI Chatvice mampu menjawab lebih dari 80% pertanyaan masuk secara akurat tanpa intervensi manusia. Fitur <Link href="/features" className="text-purple-600 hover:underline">AI Product Catalog Crawler</Link> bahkan bisa mengekstrak informasi produk dari halaman website Anda secara otomatis menggunakan teknologi AI Vision — artinya chatbot Anda selalu up-to-date dengan stok dan harga terbaru tanpa perlu input manual. Supervisor panel real-time memungkinkan tim Anda memantau semua percakapan aktif, mengambil alih chat dari AI kapan saja diperlukan, dan bahkan mengirim pesan proaktif ke pengunjung website sebelum mereka bertanya.
      </>,
      <>
        Salah satu keunggulan terbesar Chatvice untuk bisnis berbasis WhatsApp adalah fitur <Link href="/features" className="text-purple-600 hover:underline">Two-Way Telegram Supervisor Bridge</Link> — supervisor dapat menghubungkan akun Telegram mereka dan menerima notifikasi eskalasi langsung sebagai DM Telegram, lalu membalas langsung dari Telegram tanpa harus membuka dashboard. Ini sangat berguna ketika tim sedang dalam perjalanan atau tidak sedang di depan komputer. Mulai dari <Link href="/pricing" className="text-purple-600 hover:underline">paket gratis</Link> hingga Enterprise, Chatvice menyediakan fondasi yang kuat untuk membangun operasi customer service berbasis WhatsApp yang scalable, efisien, dan benar-benar responsif.
      </>,
    ],
    features: [
      { icon: MessageCircle, title: "Integrasi Widget + WhatsApp", description: "Widget chat di website Anda menampilkan tombol WhatsApp untuk eskalasi mudah ke percakapan personal." },
      { icon: Brain, title: "AI Otomasi Pesan", description: "LEXA1 membalas pertanyaan umum secara otomatis 24 jam sehari berdasarkan knowledge base bisnis Anda." },
      { icon: Users, title: "Manajemen Tim", description: "Distribusikan percakapan ke agen yang tepat dengan sistem round-robin dan supervisor panel real-time." },
      { icon: Sparkles, title: "Saran Pertanyaan Cerdas", description: "Widget menampilkan pertanyaan yang sering diajukan sehingga pelanggan mendapat jawaban lebih cepat." },
      { icon: Store, title: "Rekomendasi Produk AI", description: "AI dapat merekomendasikan produk yang relevan berdasarkan pertanyaan pelanggan dan katalog Anda." },
      { icon: Globe, title: "Multi-Bahasa", description: "Chatbot merespons dalam bahasa yang sama dengan pelanggan — Bahasa Indonesia, Inggris, dan 50+ bahasa lainnya." },
    ],
    useCases: [
      "Menjawab pertanyaan produk dan harga sebelum pelanggan menghubungi via WhatsApp",
      "Otomasi pesan selamat datang dan informasi awal untuk calon pembeli",
      "Menampilkan tombol WhatsApp di widget untuk kontak langsung dengan sales",
      "Filter pertanyaan dasar agar tim WhatsApp hanya menangani kasus serius",
      "Mengumpulkan nama dan kebutuhan pelanggan sebelum dialihkan ke agen",
      "Menampilkan katalog produk dan promo terbaru secara otomatis",
    ],
    whyChatvice: [
      "Widget chat dengan tombol WhatsApp terintegrasi langsung",
      "AI memahami konteks percakapan, bukan hanya kata kunci",
      "Supervisor panel real-time untuk memantau semua percakapan",
      "Tidak perlu akun WhatsApp Business API yang mahal",
      "Setup dalam hitungan menit tanpa coding",
    ],
    stats: [
      { value: "3x", label: "Lebih cepat merespons pertanyaan pelanggan" },
      { value: "70%", label: "Pengurangan beban tim WhatsApp" },
      { value: "100+", label: "Bahasa yang didukung AI" },
      { value: "5 menit", label: "Waktu setup widget" },
    ],
    ctaHeading: "Siap Otomasi Pesan Bisnis Anda?",
    ctaSubtext: "Mulai gratis dan lihat perbedaannya dalam 24 jam pertama.",
    relatedSlugs: ["chatbot-customer-service", "live-chat-website", "chatbot-toko-online", "chatbot-jakarta", "chatbot-restoran"],
  },
  {
    slug: "live-chat-website",
    metaTitle: "Live Chat untuk Website Indonesia — Pasang dalam 5 Menit | Chatvice",
    metaDescription: "Pasang live chat di website Anda dalam 5 menit. Widget AI chat yang bisa dikustomisasi, gratis, dan mendukung Bahasa Indonesia.",
    h1: "Live Chat untuk Website — Pasang dalam 5 Menit, Layani Pelanggan Selamanya",
    subtitle: "Widget live chat bertenaga AI yang mudah dipasang di website mana pun. Tidak perlu programmer, tidak perlu server sendiri.",
    introParagraphs: [
      <>
        Live chat sudah terbukti menjadi salah satu fitur website yang paling berdampak pada konversi bisnis. Studi menunjukkan bahwa website dengan live chat mengalami peningkatan konversi rata-rata 40% dibandingkan yang tidak memilikinya. Alasannya sederhana: ketika pengunjung dapat langsung mengajukan pertanyaan dan mendapat jawaban instan tanpa harus menelepon atau menunggu balasan email, hambatan untuk melakukan pembelian atau mendaftar menjadi jauh lebih rendah. Di Indonesia, di mana budaya bertanya sebelum membeli sangat kuat, live chat bukan sekadar tambahan fitur — ini adalah kebutuhan bisnis yang nyata.
      </>,
      <>
        Namun kebanyakan solusi live chat konvensional mengharuskan Anda selalu menyiagakan agen manusia yang standby di belakang layar. Jika tidak ada agen yang online, pengunjung melihat widget yang tidak responsif dan pergi begitu saja. Chatvice menyelesaikan masalah ini dengan menggabungkan live chat tradisional dengan kecerdasan AI. Widget <Link href="/features" className="text-purple-600 hover:underline">LEXA1-powered</Link> Chatvice secara otomatis menjawab pertanyaan pengunjung menggunakan knowledge base bisnis Anda — kapan pun, bahkan di tengah malam atau hari libur — sambil tetap memungkinkan transisi mulus ke supervisor manusia ketika dibutuhkan. Hasilnya: website Anda tidak pernah "tidur", dan pelanggan selalu mendapat respons.
      </>,
      <>
        Proses memasang live chat Chatvice di website Anda tidak bisa lebih mudah. Salin satu baris kode JavaScript dari dashboard Anda, tempel di bagian `{'<head>'}` atau `{'<body>'}` website Anda, dan widget langsung aktif. Tidak ada perubahan server, tidak ada konfigurasi database, tidak ada ketergantungan pada plugin pihak ketiga. Widget kompatibel dengan semua platform website populer — WordPress, Wix, Shopify, Webflow, Squarespace, hingga website custom yang dibangun dari nol. Anda juga dapat menyesuaikan tampilan widget sepenuhnya dari dashboard: warna brand, avatar AI agent, pesan sambutan, pertanyaan yang disarankan, hingga posisi widget di layar — semua tanpa menyentuh kode. Bandingkan ini dengan solusi live chat lain yang membutuhkan developer untuk setiap perubahan kecil.
      </>,
      <>
        Setelah dipasang, dashboard analitik Chatvice memberikan gambaran lengkap tentang bagaimana pengunjung berinteraksi dengan widget Anda. Anda dapat melihat berapa banyak percakapan terjadi setiap hari, topik yang paling sering ditanyakan, tingkat kepuasan pelanggan, dan seberapa efektif AI menyelesaikan pertanyaan tanpa eskalasi ke manusia. Data ini sangat berharga untuk mengoptimalkan knowledge base dan meningkatkan kualitas layanan seiring waktu. Dengan <Link href="/pricing" className="text-purple-600 hover:underline">pilihan paket fleksibel</Link> mulai dari gratis — tanpa batas waktu — hingga Enterprise, Chatvice adalah pilihan live chat website yang paling cost-effective untuk bisnis Indonesia. Lihat juga bagaimana kami dibandingkan dengan solusi lain di halaman <Link href="/alternatif-tawkto" className="text-purple-600 hover:underline">alternatif Tawk.to</Link> kami.
      </>,
    ],
    features: [
      { icon: Zap, title: "Pasang dalam 5 Menit", description: "Salin satu baris kode ke website Anda dan widget langsung aktif. Kompatibel dengan semua platform website." },
      { icon: Sparkles, title: "Kustomisasi Penuh", description: "Ubah warna, avatar, pesan sambutan, posisi widget, dan tampilan sesuai brand bisnis Anda." },
      { icon: Brain, title: "AI Menjawab Otomatis", description: "LEXA1 menjawab pertanyaan berdasarkan knowledge base Anda sehingga tim tidak kewalahan." },
      { icon: HeadphonesIcon, title: "Eskalasi ke Human", description: "Agen manusia bisa mengambil alih percakapan kapan saja dari supervisor panel yang intuitif." },
      { icon: Globe, title: "Berfungsi di Semua Platform", description: "Kompatibel dengan WordPress, Wix, Shopify, Webflow, Squarespace, dan website custom." },
      { icon: BarChart3, title: "Analitik Percakapan", description: "Lihat berapa banyak chat, topik populer, dan tingkat kepuasan pelanggan dari dashboard Anda." },
    ],
    useCases: [
      "Website toko online yang ingin menjawab pertanyaan produk secara otomatis",
      "Landing page bisnis jasa yang ingin menangkap prospek 24 jam",
      "Website perusahaan yang membutuhkan support untuk klien dan mitra",
      "Platform SaaS yang ingin mengurangi tiket support dengan AI FAQ",
      "Website edukasi yang membutuhkan bantuan pendaftaran otomatis",
      "Portal properti yang ingin menjawab pertanyaan unit tersedia",
    ],
    whyChatvice: [
      "Satu-satunya live chat dengan AI berbahasa Indonesia yang benar-benar akurat",
      "Widget dapat dikustomisasi tanpa batas dari dashboard tanpa coding",
      "Gratis untuk mencoba — tidak ada batas waktu untuk plan dasar",
      "Supervisor panel real-time untuk tim support Anda",
      "Dukungan upload gambar, video, dan dokumen dalam chat",
    ],
    stats: [
      { value: "40%", label: "Peningkatan konversi rata-rata dengan live chat" },
      { value: "1 baris", label: "Kode yang diperlukan untuk pasang widget" },
      { value: "50+", label: "Platform website yang kompatibel" },
      { value: "99.9%", label: "Uptime layanan" },
    ],
    ctaHeading: "Pasang Live Chat di Website Anda Sekarang",
    ctaSubtext: "Gratis untuk memulai. Setup dalam 5 menit.",
    relatedSlugs: ["chatbot-customer-service", "ai-chatbot-whatsapp", "chatbot-toko-online", "chatbot-properti", "chatbot-pendidikan"],
  },
  {
    slug: "chatbot-toko-online",
    metaTitle: "Chatbot untuk Toko Online & E-Commerce Indonesia | Chatvice",
    metaDescription: "Chatbot AI untuk toko online dan e-commerce Indonesia. Otomasi CS, rekomendasi produk, cek stok otomatis. Tingkatkan penjualan 24/7.",
    h1: "Chatbot AI untuk Toko Online — Otomasi CS, Tingkatkan Penjualan",
    subtitle: "Chatbot e-commerce yang memahami bisnis online Anda: produk, stok, pesanan, dan pelanggan setia Anda.",
    introParagraphs: [
      <>
        Menjalankan toko online di Indonesia berarti menghadapi volume pertanyaan yang sangat tinggi setiap harinya — tentang stok produk, ongkos kirim, status pesanan, cara pembayaran, prosedur retur, masa garansi, dan ratusan pertanyaan lainnya. Saat traffic toko online melonjak — misalnya saat promo Harbolnas, Lebaran, atau flash sale — tim <Link href="/chatbot-customer-service" className="text-purple-600 hover:underline">customer service</Link> yang tidak siap akan kewalahan, respons melambat, pelanggan frustrasi, dan konversi anjlok. Padahal di sinilah momen terpenting untuk menutup penjualan — justru saat pengunjung paling banyak dan paling aktif.
      </>,
      <>
        Chatbot AI Chatvice dirancang dengan mempertimbangkan kompleksitas operasional toko online Indonesia. Dengan mengunggah katalog produk, FAQ, dan kebijakan toko ke <Link href="/features" className="text-purple-600 hover:underline">knowledge base</Link>, chatbot dapat menjawab hampir semua pertanyaan pembeli secara otomatis dalam kurang dari satu detik — kapan pun, berapa pun volumenya. Tidak ada lagi antrian panjang di WhatsApp, tidak ada lagi pertanyaan yang terlewat di jam sibuk. Yang lebih menarik: fitur AI Product Catalog Crawler Chatvice dapat secara otomatis mengekstrak informasi produk dari halaman website toko Anda menggunakan teknologi AI Vision, sehingga knowledge base selalu sinkron dengan katalog aktual Anda tanpa perlu input manual yang memakan waktu.
      </>,
      <>
        Kemampuan Chatvice tidak berhenti di FAQ otomatis. Fitur <Link href="/features" className="text-purple-600 hover:underline">Google Sheet Transaction Lookup</Link> memungkinkan pelanggan menanyakan status transaksi mereka dalam bahasa natural — "Pesanan saya sudah dikirim belum?" — dan AI akan mengambil data langsung dari Google Sheet toko Anda secara real-time, lalu menjawab dengan informasi yang akurat dan personal. Ini mengeliminasi kebutuhan akan portal tracking terpisah dan mengurangi beban pertanyaan status pesanan yang biasanya menjadi sumber utama volume chat tinggi. Selain itu, sistem <Link href="/features" className="text-purple-600 hover:underline">eskalasi otomatis</Link> memastikan keluhan serius, permintaan retur, atau kasus negosiasi langsung diteruskan ke agen CS manusia yang tepat.
      </>,
      <>
        Untuk toko online yang menjual produk premium atau butuh interaksi lebih personal, fitur Proactive Chat Chatvice memungkinkan supervisor memantau pengunjung aktif di website secara real-time — termasuk halaman yang sedang dibuka dan durasi kunjungan — dan mengirim pesan proaktif sebelum pengunjung pergi tanpa bertanya. Widget chat Chatvice juga mendukung pengiriman gambar, video, dan dokumen dalam percakapan, sehingga pembeli bisa mengirim foto produk yang ingin ditanyakan atau supervisor bisa mengirim brosur produk langsung di chat. Dengan <Link href="/pricing" className="text-purple-600 hover:underline">paket yang skalabel</Link>, Chatvice tumbuh bersama toko online Anda dari puluhan chat sehari hingga ribuan.
      </>,
    ],
    features: [
      { icon: Store, title: "Katalog Produk AI", description: "AI mengekstrak dan mempelajari produk Anda otomatis, lalu merekomendasikan produk yang relevan ke pembeli." },
      { icon: Brain, title: "Jawab Pertanyaan Produk Otomatis", description: "Harga, stok, spesifikasi, varian — semua dijawab AI berdasarkan knowledge base toko Anda." },
      { icon: MessageCircle, title: "Widget Chat di Toko", description: "Pasang widget di halaman produk, checkout, dan homepage untuk membantu pembeli di setiap tahap." },
      { icon: HeadphonesIcon, title: "Eskalasi CS Cepat", description: "Keluhan, retur, dan kasus kompleks otomatis dialihkan ke agen CS yang siap membantu." },
      { icon: Zap, title: "Respons Instan 24/7", description: "Tidak ada lagi pembeli yang menunggu — chatbot menjawab dalam kurang dari satu detik, kapan pun." },
      { icon: CheckCircle2, title: "Integrasi Mudah", description: "Kompatibel dengan Shopify, WooCommerce, Tokopedia, Shopee, dan platform e-commerce lainnya." },
    ],
    useCases: [
      "Menjawab pertanyaan stok dan ketersediaan produk secara real-time",
      "Membantu pembeli memilih produk yang sesuai dengan kebutuhan mereka",
      "Menjelaskan cara penggunaan, perawatan, dan garansi produk",
      "Memberikan informasi ongkos kirim dan estimasi pengiriman",
      "Menangani pertanyaan tentang metode pembayaran yang tersedia",
      "Memproses permintaan retur dan komplain awal sebelum ditangani CS",
    ],
    whyChatvice: [
      "AI Product Crawler mengekstrak produk Anda otomatis tanpa input manual",
      "Mendukung upload gambar produk dan dokumen dalam chat",
      "Analitik menunjukkan produk mana yang paling sering ditanyakan",
      "Integrasi Google Sheet untuk update harga dan stok real-time",
      "Quick replies untuk agen CS menjawab pertanyaan berulang lebih cepat",
    ],
    stats: [
      { value: "80%", label: "Pertanyaan produk dijawab tanpa agen manusia" },
      { value: "3x", label: "Peningkatan kapasitas handling CS" },
      { value: "24/7", label: "Toko online Anda tidak pernah tutup" },
      { value: "5 menit", label: "Waktu setup di toko online Anda" },
    ],
    ctaHeading: "Tingkatkan Penjualan Toko Online Anda dengan AI",
    ctaSubtext: "Mulai gratis dan rasakan perbedaannya dalam hari pertama.",
    relatedSlugs: ["chatbot-customer-service", "live-chat-website", "ai-chatbot-gratis", "chatbot-jakarta", "chatbot-surabaya"],
  },
  {
    slug: "ai-chatbot-gratis",
    metaTitle: "Chatbot Gratis untuk Website & Live Chat Gratis Indonesia | Chatvice",
    metaDescription: "Chatbot AI gratis untuk website bisnis Anda. Live chat gratis dengan AI, tidak perlu kartu kredit. Mulai sekarang dan tingkatkan layanan pelanggan.",
    h1: "Chatbot AI Gratis untuk Website — Live Chat Gratis untuk Bisnis Anda",
    subtitle: "Mulai dengan plan gratis Chatvice dan dapatkan chatbot AI bertenaga LEXA1 tanpa biaya apapun.",
    introParagraphs: [
      <>
        Banyak pemilik bisnis beranggapan bahwa chatbot AI berkualitas hanya tersedia untuk perusahaan besar dengan anggaran teknologi yang besar. Anggapan ini tidak lagi benar di tahun 2025. Chatvice menghadirkan plan gratis yang memberikan akses penuh ke teknologi <Link href="/features" className="text-purple-600 hover:underline">LEXA1 AI Engine</Link> — mesin AI yang sama yang digunakan oleh ratusan bisnis aktif di platform kami — tanpa biaya apapun. Tidak perlu kartu kredit, tidak ada trial yang berakhir tiba-tiba, tidak ada fitur yang disembunyikan di balik paywall mengejutkan. Plan gratis Chatvice adalah benar-benar gratis, dan cukup lengkap untuk membuat bisnis Anda mulai merasakan manfaat nyata dari otomasi customer service.
      </>,
      <>
        Dengan plan gratis Chatvice, Anda mendapatkan: satu AI agent bertenaga LEXA1, knowledge base yang bisa diisi dengan informasi bisnis Anda, widget <Link href="/live-chat-website" className="text-purple-600 hover:underline">live chat</Link> yang bisa dipasang di website dengan satu baris kode, dukungan lebih dari 50 bahasa termasuk Bahasa Indonesia, dan akses ke dashboard analitik dasar untuk memantau performa chatbot. Ini sudah lebih dari cukup untuk UMKM, freelancer, startup, komunitas, atau siapa pun yang ingin mulai memberikan pengalaman customer service yang lebih baik kepada pelanggan mereka — tanpa mengeluarkan biaya sepeser pun untuk memulai.
      </>,
      <>
        Berbeda dengan banyak solusi "gratis" di pasaran yang sebenarnya hanya demo terbatas atau live chat manual tanpa AI, chatbot gratis Chatvice menggunakan AI yang sesungguhnya. Ini bukan bot berbasis kata kunci yang hanya bisa menjawab pertanyaan yang sudah diprogramkan persis sama kata per kata. LEXA1 menggunakan semantic search untuk memahami maksud pertanyaan, sehingga bisa menjawab variasi pertanyaan yang berbeda-beda dengan jawaban yang tepat dari knowledge base Anda. Hasilnya: pelanggan mendapat respons yang terasa natural dan informatif, bukan jawaban robot kaku yang membuat frustrasi. Bandingkan ini dengan <Link href="/alternatif-tawkto" className="text-purple-600 hover:underline">Tawk.to gratis</Link> yang sama sekali tidak memiliki AI.
      </>,
      <>
        Ketika bisnis Anda berkembang dan kebutuhan meningkat — lebih banyak agen, lebih banyak percakapan, lebih banyak fitur canggih seperti <Link href="/features" className="text-purple-600 hover:underline">eskalasi ke supervisor</Link>, analitik mendalam, atau integrasi Telegram — upgrade ke paket Starter atau Pro dapat dilakukan dengan satu klik dari dashboard tanpa kehilangan satu pun konfigurasi atau data yang sudah Anda bangun. Lihat <Link href="/pricing" className="text-purple-600 hover:underline">perbandingan lengkap semua paket</Link> untuk memahami apa yang akan Anda dapatkan saat upgrade. Mulai gratis sekarang, dan biarkan hasil yang Anda lihat sendiri yang meyakinkan Anda untuk berkembang bersama Chatvice.
      </>,
    ],
    features: [
      { icon: Zap, title: "Gratis Tanpa Batas Waktu", description: "Plan gratis Chatvice tidak memiliki expiry date. Gunakan selama yang Anda mau tanpa khawatir." },
      { icon: Brain, title: "LEXA1 AI Termasuk", description: "AI engine yang sama dengan plan berbayar — memahami Bahasa Indonesia dan menjawab dengan akurat." },
      { icon: Database, title: "Knowledge Base Dasar", description: "Upload FAQ dan informasi bisnis Anda untuk melatih AI menjawab pertanyaan pelanggan." },
      { icon: MessageCircle, title: "Widget Chat Bisa Dipasang", description: "Pasang widget chat di website dengan satu baris kode, sudah termasuk di plan gratis." },
      { icon: Sparkles, title: "Upgrade Kapan Saja", description: "Ketika bisnis berkembang, upgrade ke Starter atau Pro dengan satu klik tanpa kehilangan data." },
      { icon: BarChart3, title: "Dashboard Analitik", description: "Pantau percakapan dan performa chatbot dari dashboard yang mudah dipahami." },
    ],
    useCases: [
      "UMKM yang baru memulai digitalisasi customer service",
      "Startup yang ingin menguji chatbot AI sebelum berinvestasi",
      "Freelancer dan solopreneur yang ingin website lebih interaktif",
      "Komunitas dan nonprofit yang membutuhkan live chat tanpa anggaran besar",
      "Bisnis musiman yang hanya aktif di periode tertentu",
      "Developer yang ingin mengevaluasi platform sebelum merekomendasikan ke klien",
    ],
    whyChatvice: [
      "Plan gratis sungguh-sungguh gratis — tidak ada kartu kredit yang diminta",
      "Fitur AI tersedia di semua plan termasuk gratis",
      "Upgrade mudah tanpa kehilangan konfigurasi dan data yang ada",
      "Tidak ada iklan atau branding pihak ketiga di widget Anda",
      "Support komunitas tersedia untuk pengguna plan gratis",
    ],
    stats: [
      { value: "Rp 0", label: "Biaya untuk memulai dengan plan gratis" },
      { value: "5 menit", label: "Waktu setup pertama hingga aktif" },
      { value: "50+", label: "Bahasa yang didukung AI bahkan di plan gratis" },
      { value: "0", label: "Kartu kredit yang diperlukan" },
    ],
    ctaHeading: "Mulai Gratis Sekarang — Tidak Perlu Kartu Kredit",
    ctaSubtext: "Daftar dalam 30 detik dan chatbot AI Anda langsung aktif.",
    relatedSlugs: ["chatbot-customer-service", "live-chat-website", "alternatif-tawkto", "chatbot-pendidikan", "chatbot-restoran"],
  },
  {
    slug: "alternatif-tawkto",
    metaTitle: "Alternatif Tawk.to Terbaik di Indonesia — Chatvice vs Tawk.to | Chatvice",
    metaDescription: "Cari alternatif Tawk.to? Chatvice hadir dengan AI chatbot, knowledge base, dan eskalasi manusia yang tidak dimiliki Tawk.to. Coba gratis sekarang.",
    h1: "Alternatif Tawk.to Terbaik — AI Chatbot yang Tidak Ada di Tawk.to",
    subtitle: "Tawk.to bagus untuk live chat dasar, tapi Chatvice memberikan AI otomasi, knowledge base, dan analitik yang bisnis Anda butuhkan untuk berkembang.",
    introParagraphs: [
      <>
        Tawk.to adalah pilihan yang sangat populer untuk live chat gratis, dan memang ada alasan kuat di balik popularitasnya — mudah dipasang, benar-benar gratis selamanya, dan cukup fungsional untuk kebutuhan live chat manual yang mendasar. Banyak bisnis Indonesia memulai customer service digital mereka dengan Tawk.to. Namun seiring tumbuhnya bisnis, keterbatasan Tawk.to mulai terasa: tidak ada AI yang bisa menjawab otomatis saat agen offline, tidak ada knowledge base terstruktur yang bisa dilatih, analitik yang sangat terbatas, dan tim Anda tetap harus standby di depan layar untuk setiap percakapan yang masuk — bahkan di tengah malam atau hari libur.
      </>,
      <>
        Chatvice hadir sebagai alternatif Tawk.to yang menghadirkan apa yang paling dibutuhkan bisnis yang berkembang: kecerdasan buatan yang sesungguhnya. Dengan <Link href="/features" className="text-purple-600 hover:underline">LEXA1 AI Engine</Link>, chatbot Chatvice menjawab pertanyaan pelanggan secara otomatis berdasarkan knowledge base yang Anda bangun sendiri — tanpa agen manusia yang harus standby. Ketika pelanggan membutuhkan bantuan lebih lanjut, sistem eskalasi cerdas mengalihkan percakapan ke supervisor manusia yang sudah menerima konteks lengkap, sehingga tidak perlu menanyakan ulang dari awal. Ini adalah pengalaman yang jauh lebih baik dibanding live chat Tawk.to yang sering menampilkan status "Offline" kepada pelanggan di luar jam kerja.
      </>,
      <>
        Perbedaan paling signifikan antara Tawk.to dan Chatvice ada pada kemampuan manajemen pengetahuan. Di Tawk.to, agen harus menjawab setiap pertanyaan secara manual, mengandalkan ingatan atau catatan pribadi. Di Chatvice, seluruh pengetahuan bisnis Anda — FAQ, spesifikasi produk, kebijakan layanan, SOP — disimpan dalam <Link href="/features" className="text-purple-600 hover:underline">knowledge base terstruktur</Link> yang bisa diakses AI secara instan. AI bahkan bisa mengekstrak konten dari website Anda secara otomatis menggunakan web crawler bawaan Chatvice. Ditambah dengan fitur analitik mendalam yang menunjukkan topik pertanyaan terbanyak, tingkat resolusi AI, dan pola pertanyaan pelanggan — sesuatu yang tidak tersedia di Tawk.to.
      </>,
      <>
        Bagi bisnis yang sudah menggunakan Tawk.to, migrasi ke Chatvice sangat mudah. Cukup salin satu baris kode widget baru ke website Anda, isi knowledge base dengan informasi bisnis yang sudah Anda miliki, dan chatbot AI Anda siap beroperasi dalam hitungan menit. Anda tidak perlu menonaktifkan Tawk.to terlebih dahulu — bisa berjalan paralel selama masa transisi. Dengan <Link href="/pricing" className="text-purple-600 hover:underline">plan gratis</Link> yang tersedia, tidak ada risiko finansial untuk mencoba. Lihat juga perbandingan fitur lengkap kami di halaman <Link href="/vs/tawkto" className="text-purple-600 hover:underline">Chatvice vs Tawk.to</Link> untuk memahami secara detail mengapa ratusan bisnis memilih beralih ke Chatvice.
      </>,
    ],
    features: [
      { icon: Brain, title: "AI Menjawab Otomatis", description: "Tidak seperti Tawk.to yang hanya live chat, Chatvice menggunakan AI untuk menjawab tanpa agen standby." },
      { icon: Database, title: "Knowledge Base Terstruktur", description: "Upload dokumen, FAQ, dan SOP bisnis Anda untuk melatih AI — fitur yang tidak ada di Tawk.to." },
      { icon: HeadphonesIcon, title: "Eskalasi Cerdas", description: "AI tahu kapan harus menyerahkan percakapan ke manusia — berdasarkan kata kunci, sentimen, atau permintaan langsung." },
      { icon: Globe, title: "Bahasa Indonesia First-Class", description: "Chatvice dirancang untuk bisnis Indonesia dengan dukungan Bahasa Indonesia yang benar-benar akurat." },
      { icon: BarChart3, title: "Analitik Mendalam", description: "Dashboard analitik Chatvice jauh lebih dalam dari Tawk.to — dari topik pertanyaan hingga tingkat resolusi AI." },
      { icon: MessageCircle, title: "Widget Bisa Dikustomisasi", description: "Kustomisasi penuh warna, avatar, pesan, dan fitur widget sesuai brand Anda — lebih fleksibel dari Tawk.to." },
    ],
    useCases: [
      "Bisnis yang menggunakan Tawk.to tapi kewalahan dengan volume chat",
      "Tim yang ingin mengurangi jam kerja menjawab pertanyaan berulang",
      "Toko online yang membutuhkan rekomendasi produk otomatis",
      "Bisnis yang ingin chatbot aktif di luar jam kerja tanpa biaya tambahan",
      "Perusahaan yang membutuhkan analitik lebih mendalam dari sekedar jumlah chat",
      "Bisnis yang ingin satu platform untuk AI dan agen manusia",
    ],
    whyChatvice: [
      "AI chatbot yang benar-benar otomatis — bukan hanya live chat manual seperti Tawk.to",
      "Knowledge base dengan semantic search yang jauh lebih pintar",
      "Tidak perlu agen selalu online — AI menangani 80%+ pertanyaan sendiri",
      "Harga kompetitif dengan fitur yang jauh melampaui Tawk.to",
      "Dibuat untuk bisnis Indonesia dengan support dalam Bahasa Indonesia",
    ],
    stats: [
      { value: "80%+", label: "Pertanyaan dijawab AI tanpa agen manusia" },
      { value: "3x", label: "Lebih efisien dibanding live chat manual" },
      { value: "5 menit", label: "Migrasi dari Tawk.to ke Chatvice" },
      { value: "24/7", label: "AI aktif bahkan di luar jam kerja" },
    ],
    ctaHeading: "Beralih dari Tawk.to ke Chatvice — Gratis",
    ctaSubtext: "Migrasi mudah dalam 5 menit. Tidak perlu kartu kredit.",
    relatedSlugs: ["ai-chatbot-gratis", "chatbot-customer-service", "live-chat-website", "chatbot-jakarta", "chatbot-klinik"],
  },
];

// ─── City-specific pages ───────────────────────────────────────────────────

export const cityPagesData: SolutionPageData[] = [
  {
    slug: "chatbot-jakarta",
    metaTitle: "Chatbot Customer Service Jakarta — AI untuk Bisnis Ibukota | Chatvice",
    metaDescription: "Chatbot AI customer service terbaik untuk bisnis Jakarta. Otomasi layanan pelanggan 24/7, hemat biaya CS, tingkatkan kepuasan pelanggan. Coba gratis.",
    h1: "Chatbot Customer Service Jakarta — Solusi AI untuk Bisnis Ibukota",
    subtitle: "Ribuan bisnis di Jakarta sudah beralih ke AI untuk layanan pelanggan. Giliran bisnis Anda memimpin dengan chatbot yang benar-benar cerdas.",
    introParagraphs: [
      <>
        Jakarta adalah pusat ekonomi Indonesia dengan lebih dari 30 juta penduduk di area Jabodetabek. Di kota ini, persaingan bisnis sangat ketat — pelanggan memiliki banyak pilihan dan ekspektasi mereka terhadap kualitas layanan sangat tinggi. Studi pasar menunjukkan bahwa konsumen Jakarta adalah yang paling digital-savvy di Indonesia: mereka terbiasa berbelanja online, membandingkan produk via WhatsApp, dan mengharapkan respons dalam hitungan menit, bukan jam. Bisnis yang tidak bisa memenuhi standar ini kehilangan pelanggan ke kompetitor yang lebih responsif.
      </>,
      <>
        Chatvice hadir sebagai solusi <Link href="/chatbot-customer-service" className="text-purple-600 hover:underline">chatbot customer service</Link> yang dirancang untuk kecepatan dan kecerdasan yang dibutuhkan bisnis Jakarta. Dengan <Link href="/features" className="text-purple-600 hover:underline">LEXA1 AI Engine</Link>, chatbot Anda merespons pertanyaan pelanggan dalam kurang dari satu detik — kapan pun, termasuk tengah malam saat tim CS Anda sedang offline. Tidak ada lagi pesan yang dibiarkan tidak terbalas selama berjam-jam. Bagi bisnis Jakarta yang melayani pelanggan dari Senin sampai Minggu tanpa henti, ini adalah keunggulan kompetitif yang nyata.
      </>,
      <>
        Bisnis Jakarta dari berbagai sektor — mulai dari startup teknologi di Sudirman, toko fashion di Kemang, restoran di PIK, hingga klinik kecantikan di Kelapa Gading — sudah membuktikan bahwa chatbot AI dapat memangkas biaya operasional CS hingga 60% sambil meningkatkan kepuasan pelanggan. Dengan knowledge base yang diisi informasi spesifik bisnis Anda — jam buka, lokasi, menu atau katalog, SOP layanan — AI dapat menjawab hampir semua pertanyaan umum secara akurat tanpa perlu agen manusia. Dan ketika ada kasus yang memerlukan keputusan manusia, sistem eskalasi otomatis Chatvice memastikan percakapan dialihkan ke agen yang tepat di <Link href="/features" className="text-purple-600 hover:underline">supervisor panel</Link> real-time.
      </>,
      <>
        Bagi bisnis Jakarta yang ingin memantau pengunjung website secara proaktif, fitur <Link href="/features" className="text-purple-600 hover:underline">Live Visitor Tracking</Link> Chatvice memungkinkan supervisor melihat pengunjung aktif secara real-time — termasuk halaman yang sedang dibuka — dan mengirim pesan proaktif sebelum mereka pergi tanpa bertanya. Ini sangat berguna untuk bisnis B2B Jakarta yang ingin mengkonversi prospek korporat dari situs web. Dengan <Link href="/pricing" className="text-purple-600 hover:underline">harga mulai dari gratis</Link>, tidak ada alasan untuk menunda digitalisasi customer service bisnis Anda di Jakarta.
      </>,
    ],
    features: [
      { icon: Zap, title: "Respons Instan 24/7", description: "Melayani pelanggan Jakarta kapan pun tanpa jeda — termasuk weekend dan hari libur nasional." },
      { icon: Brain, title: "Memahami Bahasa Indonesia", description: "AI memahami bahasa informal, singkatan, dan campuran Indonesia-Inggris yang umum di Jakarta." },
      { icon: Users, title: "Skalabel untuk Volume Tinggi", description: "Tangani ratusan percakapan serentak tanpa menambah tim CS — cocok untuk bisnis dengan traffic tinggi." },
      { icon: HeadphonesIcon, title: "Eskalasi ke Agen Manusia", description: "Kasus kompleks otomatis dialihkan ke agen manusia dengan konteks percakapan yang lengkap." },
      { icon: Globe, title: "Pantau Pengunjung Real-Time", description: "Lihat siapa yang ada di website Anda sekarang dan kirim pesan proaktif ke prospek potensial." },
      { icon: BarChart3, title: "Analitik Performa CS", description: "Dashboard analitik untuk memantau volume chat, tingkat resolusi, dan kepuasan pelanggan." },
    ],
    useCases: [
      "Startup teknologi dan SaaS yang melayani pelanggan korporat di Jakarta",
      "Toko retail dan fashion yang ingin menjawab pertanyaan produk otomatis",
      "Restoran dan F&B yang menerima reservasi dan pertanyaan menu",
      "Klinik kecantikan dan kesehatan yang membutuhkan booking otomatis",
      "Properti dan developer yang menjawab pertanyaan unit dan KPR",
      "Jasa pengiriman dan logistik yang melacak status paket pelanggan",
    ],
    whyChatvice: [
      "Satu-satunya chatbot AI dengan dukungan Bahasa Indonesia yang benar-benar akurat",
      "Setup dalam 5 menit — tidak perlu developer atau coding",
      "Dukungan teknis dari tim yang memahami kebutuhan bisnis Indonesia",
      "Harga kompetitif dengan ROI yang terukur sejak bulan pertama",
      "Terintegrasi dengan WhatsApp, Telegram, dan platform komunikasi populer",
    ],
    stats: [
      { value: "30 juta+", label: "Penduduk area Jabodetabek yang bisa dijangkau" },
      { value: "60%", label: "Penghematan biaya CS dengan otomasi AI" },
      { value: "<1 detik", label: "Waktu respons chatbot" },
      { value: "24/7", label: "Aktif tanpa biaya tambahan" },
    ],
    ctaHeading: "Tingkatkan Layanan Pelanggan Bisnis Jakarta Anda",
    ctaSubtext: "Mulai gratis hari ini. Setup dalam 5 menit, tidak perlu kartu kredit.",
    relatedSlugs: ["chatbot-surabaya", "chatbot-bandung", "chatbot-customer-service", "chatbot-restoran"],
  },
  {
    slug: "chatbot-surabaya",
    metaTitle: "Chatbot Customer Service Surabaya — AI untuk Bisnis Surabaya | Chatvice",
    metaDescription: "Chatbot AI customer service untuk bisnis Surabaya. Otomasi CS, respons 24/7, hemat biaya layanan pelanggan. Platform terbaik untuk bisnis Jawa Timur.",
    h1: "Chatbot Customer Service Surabaya — AI untuk Bisnis Jawa Timur",
    subtitle: "Bisnis Surabaya yang responsif menang persaingan. Chatbot AI Chatvice memastikan tidak ada satu pun pertanyaan pelanggan yang tidak terjawab.",
    introParagraphs: [
      <>
        Surabaya adalah kota bisnis terbesar kedua di Indonesia dan pusat ekonomi Jawa Timur. Dengan populasi lebih dari 3 juta jiwa dan ekosistem bisnis yang sangat aktif — mulai dari perdagangan, manufaktur, kuliner, hingga startup digital — Surabaya menjadi salah satu kota dengan pertumbuhan e-commerce dan digitalisasi bisnis tercepat di Indonesia. Pelanggan Surabaya dikenal loyal, tapi juga tidak segan berpindah ke kompetitor jika layanan dinilai lambat atau tidak memuaskan. Di sinilah chatbot AI menjadi diferensiasi yang nyata.
      </>,
      <>
        Chatvice memungkinkan bisnis Surabaya memberikan pengalaman <Link href="/chatbot-customer-service" className="text-purple-600 hover:underline">customer service</Link> kelas enterprise tanpa harus membangun tim CS yang besar. Dengan mengisi knowledge base menggunakan informasi produk, kebijakan layanan, dan FAQ spesifik bisnis Anda, <Link href="/features" className="text-purple-600 hover:underline">LEXA1 AI Engine</Link> siap menjawab pertanyaan pelanggan dalam bahasa yang natural — termasuk campuran Bahasa Indonesia dan logat Jawa Timur yang sering muncul dalam percakapan sehari-hari. Tidak ada pertanyaan yang terlewat, tidak ada pelanggan yang menunggu terlalu lama.
      </>,
      <>
        Untuk bisnis Surabaya yang beroperasi di sektor perdagangan dan retail — yang merupakan tulang punggung ekonomi kota ini — chatbot AI Chatvice mampu menjawab pertanyaan tentang ketersediaan stok, harga grosir, cara pemesanan, dan status pengiriman secara otomatis. Fitur <Link href="/features" className="text-purple-600 hover:underline">Google Sheet Transaction Lookup</Link> memungkinkan pelanggan menanyakan status transaksi mereka langsung di chat, dan AI mengambil data real-time dari spreadsheet Anda. Ini sangat berguna untuk bisnis perdagangan Surabaya yang masih mengelola data di Google Sheet.
      </>,
      <>
        Fitur supervisor panel real-time Chatvice memungkinkan tim CS Surabaya memantau semua percakapan aktif dari satu dashboard, mengambil alih chat dari AI kapan saja, dan berkolaborasi dalam menangani pelanggan. Supervisor bahkan dapat menerima notifikasi eskalasi langsung di Telegram — tanpa harus selalu membuka dashboard. Dengan <Link href="/pricing" className="text-purple-600 hover:underline">harga yang terjangkau</Link> dan plan gratis untuk memulai, Chatvice adalah investasi terbaik untuk bisnis Surabaya yang ingin tumbuh efisien.
      </>,
    ],
    features: [
      { icon: MessageCircle, title: "Bahasa Lokal Dipahami", description: "AI memahami variasi bahasa dan logat yang digunakan pelanggan Surabaya dan Jawa Timur." },
      { icon: Store, title: "Cocok untuk Bisnis Perdagangan", description: "Otomasi pertanyaan stok, harga, pemesanan, dan pengiriman untuk bisnis perdagangan Surabaya." },
      { icon: Brain, title: "Knowledge Base Cerdas", description: "Isi AI dengan katalog produk, SOP, dan FAQ bisnis Anda — AI menjawab berdasarkan data nyata." },
      { icon: Zap, title: "Respons Tanpa Jeda", description: "Pelanggan mendapat jawaban instan kapan pun — termasuk saat jam sibuk dan di luar jam kerja." },
      { icon: HeadphonesIcon, title: "Supervisor Panel Real-Time", description: "Tim CS Surabaya bisa memantau dan mengambil alih percakapan dari dashboard terpusat." },
      { icon: Shield, title: "Keamanan Data Terjamin", description: "Data pelanggan dienkripsi dan aman — penting untuk bisnis yang menangani data sensitif." },
    ],
    useCases: [
      "Bisnis perdagangan dan distribusi yang menerima banyak pertanyaan harga dan stok",
      "UMKM Surabaya yang ingin mulai otomasi CS tanpa biaya besar",
      "Kuliner dan F&B yang menerima reservasi dan pertanyaan menu",
      "Bisnis retail fashion dan aksesori yang melayani pembeli online",
      "Jasa ekspedisi dan logistik Jawa Timur yang melacak paket pelanggan",
      "Klinik dan layanan kesehatan yang membutuhkan booking otomatis",
    ],
    whyChatvice: [
      "Dukungan Bahasa Indonesia termasuk variasi bahasa lokal Jawa Timur",
      "Tidak perlu programmer — konfigurasi lengkap dari dashboard",
      "Skalabel dari UMKM hingga perusahaan besar tanpa ganti platform",
      "Integrasi WhatsApp untuk eskalasi ke percakapan personal",
      "Plan gratis tersedia — mulai tanpa risiko finansial",
    ],
    stats: [
      { value: "3 juta+", label: "Penduduk kota Surabaya" },
      { value: "85%", label: "Pertanyaan diselesaikan AI tanpa agen manusia" },
      { value: "5 menit", label: "Waktu setup chatbot pertama" },
      { value: "24/7", label: "Layanan aktif tanpa biaya operasional tambahan" },
    ],
    ctaHeading: "Jadikan Bisnis Surabaya Anda Lebih Responsif",
    ctaSubtext: "Mulai gratis hari ini. Tidak perlu kartu kredit.",
    relatedSlugs: ["chatbot-jakarta", "chatbot-bandung", "chatbot-customer-service", "chatbot-toko-online"],
  },
  {
    slug: "chatbot-bandung",
    metaTitle: "Chatbot Customer Service Bandung — AI untuk Bisnis Bandung | Chatvice",
    metaDescription: "Chatbot AI customer service untuk bisnis Bandung. Ideal untuk fashion, kuliner, wisata, dan UMKM. Otomasi CS 24/7 mulai gratis.",
    h1: "Chatbot Customer Service Bandung — AI untuk Bisnis Kreatif dan UMKM",
    subtitle: "Bandung adalah kota kreatif Indonesia. Biarkan AI menangani customer service sehingga Anda bisa fokus pada inovasi dan produk.",
    introParagraphs: [
      <>
        Bandung dikenal sebagai kota kreatif Indonesia — pusat fashion, kuliner, wisata, dan ekonomi kreatif yang terus berkembang. Dari distro lokal di Dago, kafe aesthetic di Setiabudi, hingga brand fashion lokal yang sudah menembus pasar nasional — bisnis Bandung identik dengan kreativitas dan kualitas. Namun di balik produk yang inovatif, satu tantangan yang selalu ada adalah: bagaimana melayani pelanggan yang semakin banyak dan semakin demanding, tanpa kehilangan sentuhan personal yang menjadi ciri khas bisnis Bandung.
      </>,
      <>
        Chatvice hadir sebagai solusi yang memungkinkan bisnis Bandung tetap personal sekaligus efisien. <Link href="/features" className="text-purple-600 hover:underline">LEXA1 AI Engine</Link> dilatih dengan informasi spesifik bisnis Anda — koleksi produk, kebijakan pengiriman, jadwal toko, atau menu kafe — dan siap menjawab pertanyaan pelanggan dengan gaya komunikasi yang bisa disesuaikan dengan brand voice Anda. Widget <Link href="/live-chat-website" className="text-purple-600 hover:underline">live chat</Link> Chatvice dapat dikustomisasi penuh: warna, avatar AI, pesan sambutan, hingga pertanyaan yang disarankan — semuanya mencerminkan identitas brand Anda.
      </>,
      <>
        Untuk bisnis fashion dan retail Bandung yang aktif di media sosial dan marketplace, chatbot Chatvice menjadi jembatan antara traffic online dengan konversi penjualan. Widget chat yang dipasang di website toko Anda memungkinkan calon pembeli bertanya tentang ketersediaan ukuran, bahan, warna, dan cara perawatan produk secara instan — tanpa harus mengirim DM Instagram yang antrinya bisa panjang. Fitur <Link href="/features" className="text-purple-600 hover:underline">AI Product Catalog Crawler</Link> bahkan bisa mengekstrak informasi produk dari website Anda secara otomatis, sehingga knowledge base selalu up-to-date tanpa input manual.
      </>,
      <>
        UMKM Bandung yang baru memulai digitalisasi dapat memulai dengan <Link href="/ai-chatbot-gratis" className="text-purple-600 hover:underline">plan gratis Chatvice</Link> — yang sudah mencakup AI chatbot bertenaga LEXA1, widget chat yang bisa dipasang di website, dan dashboard analitik dasar. Ketika bisnis berkembang, upgrade ke plan Starter atau Pro cukup satu klik, tanpa kehilangan konfigurasi atau data yang sudah dibangun. Ini adalah fondasi teknologi customer service yang akan tumbuh bersama bisnis Bandung Anda.
      </>,
    ],
    features: [
      { icon: Sparkles, title: "Widget Bisa Dikustomisasi Penuh", description: "Sesuaikan tampilan widget dengan brand bisnis Bandung Anda — warna, avatar, pesan, dan lebih banyak lagi." },
      { icon: Store, title: "Cocok untuk Fashion & Retail", description: "Jawab pertanyaan ukuran, bahan, ketersediaan, dan pengiriman produk secara otomatis 24/7." },
      { icon: Brain, title: "AI yang Memahami Konteks", description: "LEXA1 memahami variasi pertanyaan dan menjawab berdasarkan knowledge base bisnis Anda." },
      { icon: MessageCircle, title: "Integrasi WhatsApp", description: "Widget menampilkan tombol WhatsApp untuk eskalasi mudah ke percakapan personal." },
      { icon: Zap, title: "Setup Mudah untuk UMKM", description: "Tidak perlu developer — pasang widget dan isi knowledge base dari dashboard yang intuitif." },
      { icon: BarChart3, title: "Analitik Penjualan & CS", description: "Pantau pertanyaan terbanyak untuk mengidentifikasi peluang peningkatan produk dan layanan." },
    ],
    useCases: [
      "Brand fashion lokal Bandung yang ingin menjawab pertanyaan produk otomatis",
      "Kafe dan restoran yang menerima reservasi dan pertanyaan menu",
      "Bisnis wisata Bandung yang melayani pemesanan paket perjalanan",
      "UMKM kreatif yang baru memulai digitalisasi customer service",
      "Distro dan brand streetwear yang melayani pelanggan dari seluruh Indonesia",
      "Jasa laundry, salon, dan kecantikan yang butuh booking otomatis",
    ],
    whyChatvice: [
      "Widget yang dapat dikustomisasi penuh sesuai estetika brand kreatif Bandung",
      "Plan gratis yang benar-benar lengkap untuk UMKM yang baru mulai",
      "AI Product Crawler untuk update katalog produk otomatis",
      "Dukungan gambar dan media dalam chat — bagus untuk bisnis visual seperti fashion",
      "Tidak ada kontrak jangka panjang — fleksibel sesuai musim bisnis",
    ],
    stats: [
      { value: "2,5 juta+", label: "Penduduk kota Bandung" },
      { value: "40%", label: "Peningkatan konversi website dengan live chat" },
      { value: "Rp 0", label: "Biaya untuk memulai dengan plan gratis" },
      { value: "5 menit", label: "Waktu pemasangan widget di website" },
    ],
    ctaHeading: "Biarkan AI Menangani CS, Anda Fokus Berkreasi",
    ctaSubtext: "Mulai gratis sekarang. Tidak perlu kartu kredit.",
    relatedSlugs: ["chatbot-jakarta", "chatbot-surabaya", "chatbot-toko-online", "ai-chatbot-gratis"],
  },
  {
    slug: "chatbot-medan",
    metaTitle: "Chatbot Customer Service Medan — AI untuk Bisnis Sumatera Utara | Chatvice",
    metaDescription: "Chatbot AI customer service untuk bisnis Medan. Otomasi layanan pelanggan untuk perdagangan, kuliner, dan UMKM Sumatera Utara. Mulai gratis.",
    h1: "Chatbot Customer Service Medan — AI untuk Bisnis Sumatera Utara",
    subtitle: "Medan adalah gerbang ekonomi Sumatera. Berikan pengalaman customer service kelas Jakarta dengan chatbot AI Chatvice — tanpa menambah tim.",
    introParagraphs: [
      <>
        Medan adalah kota terbesar ketiga di Indonesia dan pusat perdagangan utama di Pulau Sumatera. Dengan populasi lebih dari 2,5 juta jiwa di area kota dan lebih dari 4 juta di area metropolitan Mebidangro, Medan adalah pasar yang sangat dinamis untuk berbagai jenis bisnis — mulai dari grosir dan distributor, kuliner khas seperti durian dan bika ambon, hingga jasa perjalanan menuju Danau Toba dan Berastagi. Pelanggan Medan dikenal komunikatif dan terbiasa bertanya detail sebelum membeli — ini berarti volume chat masuk untuk bisnis Medan cenderung tinggi setiap harinya.
      </>,
      <>
        Chatvice menghadirkan <Link href="/chatbot-customer-service" className="text-purple-600 hover:underline">chatbot customer service</Link> bertenaga <Link href="/features" className="text-purple-600 hover:underline">LEXA1 AI Engine</Link> yang siap menjawab pertanyaan pelanggan Medan dalam bahasa natural — termasuk campuran Bahasa Indonesia dengan istilah lokal yang umum digunakan masyarakat Sumatera Utara. Dengan mengisi knowledge base menggunakan informasi spesifik bisnis Anda — mulai dari katalog produk, harga grosir, jam operasional, hingga prosedur pengiriman ke kota-kota di Sumatera — AI Anda dapat melayani pertanyaan rutin secara akurat 24 jam sehari, tanpa pernah istirahat.
      </>,
      <>
        Untuk bisnis perdagangan dan distribusi Medan yang melayani pelanggan dari seluruh Sumatera, fitur <Link href="/features" className="text-purple-600 hover:underline">Google Sheet Transaction Lookup</Link> Chatvice memungkinkan pelanggan menanyakan status pesanan atau ketersediaan stok langsung di chat — AI mengambil data real-time dari Google Sheet bisnis Anda dan menjawab dengan informasi yang akurat. Ini sangat berguna untuk grosir Medan yang masih mengelola katalog dan inventory di spreadsheet. Sistem <Link href="/features" className="text-purple-600 hover:underline">eskalasi otomatis</Link> juga memastikan permintaan negosiasi harga grosir atau keluhan pengiriman langsung dialihkan ke staff yang berwenang.
      </>,
      <>
        Bisnis kuliner dan oleh-oleh Medan yang menerima pesanan dari seluruh Indonesia akan sangat terbantu dengan widget <Link href="/live-chat-website" className="text-purple-600 hover:underline">live chat</Link> Chatvice yang dipasang di website mereka. Calon pembeli yang mencari informasi tentang ketahanan produk, biaya pengiriman ke kota mereka, atau cara pemesanan akan mendapat jawaban instan — bahkan saat tim Anda sedang sibuk menerima orderan. Dengan <Link href="/pricing" className="text-purple-600 hover:underline">paket fleksibel</Link> mulai dari gratis, Chatvice adalah investasi cerdas untuk bisnis Medan yang ingin tumbuh tanpa kewalahan.
      </>,
    ],
    features: [
      { icon: Store, title: "Cocok untuk Perdagangan & Grosir", description: "Otomasi pertanyaan harga, stok, minimum order, dan pengiriman untuk bisnis perdagangan Medan." },
      { icon: Brain, title: "AI Memahami Bahasa Lokal", description: "LEXA1 memahami variasi Bahasa Indonesia dan istilah lokal yang umum di Sumatera Utara." },
      { icon: Globe, title: "Layani Pelanggan Lintas Pulau", description: "Jawab pertanyaan ongkos kirim ke seluruh Indonesia secara otomatis tanpa repot manual." },
      { icon: MessageCircle, title: "Integrasi WhatsApp", description: "Widget menampilkan tombol WhatsApp untuk eskalasi mudah ke percakapan personal dengan sales." },
      { icon: Clock, title: "Respons Tanpa Jeda", description: "Pelanggan dari Aceh hingga Lampung mendapat jawaban instan kapan pun mereka bertanya." },
      { icon: HeadphonesIcon, title: "Eskalasi ke Tim Sales", description: "Kasus negosiasi atau order besar otomatis dialihkan ke staff yang siap closing." },
    ],
    useCases: [
      "Grosir dan distributor yang melayani toko-toko di seluruh Sumatera",
      "Bisnis kuliner dan oleh-oleh Medan yang menerima pesanan online",
      "Jasa perjalanan ke Danau Toba, Berastagi, dan destinasi wisata Sumatera Utara",
      "UMKM kuliner khas Medan yang mulai melayani pasar nasional",
      "Toko fashion dan retail yang melayani pembeli online dari berbagai kota",
      "Klinik dan jasa kesehatan yang menerima pertanyaan jadwal dokter",
    ],
    whyChatvice: [
      "Dukungan Bahasa Indonesia yang akurat termasuk istilah lokal Sumatera",
      "Setup tanpa coding — semua konfigurasi dari dashboard yang intuitif",
      "Integrasi Google Sheet untuk update stok dan harga real-time",
      "Plan gratis tersedia — mulai tanpa investasi awal",
      "Skalabel dari UMKM hingga bisnis distribusi besar Sumatera",
    ],
    stats: [
      { value: "2,5 juta+", label: "Penduduk kota Medan" },
      { value: "4 juta+", label: "Penduduk area metropolitan Mebidangro" },
      { value: "70%", label: "Pertanyaan dijawab AI tanpa agen manusia" },
      { value: "24/7", label: "Layanan aktif tanpa biaya operasional tambahan" },
    ],
    ctaHeading: "Modernisasi Layanan Pelanggan Bisnis Medan Anda",
    ctaSubtext: "Mulai gratis hari ini. Setup dalam 5 menit, tidak perlu kartu kredit.",
    relatedSlugs: ["chatbot-jakarta", "chatbot-makassar", "chatbot-customer-service", "chatbot-toko-online"],
  },
  {
    slug: "chatbot-makassar",
    metaTitle: "Chatbot Customer Service Makassar — AI untuk Bisnis Sulawesi | Chatvice",
    metaDescription: "Chatbot AI customer service untuk bisnis Makassar. Otomasi layanan pelanggan untuk pelabuhan, kuliner, dan distribusi Indonesia Timur. Mulai gratis.",
    h1: "Chatbot Customer Service Makassar — AI untuk Bisnis Indonesia Timur",
    subtitle: "Makassar adalah hub ekonomi Indonesia Timur. Saatnya bisnis Anda melayani pelanggan dari Sulawesi hingga Papua dengan AI yang aktif 24 jam.",
    introParagraphs: [
      <>
        Makassar adalah pusat ekonomi, perdagangan, dan transportasi terbesar di Indonesia Timur. Dengan populasi lebih dari 1,4 juta jiwa di kota dan lebih dari 2,7 juta di area metropolitan Mamminasata, Makassar menjadi gerbang utama bagi distribusi barang ke seluruh Sulawesi, Maluku, Nusa Tenggara, dan Papua. Bisnis Makassar yang ingin tumbuh tidak hanya melayani pelanggan lokal — mereka harus siap melayani pertanyaan dari pelanggan yang tersebar di ribuan pulau Indonesia Timur, dengan zona waktu dan kebiasaan komunikasi yang beragam.
      </>,
      <>
        Chatvice memungkinkan bisnis Makassar memberikan <Link href="/chatbot-customer-service" className="text-purple-600 hover:underline">layanan pelanggan kelas enterprise</Link> tanpa harus membangun tim CS yang besar di setiap zona waktu. <Link href="/features" className="text-purple-600 hover:underline">LEXA1 AI Engine</Link> menjawab pertanyaan pelanggan dalam bahasa natural — termasuk Bahasa Indonesia dengan logat lokal Bugis-Makassar yang sering muncul. Pelanggan dari Manado, Ambon, Kupang, hingga Jayapura yang mengirim pertanyaan di luar jam kerja Makassar tetap mendapat respons instan dan akurat berdasarkan knowledge base yang Anda isi.
      </>,
      <>
        Untuk bisnis perdagangan dan distribusi Makassar yang menjadi tulang punggung logistik Indonesia Timur, fitur <Link href="/features" className="text-purple-600 hover:underline">Google Sheet Transaction Lookup</Link> sangat berharga — pelanggan dapat menanyakan status pengiriman atau ketersediaan stok dan AI mengambil data real-time dari spreadsheet Anda. Bisnis kuliner Makassar yang menjual coto, konro, dan pisang ijo via pengiriman ke seluruh Indonesia juga dapat memanfaatkan AI untuk menjawab pertanyaan ketahanan produk, biaya kirim, dan cara pemesanan secara otomatis. Sistem <Link href="/features" className="text-purple-600 hover:underline">eskalasi pintar</Link> memastikan kasus penting tetap mendapat sentuhan manusia.
      </>,
      <>
        Widget <Link href="/live-chat-website" className="text-purple-600 hover:underline">live chat</Link> Chatvice dapat dipasang di website bisnis Makassar dengan satu baris kode — kompatibel dengan WordPress, Shopify, Wix, dan platform lainnya. Untuk UMKM yang baru memulai digitalisasi, <Link href="/ai-chatbot-gratis" className="text-purple-600 hover:underline">plan gratis Chatvice</Link> sudah cukup lengkap untuk menangani pertanyaan dasar pelanggan. Dengan harga yang terjangkau dan dukungan tim berbasis Indonesia, Chatvice adalah pilihan terbaik untuk bisnis Makassar yang ingin tumbuh efisien dan profesional.
      </>,
    ],
    features: [
      { icon: Globe, title: "Layani Pelanggan Lintas Zona Waktu", description: "AI aktif 24/7 melayani pelanggan dari WIB hingga WIT tanpa kebutuhan staff malam." },
      { icon: Brain, title: "Memahami Logat Lokal", description: "LEXA1 memahami variasi Bahasa Indonesia dengan logat Bugis-Makassar dan dialek Sulawesi." },
      { icon: Store, title: "Cocok untuk Distribusi & Logistik", description: "Otomasi pertanyaan stok, harga, dan status pengiriman ke seluruh Indonesia Timur." },
      { icon: Zap, title: "Respons Instan", description: "Pelanggan dari Manado hingga Jayapura mendapat jawaban dalam hitungan detik." },
      { icon: HeadphonesIcon, title: "Eskalasi ke Sales", description: "Kasus negosiasi atau order besar otomatis dialihkan ke tim sales Anda." },
      { icon: BarChart3, title: "Analitik Pertanyaan Pelanggan", description: "Pantau pertanyaan terbanyak untuk mengoptimalkan layanan dan katalog produk." },
    ],
    useCases: [
      "Distributor dan grosir yang melayani pasar Sulawesi, Maluku, dan Papua",
      "Bisnis kuliner Makassar yang menerima pesanan oleh-oleh online",
      "Jasa pengiriman dan logistik yang melayani Indonesia Timur",
      "UMKM kerajinan dan fashion yang melayani pembeli online lintas pulau",
      "Toko hasil laut dan rempah yang melayani pembeli dari kota lain",
      "Klinik dan jasa kesehatan yang menerima pertanyaan jadwal dan layanan",
    ],
    whyChatvice: [
      "AI aktif 24/7 — penting untuk melayani pelanggan dari WIB hingga WIT",
      "Dukungan Bahasa Indonesia dengan pemahaman logat lokal Sulawesi",
      "Integrasi Google Sheet — solusi praktis untuk distributor dan grosir",
      "Plan gratis untuk UMKM yang baru memulai otomasi customer service",
      "Tidak perlu programmer — semua konfigurasi dari dashboard intuitif",
    ],
    stats: [
      { value: "1,4 juta+", label: "Penduduk kota Makassar" },
      { value: "2,7 juta+", label: "Penduduk area metropolitan Mamminasata" },
      { value: "3 zona waktu", label: "WIB, WITA, WIT — semua dilayani 24/7" },
      { value: "5 menit", label: "Waktu setup chatbot pertama" },
    ],
    ctaHeading: "Layani Indonesia Timur dengan Chatbot AI",
    ctaSubtext: "Mulai gratis sekarang. Tidak perlu kartu kredit, tidak perlu coding.",
    relatedSlugs: ["chatbot-medan", "chatbot-jakarta", "chatbot-customer-service", "chatbot-toko-online"],
  },
  {
    slug: "chatbot-bali",
    metaTitle: "Chatbot Customer Service Bali — AI untuk Hospitality & Pariwisata | Chatvice",
    metaDescription: "Chatbot AI multi-bahasa untuk bisnis pariwisata Bali — hotel, villa, restoran, tur. Layani tamu domestik dan internasional 24/7. Mulai gratis.",
    h1: "Chatbot Customer Service Bali — AI untuk Bisnis Hospitality & Pariwisata",
    subtitle: "Bali adalah destinasi wisata kelas dunia. Layani tamu dari seluruh dunia dengan AI multi-bahasa yang aktif 24 jam, tanpa kewalahan di musim ramai.",
    introParagraphs: [
      <>
        Bali adalah ikon pariwisata Indonesia yang dikenal di seluruh dunia. Dengan jutaan kunjungan wisatawan setiap tahun — dari turis domestik hingga turis internasional dari Australia, Eropa, Amerika, dan Asia — bisnis hospitality di Bali menghadapi volume pertanyaan yang sangat tinggi dan beragam. Tamu menanyakan ketersediaan kamar, paket spa, jadwal kelas yoga, rute tur, restoran terbaik, hingga pertanyaan praktis seperti transportasi dari bandara dan biaya visa. Yang lebih kompleks: pertanyaan ini datang dalam berbagai bahasa, di berbagai zona waktu, dan sering kali butuh respons cepat sebelum tamu beralih ke kompetitor.
      </>,
      <>
        Chatvice menghadirkan solusi <Link href="/chatbot-customer-service" className="text-purple-600 hover:underline">chatbot customer service</Link> dengan dukungan multi-bahasa yang sangat cocok untuk industri hospitality Bali. <Link href="/features" className="text-purple-600 hover:underline">LEXA1 AI Engine</Link> dapat menjawab pertanyaan tamu dalam Bahasa Indonesia, Inggris, dan 50+ bahasa lain — secara otomatis mendeteksi bahasa pertanyaan dan merespons dalam bahasa yang sama. Tamu dari Sydney yang bertanya dalam Bahasa Inggris mendapat jawaban dalam Bahasa Inggris yang natural; tamu dari Jepang yang bertanya dalam Bahasa Jepang mendapat jawaban dalam Bahasa Jepang. Tidak perlu lagi staff multi-lingual untuk setiap shift.
      </>,
      <>
        Untuk hotel, villa, dan resort Bali, fitur <Link href="/features" className="text-purple-600 hover:underline">Hospitality Add-on</Link> Chatvice menyediakan AI Hotel Availability Checker yang terintegrasi dengan Google Sheet — tamu dapat menanyakan ketersediaan kamar untuk tanggal tertentu dan AI menampilkan kartu kamar dengan harga, gambar, dan tombol "Pesan Sekarang" langsung di chat. Ini mengeliminasi back-and-forth panjang dan meningkatkan konversi booking secara signifikan. Untuk restoran, tur, dan layanan wisata, knowledge base Chatvice dapat diisi dengan menu, paket tur, harga, kebijakan, dan FAQ — siap menjawab pertanyaan tamu kapan pun.
      </>,
      <>
        Widget <Link href="/live-chat-website" className="text-purple-600 hover:underline">live chat</Link> Chatvice dapat dipasang di website bisnis hospitality Bali dengan kustomisasi penuh — warna brand, foto property sebagai avatar, pesan sambutan dalam bahasa target tamu Anda. Fitur <Link href="/features" className="text-purple-600 hover:underline">Live Visitor Tracking</Link> memungkinkan tim Anda melihat tamu yang sedang menjelajahi halaman tertentu (misalnya halaman villa premium) dan mengirim pesan proaktif sebelum mereka pergi. Dengan <Link href="/pricing" className="text-purple-600 hover:underline">paket yang skalabel</Link>, Chatvice cocok untuk villa boutique hingga grup hotel besar di Bali.
      </>,
    ],
    features: [
      { icon: Globe, title: "Multi-Bahasa Otomatis", description: "AI mendeteksi dan merespons dalam Bahasa Indonesia, Inggris, dan 50+ bahasa lain secara otomatis." },
      { icon: Store, title: "Hotel Availability Checker", description: "Tamu cek ketersediaan kamar real-time dari Google Sheet, dengan kartu produk dan tombol pesan." },
      { icon: Brain, title: "AI yang Memahami Hospitality", description: "Latih AI dengan informasi property, paket, kebijakan, dan FAQ — siap menjawab tamu profesional." },
      { icon: Sparkles, title: "Widget Premium Customizable", description: "Sesuaikan tampilan widget dengan estetika luxury property Bali Anda — warna, foto, dan gaya." },
      { icon: Zap, title: "Aktif 24/7 di Semua Zona Waktu", description: "Tamu dari seluruh dunia mendapat jawaban instan kapan pun — tanpa staff malam tambahan." },
      { icon: HeadphonesIcon, title: "Eskalasi ke Concierge", description: "Permintaan kustom atau VIP otomatis dialihkan ke staff concierge yang siap membantu." },
    ],
    useCases: [
      "Hotel, villa, dan resort yang menerima pertanyaan ketersediaan dan booking",
      "Restoran dan beach club yang menjawab pertanyaan menu dan reservasi",
      "Tour operator dan diving center yang melayani booking aktivitas wisata",
      "Spa, yoga retreat, dan wellness center yang menerima booking sesi",
      "Sewa motor, mobil, dan transport yang menjawab pertanyaan rate dan ketersediaan",
      "Property manager Airbnb yang melayani tamu sebelum dan selama menginap",
    ],
    whyChatvice: [
      "Dukungan multi-bahasa native — Inggris, Mandarin, Jepang, Rusia, dan lebih banyak lagi",
      "Hospitality Add-on khusus untuk industri hotel dan akomodasi",
      "Live Visitor Tracking untuk konversi prospek booking yang lebih tinggi",
      "Widget premium yang dapat disesuaikan dengan brand luxury property",
      "Skalabel dari villa boutique hingga grup hotel internasional",
    ],
    stats: [
      { value: "50+", label: "Bahasa yang didukung AI untuk tamu internasional" },
      { value: "24/7", label: "Aktif tanpa staff multi-lingual tambahan" },
      { value: "3x", label: "Peningkatan konversi booking dengan widget chat" },
      { value: "5 menit", label: "Setup widget di website hospitality Anda" },
    ],
    ctaHeading: "Layani Tamu Bali dari Seluruh Dunia dengan AI",
    ctaSubtext: "Mulai gratis. Aktifkan add-on hospitality saat siap upgrade.",
    relatedSlugs: ["chatbot-yogyakarta", "chatbot-restoran", "chatbot-customer-service", "live-chat-website"],
  },
  {
    slug: "chatbot-yogyakarta",
    metaTitle: "Chatbot Customer Service Yogyakarta — AI untuk Pendidikan, UMKM & Wisata | Chatvice",
    metaDescription: "Chatbot AI customer service untuk bisnis Yogyakarta. Cocok untuk lembaga pendidikan, UMKM kreatif, kuliner, dan pariwisata budaya. Mulai gratis.",
    h1: "Chatbot Customer Service Yogyakarta — AI untuk Pendidikan, UMKM Kreatif & Pariwisata",
    subtitle: "Yogyakarta adalah kota pelajar, budaya, dan UMKM kreatif. Otomasi customer service Anda dengan AI yang ramah, sopan, dan aktif 24 jam.",
    introParagraphs: [
      <>
        Yogyakarta dikenal sebagai kota pelajar Indonesia, sekaligus pusat budaya dan UMKM kreatif yang sangat aktif. Dengan ratusan ribu mahasiswa yang datang dari seluruh Indonesia, jutaan wisatawan setiap tahun yang berkunjung ke Borobudur, Prambanan, Malioboro, dan Pantai Parangtritis, serta ribuan UMKM kuliner, batik, dan kerajinan, Yogyakarta adalah ekosistem bisnis yang unik — di mana kualitas pelayanan dan keramahan menjadi nilai utama. Bisnis Yogyakarta yang sukses adalah yang mampu memberikan respons cepat dan informatif kepada calon pelanggan, baik mahasiswa, wisatawan, maupun pembeli online dari kota lain.
      </>,
      <>
        Chatvice menghadirkan <Link href="/chatbot-customer-service" className="text-purple-600 hover:underline">chatbot customer service</Link> bertenaga <Link href="/features" className="text-purple-600 hover:underline">LEXA1 AI Engine</Link> yang dapat dikonfigurasi dengan brand voice yang ramah dan sopan — sangat cocok dengan karakter komunikasi khas Yogyakarta. AI dapat menjawab pertanyaan calon mahasiswa tentang biaya kos, fasilitas kampus, dan jadwal pendaftaran; menjawab pertanyaan wisatawan tentang paket tur dan rekomendasi tempat wisata; serta menjawab pertanyaan pembeli online tentang produk batik, kuliner gudeg, atau kerajinan perak Kotagede. Semua dilakukan dalam Bahasa Indonesia yang natural — bahkan dengan sentuhan Bahasa Jawa krama jika diperlukan.
      </>,
      <>
        Untuk lembaga pendidikan dan bimbingan belajar di Yogyakarta — dari universitas, sekolah swasta, hingga bimbel persiapan UTBK — chatbot Chatvice adalah solusi ideal untuk menangani lonjakan pertanyaan di musim pendaftaran. Lihat juga halaman <Link href="/chatbot-pendidikan" className="text-purple-600 hover:underline">chatbot pendidikan</Link> kami untuk fitur khusus industri pendidikan. Untuk UMKM kreatif Yogyakarta, fitur <Link href="/features" className="text-purple-600 hover:underline">AI Product Catalog Crawler</Link> dapat mengekstrak katalog produk Anda secara otomatis dari website — tidak perlu input manual yang memakan waktu.
      </>,
      <>
        Widget <Link href="/live-chat-website" className="text-purple-600 hover:underline">live chat</Link> Chatvice dapat dipasang di website bisnis Yogyakarta Anda dalam 5 menit — kompatibel dengan WordPress, Shopify, Wix, dan platform lainnya. Untuk UMKM yang baru mulai digitalisasi, <Link href="/ai-chatbot-gratis" className="text-purple-600 hover:underline">plan gratis Chatvice</Link> sudah mencakup AI chatbot, widget yang bisa dikustomisasi, dan dashboard analitik dasar — cukup lengkap untuk menangani volume awal. Saat bisnis berkembang, upgrade ke plan berbayar tersedia dengan satu klik.
      </>,
    ],
    features: [
      { icon: Brain, title: "Brand Voice Ramah & Sopan", description: "Konfigurasi AI dengan gaya komunikasi khas Yogyakarta yang ramah, sopan, dan informatif." },
      { icon: Sparkles, title: "Cocok untuk UMKM Kreatif", description: "Widget yang dapat dikustomisasi sesuai estetika brand batik, kerajinan, atau kuliner Yogyakarta." },
      { icon: Globe, title: "Multi-Bahasa untuk Wisatawan", description: "AI menjawab dalam Bahasa Indonesia, Inggris, dan bahasa lain untuk melayani wisatawan internasional." },
      { icon: Clock, title: "Aktif 24/7 untuk Mahasiswa", description: "Calon mahasiswa yang menanyakan info pendaftaran di malam hari tetap mendapat jawaban instan." },
      { icon: Store, title: "AI Product Crawler", description: "Ekstrak katalog produk UMKM kreatif Anda secara otomatis dari website tanpa input manual." },
      { icon: HeadphonesIcon, title: "Eskalasi ke Tim", description: "Pertanyaan kompleks dialihkan ke staff yang tepat — admin kampus, sales, atau owner UMKM." },
    ],
    useCases: [
      "Universitas, sekolah, dan bimbel yang menerima pertanyaan pendaftaran calon siswa",
      "Bisnis kos-kosan dan apartemen mahasiswa yang melayani pertanyaan kamar",
      "UMKM batik, kerajinan, dan fashion lokal yang menjual ke pasar nasional",
      "Bisnis kuliner gudeg, bakpia, dan oleh-oleh yang menerima pesanan online",
      "Tour operator, homestay, dan jasa wisata budaya Yogyakarta",
      "Klinik, spa, dan layanan kesehatan tradisional Jogja",
    ],
    whyChatvice: [
      "AI dengan brand voice yang dapat disesuaikan — ramah dan sopan khas Yogyakarta",
      "Plan gratis lengkap untuk UMKM kreatif yang baru memulai digitalisasi",
      "Multi-bahasa untuk melayani wisatawan domestik dan internasional",
      "AI Product Crawler untuk update katalog otomatis tanpa input manual",
      "Tidak perlu programmer — konfigurasi semua dari dashboard yang intuitif",
    ],
    stats: [
      { value: "300.000+", label: "Mahasiswa aktif di Yogyakarta setiap tahun" },
      { value: "5 juta+", label: "Wisatawan yang berkunjung ke DIY per tahun" },
      { value: "50+", label: "Bahasa yang didukung untuk wisatawan internasional" },
      { value: "Rp 0", label: "Biaya untuk memulai dengan plan gratis" },
    ],
    ctaHeading: "Layani Mahasiswa, Wisatawan, dan Pembeli UMKM Anda dengan AI",
    ctaSubtext: "Mulai gratis sekarang. Setup dalam 5 menit, tanpa coding.",
    relatedSlugs: ["chatbot-bali", "chatbot-pendidikan", "chatbot-bandung", "ai-chatbot-gratis"],
  },
];

// ─── Industry-specific pages ──────────────────────────────────────────────────

export const industryPagesData: SolutionPageData[] = [
  {
    slug: "chatbot-restoran",
    metaTitle: "Chatbot untuk Restoran & F&B Indonesia — Otomasi Reservasi & Menu | Chatvice",
    metaDescription: "Chatbot AI untuk restoran, kafe, dan bisnis F&B Indonesia. Otomasi reservasi, jawab pertanyaan menu, dan layani pelanggan 24/7 tanpa staff tambahan.",
    h1: "Chatbot AI untuk Restoran & F&B — Otomasi Reservasi dan Layanan Pelanggan",
    subtitle: "Dari reservasi meja hingga pertanyaan menu alergi — biarkan AI menanganinya sehingga tim Anda bisa fokus menyajikan makanan terbaik.",
    introParagraphs: [
      <>
        Industri F&B (Food & Beverage) Indonesia adalah salah satu yang paling kompetitif di dunia usaha. Restoran dan kafe bermunculan setiap hari, dan pelanggan memiliki ekspektasi tinggi — bukan hanya dari kualitas makanan, tetapi juga dari kecepatan dan kemudahan layanan. Di era digital ini, pelanggan tidak lagi hanya datang langsung ke restoran; mereka memesan meja via WhatsApp, menanyakan menu melalui Instagram DM, dan mengecek ketersediaan via website. Menangani semua saluran komunikasi ini secara manual sambil tetap fokus pada operasional dapur dan layanan meja adalah tantangan nyata yang dihadapi hampir setiap bisnis F&B.
      </>,
      <>
        Chatvice hadir sebagai solusi <Link href="/chatbot-customer-service" className="text-purple-600 hover:underline">chatbot customer service</Link> yang dirancang untuk kebutuhan spesifik industri F&B. Dengan mengisi knowledge base menggunakan menu lengkap (termasuk bahan, alergen, opsi vegetarian/vegan), jam operasional, prosedur reservasi, kebijakan pembatalan, dan informasi lokasi, <Link href="/features" className="text-purple-600 hover:underline">LEXA1 AI Engine</Link> dapat menjawab hampir semua pertanyaan pelanggan secara otomatis. Pelanggan yang menanyakan "Apakah ada pilihan halal?" atau "Bisa reservasi untuk 10 orang Sabtu malam?" mendapat jawaban instan — tanpa harus menunggu staff yang mungkin sedang sibuk melayani meja lain.
      </>,
      <>
        Salah satu fitur paling berharga untuk restoran adalah kemampuan chatbot mengumpulkan informasi reservasi secara terstruktur. AI dapat menanyakan tanggal, waktu, jumlah tamu, dan kebutuhan khusus (high chair, wheelchair access, birthday decoration) kepada pelanggan, lalu menampilkan ringkasan untuk dikonfirmasi oleh staff. Ini jauh lebih efisien dibanding bolak-balik chat manual yang sering menimbulkan miskomunikasi. Fitur <Link href="/features" className="text-purple-600 hover:underline">quick replies</Link> juga memungkinkan staff restoran merespons pertanyaan berulang dengan satu klik — menghemat waktu yang signifikan di jam sibuk.
      </>,
      <>
        Widget <Link href="/live-chat-website" className="text-purple-600 hover:underline">live chat</Link> Chatvice dapat dipasang di website restoran Anda dengan satu baris kode — kompatibel dengan WordPress, Wix, dan semua platform website populer. Widget dapat dikustomisasi dengan warna brand restoran Anda, foto restoran atau makanan sebagai avatar, dan pesan sambutan yang mencerminkan karakter brand. Untuk restoran yang ingin memulai tanpa biaya, <Link href="/ai-chatbot-gratis" className="text-purple-600 hover:underline">plan gratis Chatvice</Link> sudah cukup untuk menangani pertanyaan menu dan jam buka secara otomatis. Upgrade ke plan berbayar tersedia ketika volume meningkat.
      </>,
    ],
    features: [
      { icon: MessageCircle, title: "Jawab Pertanyaan Menu Otomatis", description: "AI menjawab pertanyaan tentang menu, bahan, alergen, dan opsi diet khusus secara instan." },
      { icon: Clock, title: "Otomasi Pengumpulan Reservasi", description: "AI mengumpulkan informasi reservasi secara terstruktur — tanggal, waktu, jumlah tamu, kebutuhan khusus." },
      { icon: Zap, title: "Respons Instan 24/7", description: "Pelanggan mendapat jawaban bahkan saat restoran tutup — tentang jam buka, lokasi, dan informasi umum." },
      { icon: Users, title: "Multi-Agen untuk Jam Sibuk", description: "Tangani banyak percakapan serentak tanpa antrean — sempurna untuk jam makan siang dan malam." },
      { icon: Globe, title: "Informasi Lokasi & Petunjuk Arah", description: "AI memberikan alamat lengkap, link Google Maps, dan petunjuk parkir kepada pelanggan baru." },
      { icon: HeadphonesIcon, title: "Eskalasi ke Staff Restoran", description: "Pertanyaan kompleks atau kasus khusus langsung diteruskan ke staff yang bisa membantu lebih lanjut." },
    ],
    useCases: [
      "Menjawab pertanyaan menu, harga, dan ketersediaan secara otomatis",
      "Mengumpulkan informasi reservasi meja dari pelanggan",
      "Memberikan informasi jam buka, lokasi, dan cara parkir",
      "Menjelaskan opsi halal, vegetarian, vegan, dan alergen",
      "Menangani pertanyaan tentang paket gathering dan private dining",
      "Menerima dan meneruskan order delivery ke sistem POS",
    ],
    whyChatvice: [
      "Knowledge base yang fleksibel — isi dengan menu PDF, foto produk, dan SOP layanan",
      "Widget dapat dikustomisasi sesuai estetika restoran Anda",
      "Tidak perlu staff standby di chat — AI menangani 80%+ pertanyaan sendiri",
      "Analitik menunjukkan pertanyaan terbanyak untuk mengoptimalkan menu dan layanan",
      "Plan gratis tersedia — mulai tanpa investasi awal",
    ],
    stats: [
      { value: "80%", label: "Pertanyaan menu dijawab otomatis tanpa staff" },
      { value: "3x", label: "Lebih cepat dalam menangani pertanyaan reservasi" },
      { value: "24/7", label: "Informasi restoran tersedia kapan pun" },
      { value: "5 menit", label: "Setup chatbot restoran pertama Anda" },
    ],
    ctaHeading: "Otomasi Layanan Pelanggan Restoran Anda",
    ctaSubtext: "Mulai gratis. Tidak perlu kartu kredit, tidak perlu developer.",
    relatedSlugs: ["chatbot-klinik", "chatbot-customer-service", "live-chat-website", "chatbot-jakarta"],
  },
  {
    slug: "chatbot-klinik",
    metaTitle: "Chatbot untuk Klinik & Layanan Kesehatan Indonesia | Chatvice",
    metaDescription: "Chatbot AI untuk klinik, rumah sakit, dan layanan kesehatan Indonesia. Otomasi booking konsultasi, FAQ medis, dan layanan informasi pasien 24/7.",
    h1: "Chatbot AI untuk Klinik & Layanan Kesehatan — Otomasi Booking dan Informasi Pasien",
    subtitle: "Pasien butuh informasi cepat dan akurat. Chatbot AI Chatvice memastikan setiap pertanyaan kesehatan mendapat respons instan, kapan pun.",
    introParagraphs: [
      <>
        Layanan kesehatan adalah industri yang paling sensitif terhadap kecepatan dan akurasi informasi. Pasien yang ingin berkonsultasi dengan dokter atau membutuhkan informasi tentang layanan klinik tidak bisa menunggu berjam-jam untuk mendapat respons. Sayangnya, banyak klinik dan fasilitas kesehatan di Indonesia masih mengandalkan telepon atau WhatsApp manual untuk menerima pertanyaan — yang berarti staff administrasi kewalahan, waktu tunggu panjang, dan pasien frustrasi ketika tidak ada yang mengangkat telepon di luar jam kerja.
      </>,
      <>
        Chatvice memungkinkan klinik dan layanan kesehatan memberikan <Link href="/chatbot-customer-service" className="text-purple-600 hover:underline">layanan informasi pasien</Link> yang responsif dan andal, tanpa harus menambah staff administrasi. Dengan mengisi knowledge base menggunakan informasi layanan, daftar dokter dan spesialis, jam praktik, prosedur pendaftaran, biaya konsultasi umum, dan FAQ kesehatan yang relevan, <Link href="/features" className="text-purple-600 hover:underline">LEXA1 AI Engine</Link> dapat menjawab pertanyaan umum pasien secara akurat — 24 jam sehari, 7 hari seminggu. Pertanyaan "Apakah ada dokter kandungan Senin pagi?" atau "Berapa biaya konsultasi umum?" dijawab instan tanpa harus menghubungi resepsionis.
      </>,
      <>
        Untuk layanan pembuatan janji temu, chatbot Chatvice dapat mengumpulkan informasi yang diperlukan dari pasien secara terstruktur — nama, keluhan, pilihan dokter, dan waktu yang diinginkan — kemudian meneruskan ke sistem booking klinik Anda. Ini secara signifikan mengurangi beban kerja staff resepsionis untuk pertanyaan dan pendaftaran rutin. Fitur eskalasi otomatis memastikan bahwa pertanyaan yang memerlukan konfirmasi medis atau penanganan khusus langsung diteruskan ke staff yang berwenang, sehingga tidak ada informasi medis yang salah diberikan oleh AI.
      </>,
      <>
        Privasi dan keamanan data pasien adalah prioritas utama. Chatvice menggunakan enkripsi end-to-end untuk semua percakapan dan mendukung kontrol akses domain yang ketat — memastikan hanya website resmi klinik yang dapat menggunakan widget Anda. Klinik dapat mengonfigurasi AI untuk tidak memberikan saran medis spesifik, melainkan selalu mengarahkan ke tenaga medis untuk keputusan klinis. Dengan <Link href="/pricing" className="text-purple-600 hover:underline">paket yang skalabel</Link>, Chatvice cocok untuk klinik umum kecil hingga rumah sakit dengan banyak spesialis.
      </>,
    ],
    features: [
      { icon: Clock, title: "Informasi Jadwal Dokter 24/7", description: "Pasien dapat menanyakan jadwal praktik dokter dan ketersediaan kapan pun, termasuk malam hari." },
      { icon: Brain, title: "FAQ Layanan Kesehatan", description: "AI menjawab pertanyaan umum tentang layanan, biaya, prosedur pendaftaran, dan persyaratan asuransi." },
      { icon: MessageCircle, title: "Pengumpulan Data Pendaftaran", description: "AI mengumpulkan informasi pendaftaran pasien secara terstruktur sebelum diteruskan ke staff." },
      { icon: Shield, title: "Keamanan & Privasi Data Pasien", description: "Enkripsi end-to-end dan kontrol akses domain ketat untuk perlindungan data sensitif pasien." },
      { icon: HeadphonesIcon, title: "Eskalasi ke Staff Medis", description: "Pertanyaan yang memerlukan konfirmasi medis langsung diteruskan ke staff yang berwenang." },
      { icon: Globe, title: "Informasi Lokasi & Asuransi", description: "AI memberikan informasi lokasi, arah, parkir, dan daftar asuransi yang diterima klinik." },
    ],
    useCases: [
      "Menjawab pertanyaan jadwal dokter dan spesialis yang tersedia",
      "Memberikan informasi biaya konsultasi dan prosedur",
      "Mengumpulkan data awal pasien untuk proses pendaftaran",
      "Menjelaskan layanan klinik — dari poli umum hingga spesialis",
      "Memberikan informasi asuransi yang diterima dan prosedur klaim",
      "Menangani pertanyaan lokasi, jam buka, dan cara ke klinik",
    ],
    whyChatvice: [
      "Enkripsi end-to-end untuk privasi data pasien yang terjamin",
      "AI dapat dikonfigurasi untuk menghindari saran medis — hanya informasi layanan",
      "Integrasi mudah dengan website klinik yang sudah ada",
      "Analitik menunjukkan pertanyaan terbanyak untuk mengoptimalkan layanan",
      "Eskalasi otomatis ke staff memastikan tidak ada kasus yang terlewat",
    ],
    stats: [
      { value: "70%", label: "Pengurangan pertanyaan rutin ke resepsionis" },
      { value: "24/7", label: "Informasi layanan tersedia kapan pun" },
      { value: "< 1 detik", label: "Waktu respons untuk pertanyaan pasien" },
      { value: "100%", label: "Enkripsi data percakapan pasien" },
    ],
    ctaHeading: "Tingkatkan Layanan Informasi Pasien Klinik Anda",
    ctaSubtext: "Mulai gratis. Setup dalam 5 menit, tanpa coding.",
    relatedSlugs: ["chatbot-restoran", "chatbot-properti", "chatbot-customer-service", "live-chat-website"],
  },
  {
    slug: "chatbot-properti",
    metaTitle: "Chatbot untuk Agen Properti & Developer Real Estate Indonesia | Chatvice",
    metaDescription: "Chatbot AI untuk agen properti, developer, dan real estate Indonesia. Otomasi pertanyaan unit, KPR, dan jadwal survei. Tingkatkan konversi prospek.",
    h1: "Chatbot AI untuk Properti & Real Estate — Otomasi Prospek dan Informasi Unit",
    subtitle: "Prospek properti tidak menunggu. Chatbot AI Chatvice memastikan setiap calon pembeli mendapat respons instan tentang unit, harga, dan jadwal survei.",
    introParagraphs: [
      <>
        Industri properti Indonesia terus tumbuh, namun proses penjualan masih sangat bergantung pada interaksi manusia yang intensif. Agen properti dan developer menghabiskan banyak waktu menjawab pertanyaan yang berulang — tentang spesifikasi unit, harga, down payment, simulasi KPR, lokasi, dan fasilitas kawasan. Di sisi lain, calon pembeli properti — yang mungkin sudah melakukan riset panjang sebelum menghubungi agen — mengharapkan informasi yang akurat dan cepat. Ketidaksesuaian antara ekspektasi kecepatan respons prospek dan kapasitas tim agen seringkali menjadi penyebab kehilangan calon pembeli potensial.
      </>,
      <>
        Chatvice memungkinkan agen properti dan developer menjawab pertanyaan prospek secara instan menggunakan <Link href="/features" className="text-purple-600 hover:underline">LEXA1 AI Engine</Link>. Dengan mengisi knowledge base menggunakan informasi unit (tipe, luas, harga, stok tersedia), spesifikasi bangunan, fasilitas kawasan, kemudahan aksesibilitas, dan panduan KPR, AI dapat melayani calon pembeli 24 jam sehari — termasuk saat agen sedang menemani survei klien lain. Prospek yang mencari informasi di malam hari atau akhir pekan tidak lagi harus menunggu hari kerja berikutnya.
      </>,
      <>
        Salah satu fitur paling berharga untuk industri properti adalah kemampuan chatbot mengumpulkan data prospek secara terstruktur. Ketika calon pembeli menanyakan sebuah unit, AI dapat secara natural menanyakan preferensi (tipe unit, budget, kebutuhan KKB vs cash), mengumpulkan data kontak, dan menjadwalkan janji survei — semua dalam satu percakapan yang mulus. Data prospek yang terkumpul dapat langsung diteruskan ke agen untuk follow-up. Fitur <Link href="/features" className="text-purple-600 hover:underline">Live Visitor Tracking</Link> Chatvice juga memungkinkan agen melihat siapa yang sedang menjelajahi halaman unit tertentu di website dan mengirim pesan proaktif — meningkatkan peluang konversi secara signifikan.
      </>,
      <>
        Widget <Link href="/live-chat-website" className="text-purple-600 hover:underline">live chat</Link> Chatvice dapat dipasang di website properti Anda — dari situs developer besar hingga halaman landing iklan properti — dengan satu baris kode. Widget dapat dikonfigurasi untuk langsung menampilkan pertanyaan yang relevan seperti "Ingin tahu simulasi KPR?" atau "Jadwalkan survei unit sekarang" — mendorong calon pembeli untuk memulai percakapan. Dengan <Link href="/pricing" className="text-purple-600 hover:underline">paket yang fleksibel</Link>, Chatvice cocok untuk agen individual hingga developer dengan ratusan unit.
      </>,
    ],
    features: [
      { icon: Brain, title: "Informasi Unit & Stok Real-Time", description: "AI menjawab pertanyaan tentang tipe unit, harga, stok tersedia, dan spesifikasi bangunan secara akurat." },
      { icon: Users, title: "Kumpulkan Data Prospek", description: "AI mengumpulkan preferensi dan kontak calon pembeli secara natural dalam satu percakapan." },
      { icon: Globe, title: "Pantau Prospek Website", description: "Lihat calon pembeli yang sedang menjelajahi halaman unit tertentu dan kirim pesan proaktif." },
      { icon: MessageCircle, title: "Panduan Simulasi KPR", description: "AI menjelaskan skema cicilan, down payment, dan persyaratan KPR berdasarkan data dari bank mitra." },
      { icon: Clock, title: "Jadwalkan Survei Otomatis", description: "AI mengumpulkan pilihan waktu survei dan meneruskan ke agen untuk konfirmasi." },
      { icon: Zap, title: "Respons 24/7 untuk Prospek", description: "Calon pembeli mendapat informasi instan kapan pun — termasuk malam hari dan akhir pekan." },
    ],
    useCases: [
      "Menjawab pertanyaan tipe unit, luas, harga, dan stok tersedia",
      "Memberikan simulasi KPR dan informasi skema pembayaran",
      "Mengumpulkan data dan preferensi prospek secara terstruktur",
      "Menjadwalkan kunjungan survei unit dengan calon pembeli",
      "Menjelaskan fasilitas kawasan, aksesibilitas, dan infrastruktur sekitar",
      "Mengirim pesan proaktif ke pengunjung website yang melihat unit tertentu",
    ],
    whyChatvice: [
      "Live Visitor Tracking untuk melihat dan menghubungi prospek aktif di website",
      "Knowledge base dapat diisi dengan brosur PDF dan data unit dari spreadsheet",
      "AI mengumpulkan data prospek secara natural — tidak terasa seperti form",
      "Integrasi WhatsApp untuk follow-up langsung oleh agen setelah obrolan AI",
      "Analitik menunjukkan unit mana yang paling banyak ditanyakan",
    ],
    stats: [
      { value: "3x", label: "Lebih banyak prospek yang dikonversi ke janji survei" },
      { value: "24/7", label: "Informasi unit tersedia bahkan di luar jam kerja" },
      { value: "60%", label: "Pengurangan waktu agen untuk pertanyaan berulang" },
      { value: "5 menit", label: "Setup chatbot properti pertama Anda" },
    ],
    ctaHeading: "Jangan Biarkan Prospek Properti Anda Pergi Tanpa Jawaban",
    ctaSubtext: "Mulai gratis sekarang. Tidak perlu kartu kredit.",
    relatedSlugs: ["chatbot-klinik", "chatbot-restoran", "chatbot-customer-service", "live-chat-website"],
  },
  {
    slug: "chatbot-pendidikan",
    metaTitle: "Chatbot untuk Lembaga Pendidikan & Kursus Online Indonesia | Chatvice",
    metaDescription: "Chatbot AI untuk sekolah, universitas, bimbingan belajar, dan kursus online Indonesia. Otomasi pertanyaan pendaftaran, jadwal, dan informasi program.",
    h1: "Chatbot AI untuk Lembaga Pendidikan — Otomasi Informasi Program dan Pendaftaran",
    subtitle: "Ribuan calon siswa dan orang tua menanyakan hal yang sama setiap tahun. Chatbot AI Chatvice menjawab semuanya secara instan, 24/7.",
    introParagraphs: [
      <>
        Lembaga pendidikan — dari sekolah swasta, universitas, bimbingan belajar (bimbel), hingga platform kursus online — menghadapi lonjakan pertanyaan yang sangat tinggi di musim pendaftaran. Calon siswa dan orang tua menanyakan persyaratan pendaftaran, biaya SPP, jadwal ujian masuk, kurikulum, fasilitas, beasiswa, dan puluhan pertanyaan lainnya. Staff administrasi pendidikan yang terbatas seringkali kewalahan, dan pertanyaan yang tidak terjawab cepat bisa berarti kehilangan calon siswa ke sekolah atau kursus lain yang lebih responsif.
      </>,
      <>
        Chatvice memungkinkan lembaga pendidikan memberikan informasi yang akurat dan cepat kepada calon siswa dan orang tua — kapan pun mereka bertanya. Dengan mengisi knowledge base menggunakan prospektus, brosur program, persyaratan pendaftaran, jadwal akademik, dan FAQ yang sering ditanyakan, <Link href="/features" className="text-purple-600 hover:underline">LEXA1 AI Engine</Link> siap menjawab pertanyaan dalam bahasa yang natural dan informatif. "Apakah ada beasiswa untuk siswa berprestasi?" atau "Kapan batas pendaftaran semester ini?" — semuanya dijawab instan tanpa harus menunggu jam kerja administrasi.
      </>,
      <>
        Untuk platform kursus online yang melayani ribuan peserta dari seluruh Indonesia, chatbot Chatvice adalah solusi yang skalabel tanpa menambah tim support. AI dapat menjelaskan kurikulum, metode pembelajaran, sertifikat yang diberikan, akses materi, dan prosedur pembayaran — dalam satu percakapan yang mulus. Fitur <Link href="/live-chat-website" className="text-purple-600 hover:underline">live chat</Link> yang selalu aktif memastikan calon peserta yang tertarik di tengah malam pun bisa mendapatkan informasi dan terdorong untuk mendaftar saat itu juga, bukan menunda hingga keesokan hari.
      </>,
      <>
        Widget Chatvice dapat dipasang di website lembaga pendidikan Anda dan dikonfigurasi dengan pertanyaan yang disarankan seperti "Lihat program yang tersedia", "Cek persyaratan pendaftaran", atau "Simulasi biaya studi" — memandu calon siswa ke informasi yang paling mereka butuhkan. Untuk lembaga pendidikan yang ingin mulai tanpa anggaran besar, <Link href="/ai-chatbot-gratis" className="text-purple-600 hover:underline">plan gratis Chatvice</Link> sudah mencakup semua yang diperlukan untuk memulai otomasi informasi dasar. Lihat juga <Link href="/pricing" className="text-purple-600 hover:underline">perbandingan paket lengkap</Link> untuk memilih yang paling sesuai dengan skala lembaga Anda.
      </>,
    ],
    features: [
      { icon: Brain, title: "Informasi Program & Kurikulum", description: "AI menjawab pertanyaan tentang program studi, kurikulum, metode pembelajaran, dan sertifikasi." },
      { icon: Clock, title: "Jadwal & Kalender Akademik", description: "Informasi jadwal pendaftaran, ujian masuk, dan kalender akademik tersedia kapan pun dibutuhkan." },
      { icon: Database, title: "Persyaratan Pendaftaran", description: "AI menjelaskan dokumen yang diperlukan, prosedur pendaftaran, dan tenggat waktu penerimaan." },
      { icon: MessageCircle, title: "Informasi Biaya & Beasiswa", description: "AI memberikan gambaran umum biaya pendidikan dan informasi beasiswa yang tersedia." },
      { icon: Zap, title: "Panduan Pendaftaran Otomatis", description: "AI memandu calon siswa langkah demi langkah melalui proses pendaftaran online." },
      { icon: Users, title: "Layani Ribuan Pertanyaan Serentak", description: "Di musim pendaftaran, AI tangani semua pertanyaan masuk tanpa antrian dan tanpa delay." },
    ],
    useCases: [
      "Menjawab pertanyaan program studi, kurikulum, dan sertifikasi yang tersedia",
      "Menjelaskan persyaratan pendaftaran dan dokumen yang diperlukan",
      "Memberikan informasi biaya dan pilihan beasiswa",
      "Memandu calon siswa melalui proses pendaftaran online",
      "Menjawab pertanyaan tentang fasilitas kampus dan asrama",
      "Menangani pertanyaan tentang metode pembayaran SPP dan cicilan",
    ],
    whyChatvice: [
      "AI dapat menangani lonjakan pertanyaan di musim pendaftaran tanpa kewalahan",
      "Knowledge base bisa diisi dengan PDF brosur dan prospektus program",
      "Widget dapat dikonfigurasi dengan pertanyaan yang mengarahkan calon siswa",
      "Analitik menunjukkan program dan pertanyaan yang paling banyak diminati",
      "Plan gratis tersedia untuk sekolah dan lembaga dengan anggaran terbatas",
    ],
    stats: [
      { value: "90%", label: "Pertanyaan pendaftaran dijawab tanpa staff administrasi" },
      { value: "24/7", label: "Informasi tersedia kapan pun calon siswa bertanya" },
      { value: "3x", label: "Lebih banyak leads yang dikonversi saat musim pendaftaran" },
      { value: "5 menit", label: "Setup chatbot lembaga pendidikan pertama Anda" },
    ],
    ctaHeading: "Otomasi Layanan Informasi Lembaga Pendidikan Anda",
    ctaSubtext: "Mulai gratis sekarang. Tidak perlu kartu kredit atau developer.",
    relatedSlugs: ["chatbot-properti", "chatbot-klinik", "chatbot-customer-service", "ai-chatbot-gratis"],
  },
];

export const solutionsBySlug: Record<string, SolutionPageData> = Object.fromEntries(
  [...solutionsData, ...cityPagesData, ...industryPagesData].map((s) => [s.slug, s])
);
