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
    relatedSlugs: ["ai-chatbot-whatsapp", "live-chat-website", "chatbot-toko-online"],
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
    relatedSlugs: ["chatbot-customer-service", "live-chat-website", "chatbot-toko-online"],
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
    relatedSlugs: ["chatbot-customer-service", "ai-chatbot-whatsapp", "chatbot-toko-online"],
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
    relatedSlugs: ["chatbot-customer-service", "live-chat-website", "ai-chatbot-gratis"],
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
    relatedSlugs: ["chatbot-customer-service", "live-chat-website", "alternatif-tawkto"],
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
    relatedSlugs: ["ai-chatbot-gratis", "chatbot-customer-service", "live-chat-website"],
  },
];

export const solutionsBySlug: Record<string, SolutionPageData> = Object.fromEntries(
  solutionsData.map((s) => [s.slug, s])
);
