/**
 * Comprehensive Chatvice Dashboard Knowledge Base
 * Used by the Chatvice Guide AI assistant to answer merchant questions.
 * Covers all 30+ dashboard pages, major workflows, plan limits, and feature details.
 */

export function buildFullDashboardKnowledge(): string {
  return `
===================================================================
CHATVICE DASHBOARD — PANDUAN LENGKAP SEMUA FITUR
===================================================================

HALAMAN DASHBOARD & FUNGSINYA:
================================================================

1. OVERVIEW (/dashboard)
   Halaman utama yang menampilkan analytics real-time:
   - KPI cards: Total Chat Hari Ini, Sesi Aktif (24 jam terakhir), Tingkat Resolusi AI, Rata-rata Waktu Respons
   - Grafik "Active Chats" (tren sesi per hari/minggu)
   - Grafik "AI Resolution Rate" (tren resolusi AI vs eskalasi manusia)
   - Tile status: Agents Online, Supervisors Online, Active Sessions
   - Info Tip (i) di setiap card menjelaskan cara perhitungan metrik
   [LINK:Buka Overview:/dashboard]

2. AI AGENTS (/dashboard/agents)
   Kelola otak chatbot Anda:
   - Buat, edit, hapus AI Agent
   - Setiap agent punya: nama, model AI, kepribadian/system prompt, foto profil
   - Tentukan agent mana yang "aktif" untuk widget
   - Model tersedia: GPT-4.1-mini (direkomendasikan), GPT-4, dll
   - Limit per paket: Free/Starter=1 agent, Pro=3 agent, Enterprise=10 agent, Custom=tidak terbatas
   CARA BUAT AGENT BARU:
   1. Buka [LINK:halaman AI Agents:/dashboard/agents]
   2. Klik tombol "Buat Agent Baru" di pojok kanan atas
   3. Isi nama agent (contoh: "Asisten Toko Budi")
   4. Pilih model AI (GPT-4.1-mini disarankan untuk kecepatan dan biaya efisien)
   5. Tulis kepribadian/system prompt sesuai brand Anda
   6. Klik Simpan → jadikan sebagai Agent Aktif
   [LINK:Kelola AI Agents:/dashboard/agents]

3. KNOWLEDGE BASE (/dashboard/knowledge)
   Bahan pembelajaran AI agent Anda (tiga tab):
   TAB TRAINING DATA:
   - Tambah entri pengetahuan manual (FAQ, kebijakan, harga, jam buka)
   - Drag-and-drop untuk mengatur urutan prioritas
   - AI akan auto-format konten saat disimpan
   TAB ACTIVE SOURCES:
   - Masukkan URL website untuk di-crawl otomatis
   - Konten tersinkron berkala agar AI selalu up-to-date
   - Cocok untuk halaman produk, FAQ website, blog
   TAB CREATE WITH AI:
   - Pilih jenis bisnis dan kategori artikel
   - AI akan membuatkan artikel pengetahuan untuk Anda
   - Edit hasil sebelum disimpan
   CARA MENAMBAH KNOWLEDGE:
   1. Buka [LINK:Knowledge Base:/dashboard/knowledge]
   2. Tab Training Data → klik "Tambah Entri"
   3. Tulis judul dan isi konten (FAQ, kebijakan, prosedur)
   4. Simpan — AI akan auto-format kontennya
   5. Untuk URL: tab Active Sources → masukkan URL → klik Crawl
   [LINK:Knowledge Base:/dashboard/knowledge]

4. SOURCES (/dashboard/sources)
   Kelola semua sumber pengetahuan per agent:
   - Tambah teks/konten langsung
   - Upload file (PDF, DOCX, TXT)
   - Tambah URL website untuk di-crawl
   - Set syncEnabled untuk auto-sync berkala
   - Setiap source terhubung ke 1 agent spesifik
   [LINK:Knowledge Sources:/dashboard/sources]

5. TRIGGERS (/dashboard/triggers)
   Aturan otomatis berdasarkan keyword:
   - Trigger "escalate": keyword tertentu langsung escalate ke supervisor
   - Trigger "respond": balas dengan respons custom
   - Contoh keyword: "refund", "manager", "komplain", "minta uang kembali"
   CARA BUAT TRIGGER:
   1. Buka [LINK:Triggers:/dashboard/triggers]
   2. Klik "Tambah Trigger"
   3. Masukkan keyword (atau beberapa keyword dipisah koma)
   4. Pilih action: Escalate to Human atau Custom Response
   5. Aktifkan trigger
   [LINK:Triggers:/dashboard/triggers]

6. SESSIONS / CHAT SESSIONS (/dashboard/sessions)
   Monitor semua percakapan pelanggan secara real-time:
   - Lihat sesi aktif dan arsip
   - Buka percakapan individu untuk baca transcript
   - Filter berdasarkan status (AI, HUMAN, escalated)
   - Lihat waktu escalation, nama customer, channel
   - Export riwayat chat
   [LINK:Chat Sessions:/dashboard/sessions]

7. CHAT LOGS (/dashboard/chat-logs)
   Arsip percakapan yang sudah selesai/diarsipkan:
   - Transcript lengkap tiap sesi
   - Filter by tanggal, agent, supervisor
   - Download transcript
   - Periode retensi by paket: Free=1 jam, Starter=24 jam, Pro=48 jam, Enterprise=7 hari
   [LINK:Chat Logs:/dashboard/chat-logs]

8. ANALYTICS (/dashboard/analytics)
   Data mendalam tentang performa chatbot (Pro/Enterprise/Custom):
   - Topik chat yang paling sering muncul
   - Keyword ranking — pertanyaan terpopuler
   - Waktu respons rata-rata per agent
   - Tingkat eskalasi per periode
   - Grafik tren performa
   [LINK:Analytics:/dashboard/analytics]

9. WIDGET (/dashboard/widget)
   Kustomisasi tampilan dan konfigurasi widget chat (banyak tab):
   TAB APPEARANCE: Warna, posisi (kiri/kanan), tema terang/gelap, ikon custom, foto agent
   TAB PRECHAT: Welcome bubble, name collection (minta nama+HP), banner gambar, AI greeting, profanity filter
   TAB EMBED/DOMAIN: Snippet kode embed, allowed domains (whitelist), unregistered domain attempts
   TAB SOCIAL MEDIA: Tambah tombol social media (WhatsApp, Instagram, dll) di widget
   TAB CHAT BUTTONS: Tombol quick action di dalam widget
   TAB CLOSING STATEMENT: Pesan penutup otomatis saat chat tidak aktif
   CARA DAPAT KODE EMBED:
   1. Buka [LINK:Widget:/dashboard/widget]
   2. Pilih tab Embed
   3. Klik tombol "Copy" untuk menyalin script
   4. Paste sebelum tag </body> di HTML website Anda
   [LINK:Widget Settings:/dashboard/widget]

10. SUPERVISORS (/dashboard/supervisors)
    Tambah dan kelola tim supervisor:
    - Buat akun supervisor (nama, email, password)
    - Set hak akses / role
    - Lihat status online/offline supervisor
    - Limit per paket: Free=0, Starter=1, Pro=3, Enterprise=10, Custom=tidak terbatas
    CARA TAMBAH SUPERVISOR:
    1. Buka [LINK:Supervisors:/dashboard/supervisors]
    2. Klik "Tambah Supervisor"
    3. Isi nama, email, password
    4. Klik Simpan — supervisor akan menerima kredensial
    5. Atur jadwal di [LINK:Work Scheduler:/dashboard/work-scheduler]
    [LINK:Supervisors:/dashboard/supervisors]

11. WORK SCHEDULER (/dashboard/work-scheduler)
    Jadwal kerja untuk supervisor dan AI agent:
    - Buat shift kerja (nama shift, jam mulai-selesai, hari aktif)
    - Assign shift ke supervisor atau agent
    - Widget otomatis tahu kapan supervisor online/offline
    - Di luar jadwal → AI handle semua chat atau tampilkan pesan offline
    CARA BUAT JADWAL:
    1. Buka [LINK:Work Scheduler:/dashboard/work-scheduler]
    2. Klik "Tambah Shift"
    3. Isi nama shift, jam mulai, jam selesai, hari aktif (Senin-Minggu)
    4. Assign ke supervisor atau agent
    5. Simpan
    [LINK:Work Scheduler:/dashboard/work-scheduler]

12. QUICK REPLIES (/dashboard/quick-replies)
    Template respons cepat untuk supervisor:
    - Buat template pesan yang sering digunakan
    - Supervisor bisa pakai shortcut saat melayani pelanggan
    - Contoh: "Terima kasih, pesanan Anda sedang diproses", "Mohon tunggu sebentar"
    [LINK:Quick Replies:/dashboard/quick-replies]

13. PRODUCT CARDS (/dashboard/product-cards)
    Kartu produk yang ditampilkan di dalam chat:
    - Buat kartu produk dengan gambar, nama, harga, deskripsi, link
    - AI bisa otomatis merekomendasikan produk ke customer
    - Product Catalog Crawler: scan URL toko untuk ekstrak produk secara AI
    [LINK:Product Cards:/dashboard/product-cards]

14. PROACTIVE CHAT (/dashboard/proactive-chat)
    Lacak pengunjung website secara real-time dan mulai chat lebih dulu:
    - Lihat daftar pengunjung yang sedang di website (IP, lokasi, device, halaman)
    - Supervisor bisa klik pengunjung dan kirim pesan inisiasi
    - Widget customer otomatis terbuka saat supervisor mengirim pesan
    - Fitur bisa diaktifkan/nonaktifkan di pengaturan
    CARA GUNAKAN PROACTIVE CHAT:
    1. Aktifkan fitur di [LINK:Proactive Chat:/dashboard/proactive-chat]
    2. Tunggu pengunjung masuk ke daftar live visitors
    3. Klik pengunjung → kirim pesan sapaan
    4. Widget mereka otomatis terbuka
    [LINK:Proactive Chat:/dashboard/proactive-chat]

15. LIVE PREVIEW (/dashboard/live-preview)
    Preview widget chatbot tanpa perlu install di website:
    - Test tampilan dan behavior widget langsung dari dashboard
    - Simulasikan percakapan untuk memastikan AI menjawab dengan benar
    [LINK:Live Preview:/dashboard/live-preview]

16. CHAT MONITORING (/dashboard/chat-monitoring)
    Monitoring keamanan percakapan supervisor dengan AI (Gemini 2.5 Flash):
    - Deteksi otomatis aktivitas mencurigakan di percakapan supervisor
    - Configurable sensitivity (low/medium/high)
    - Alert real-time bila ada pola mencurigakan
    [LINK:Chat Monitoring:/dashboard/chat-monitoring]

17. INTEGRATIONS (/dashboard/integrations)
    Hubungkan Chatvice dengan layanan eksternal:
    TELEGRAM BRIDGE:
    - Supervisors bisa link Telegram Chat ID mereka
    - Chat yang di-escalate otomatis dikirim DM ke Telegram supervisor
    - Supervisor bisa reply dari Telegram langsung ke customer
    - Setup: klik "Enable Supervisor Telegram Replies" untuk setup webhook
    [LINK:Integrations:/dashboard/integrations]

18. CUSTOM DATA SOURCE (/dashboard/custom-data-source)
    Hubungkan backend panel REST API untuk query data real-time:
    - AI bisa jawab pertanyaan seperti: "status deposit saya", "withdraw berapa?"
    - Tab Pengaturan: base URL, auth header, health path, cache TTL, rate limit, API key
    - Tab Intent Lookup: buat intent (contoh: deposit_status) dengan trigger keywords, endpoint, fields, response template
    - Tab Riwayat: audit log semua panggilan API
    - Default intents: deposit_status, withdraw_status, turnover_progress, last_login_ip
    CARA SETUP CUSTOM DATA SOURCE:
    1. Buka [LINK:Custom Data Source:/dashboard/custom-data-source]
    2. Tab Pengaturan: isi base URL panel API Anda
    3. Generate API Key dan copy ke backend panel Anda
    4. Klik "Test Connection" untuk verifikasi
    5. Tab Intent: buat intent sesuai kebutuhan (lihat preset: deposit_status dll)
    6. Download Postman collection untuk implementasi backend
    [LINK:Custom Data Source:/dashboard/custom-data-source]

19. ADDITIONAL SERVICES (/dashboard/additional-services)
    Add-on berbayar untuk fitur tambahan:
    HOSPITALITY ADD-ON ($12/bulan):
    - AI Hotel Availability Checker dengan integrasi Google Sheet
    - Konfigurasi: nama hotel, booking URL, Google Sheet (kolom: room_name, price_per_night, availability, image_url)
    - Widget menampilkan kartu kamar hotel dengan badge harga terbaik dan ketersediaan
    - 7-hari free trial tersedia
    SMART APPOINTMENT SCHEDULING ($7/bulan):
    - Booking appointment via chat
    - Manajemen kalender terintegrasi
    CARA AKTIFKAN ADD-ON:
    1. Buka [LINK:Additional Services:/dashboard/additional-services]
    2. Klik "Start Trial" (7 hari gratis) atau "Bayar"
    3. Scan QR Kompas Pay untuk pembayaran
    4. Add-on aktif setelah pembayaran terkonfirmasi
    [LINK:Additional Services:/dashboard/additional-services]

20. APPOINTMENTS (/dashboard/appointments)
    Kelola booking appointment dari chat (butuh Smart Appointment Scheduling add-on):
    - Lihat semua appointment yang dibuat via chatbot
    - Update status appointment
    - Integrasi kalender
    [LINK:Appointments:/dashboard/appointments]

21. LEADS / USER DATA (/dashboard/leads)
    Data pelanggan yang terkumpul dari form prechat:
    - Nama, email, nomor HP customer
    - Riwayat interaksi per customer
    - Export data lead
    [LINK:Customer Leads:/dashboard/leads]

22. TEAM ACTIVITY (/dashboard/team-activity)
    Monitor aktivitas tim supervisor secara real-time:
    - Lihat siapa yang sedang online
    - Jumlah chat aktif per supervisor
    - Waktu respons per supervisor
    [LINK:Team Activity:/dashboard/team-activity]

23. AFFILIATE (/dashboard/affiliate)
    Program afiliasi untuk mendapat komisi:
    - Dapatkan referral link unik
    - Lihat statistik referral (klik, sign-up, konversi)
    - Komisi per referral yang berlangganan
    - Ajukan withdrawal ke rekening bank/e-wallet
    - Minimum payout berlaku
    CARA DAFTAR AFFILIATE:
    1. Buka [LINK:Program Afiliasi:/dashboard/affiliate]
    2. Aktifkan program afiliasi
    3. Copy referral link
    4. Bagikan ke komunitas/audience Anda
    5. Pantau komisi di dashboard
    6. Klik "Ajukan Withdrawal" bila saldo sudah memenuhi minimum
    [LINK:Program Afiliasi:/dashboard/affiliate]

24. PLANS (/dashboard/plans)
    Lihat dan upgrade paket langganan:
    - Free: 50 percakapan/bulan, 1 agent, fitur dasar
    - Starter ($29/bulan): 500 percakapan, 1 agent, dukungan email
    - Pro ($79/bulan): 5.000 percakapan, 3 agent, analytics, domain kustom
    - Enterprise ($299/bulan): 50.000 percakapan, 10 agent, dukungan dedicated
    - Custom: hubungi sales untuk fitur dan kuota tak terbatas
    Tersedia interval bulanan atau tahunan (hemat ~17%)
    [LINK:Pilih Paket:/dashboard/plans]

25. BILLING (/dashboard/billing)
    Detail tagihan dan riwayat pembayaran:
    - Lihat paket aktif, tanggal perpanjangan, metode pembayaran
    - Riwayat invoice dan transaksi
    - Jika ada pembayaran pending, selesaikan di sini
    [LINK:Billing:/dashboard/billing]

26. SETTINGS (/dashboard/settings)
    Pengaturan akun merchant:
    - Edit profil (nama perusahaan, logo, kontak)
    - Ubah password
    - Pengaturan bahasa dan zona waktu
    - Konfigurasi notifikasi email
    [LINK:Settings:/dashboard/settings]

27. WELCOME BUBBLE (/dashboard/welcome-bubble)
    Atur pesan gelembung yang muncul di samping ikon widget:
    - Teks welcome bubble
    - Delay munculnya bubble
    - Animasi
    [LINK:Welcome Bubble:/dashboard/welcome-bubble]

28. CHAT BUTTONS (/dashboard/chat-buttons)
    Tombol action di dalam jendela chat:
    - Buat tombol shortcut untuk customer
    - Contoh: "Cek Status Pesanan", "Hubungi CS", "Lihat Katalog"
    [LINK:Chat Buttons:/dashboard/chat-buttons]

29. DATA USAGE (/dashboard/data-usage)
    Monitor penggunaan resource:
    - Jumlah percakapan yang digunakan vs limit paket
    - Penggunaan knowledge base (storage)
    - Penggunaan bandwidth
    [LINK:Data Usage:/dashboard/data-usage]

30. MARKETPLACE (/dashboard/marketplace)
    Temukan integrasi dan template tambahan untuk chatbot Anda
    [LINK:Marketplace:/dashboard/marketplace]

31. PROFILE (/dashboard/profile)
    Edit profil personal akun Anda (nama, foto, password)
    [LINK:Profile:/dashboard/profile]

===================================================================
WORKFLOW UTAMA CHATVICE
===================================================================

WORKFLOW A — SETUP DARI NOL (6 FASE):
Fase 1: Buat AI Agent → [LINK:AI Agents:/dashboard/agents]
Fase 2: Atur Tampilan Widget → [LINK:Widget:/dashboard/widget]
Fase 3: Konfigurasi Prechat → [LINK:Widget:/dashboard/widget] (tab Prechat)
Fase 4: Daftarkan Domain → [LINK:Widget:/dashboard/widget] (tab Embed)
Fase 5: Isi Knowledge Base → [LINK:Knowledge Base:/dashboard/knowledge]
Fase 6: Deploy ke Website → copy embed code dari [LINK:Widget:/dashboard/widget] tab Embed

WORKFLOW B — MENGELOLA ESKALASI KE MANUSIA:
1. Buat trigger di [LINK:Triggers:/dashboard/triggers] dengan keyword escalation (contoh: "refund", "minta manager")
2. Tambah supervisor di [LINK:Supervisors:/dashboard/supervisors]
3. Atur jadwal supervisor di [LINK:Work Scheduler:/dashboard/work-scheduler]
4. Supervisor login ke Supervisor Panel untuk tangani chat
5. (Opsional) Link Telegram supervisor di [LINK:Integrations:/dashboard/integrations] untuk notif via Telegram

WORKFLOW C — SETUP HOSPITALITY ADD-ON:
1. Aktifkan add-on di [LINK:Additional Services:/dashboard/additional-services]
2. Masuk ke "Manage" Hospitality → isi nama hotel, booking URL
3. Buat Google Sheet dengan kolom: room_name, price_per_night, availability, image_url
4. Paste URL Google Sheet di pengaturan
5. Tulis instruksi AI untuk rekomendasi kamar
6. Test dengan tanya ketersediaan kamar di widget

WORKFLOW D — SETUP CUSTOM DATA SOURCE (untuk bisnis fintech/gaming):
1. Buka [LINK:Custom Data Source:/dashboard/custom-data-source]
2. Tab Pengaturan: isi base URL API panel Anda, nama header auth, health path
3. Klik "Generate API Key" → copy key tersebut ke backend panel Anda
4. Klik "Test Connection" untuk verifikasi koneksi
5. Tab Intent: review default intents (deposit_status, withdraw_status, dll) atau buat baru
6. Setiap intent punya: intentKey, trigger keywords, HTTP method, endpoint path, required fields, response template
7. Download Postman collection untuk implementasi sisi backend Anda
8. Test dengan kirim pertanyaan seperti "cek deposit saya, ID transaksi TXN001"

WORKFLOW E — PROACTIVE CHAT (sapa pengunjung lebih dulu):
1. Aktifkan fitur di [LINK:Proactive Chat:/dashboard/proactive-chat]
2. Supervisor login ke Supervisor Panel
3. Buka tab "Live Visitors" di Supervisor Panel
4. Klik pengunjung yang terdeteksi → mulai percakapan
5. Widget customer otomatis terbuka dengan pesan dari supervisor

WORKFLOW F — PROGRAM AFILIASI:
1. Daftar di [LINK:Afiliasi:/dashboard/affiliate]
2. Copy referral link unik Anda
3. Bagikan ke teman, komunitas, atau audience
4. Pantau klik dan konversi
5. Ajukan withdrawal bila sudah memenuhi minimum payout

===================================================================
INTEGRASI PIHAK KETIGA
===================================================================

TELEGRAM BRIDGE:
- Merchant aktifkan di [LINK:Integrations:/dashboard/integrations]
- Supervisor link Telegram Chat ID di halaman Notifikasi Supervisor Panel
- Saat ada escalation, bot Telegram kirim DM ke supervisor
- Supervisor reply di Telegram → masuk ke chat customer
Cara setup: Integrations → "Enable Supervisor Telegram Replies" → ikuti instruksi bot

GOOGLE SHEETS:
- Untuk Hospitality: data kamar dari Google Sheet
- Untuk Custom Data Source: transaction lookup via Google Sheet
- Format sheet harus sesuai template yang ditentukan

===================================================================
KEAMANAN & DOMAIN
===================================================================

DOMAIN WHITELIST:
- Widget hanya berjalan di domain yang sudah terdaftar dan divalidasi
- Masa toleransi berlaku saat belum ada domain terdaftar (widget bisa berjalan di mana saja)
- Setelah 1 domain terdaftar → strict enforcement aktif
- Domain tidak dikenal → HTTP 403, dicatat di Unregistered Domains
- Approve/dismiss domain asing di [LINK:Widget:/dashboard/widget] tab Embed

WIDGET IDENTITY VERIFICATION:
- Autentikasi customer aman menggunakan JWT token
- Cocok untuk website yang memerlukan verifikasi identitas customer

===================================================================
PAKET & LIMIT FITUR
===================================================================

FREE: 50 percakapan/bulan, 1 AI Agent, 0 supervisor, fitur dasar
STARTER ($29/bulan): 500 percakapan, 1 AI Agent, 1 supervisor, email support
PRO ($79/bulan): 5.000 percakapan, 3 AI Agent, 3 supervisor, analytics, custom domain
ENTERPRISE ($299/bulan): 50.000 percakapan, 10 AI Agent, 10 supervisor, dedicated support
CUSTOM: Semua unlimited, kontak sales

Semua paket mendapat: knowledge base, triggers, widget embed, escalation ke supervisor
Pro ke atas mendapat: analytics mendalam, custom domain branding
Enterprise ke atas mendapat: priority support, SLA

===================================================================
TIPS OPTIMASI CHATBOT
===================================================================

- Isi Knowledge Base dengan FAQ lengkap → AI lebih akurat
- Buat Trigger untuk keyword kritis (refund, keluhan, urgent)
- Atur Work Scheduler agar AI tidak forward ke supervisor di luar jam kerja
- Gunakan Custom Data Source untuk bisnis yang butuh data real-time (fintech, gaming)
- Pantau Analytics secara rutin untuk identifikasi pertanyaan yang belum terjawab
- Gunakan Proactive Chat untuk meningkatkan konversi dari pengunjung pasif
- Aktifkan AI Greeting di Prechat agar widget terasa lebih personal
- Upload foto agent di Widget agar lebih terpercaya
`;
}
