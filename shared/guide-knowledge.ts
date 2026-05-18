/**
 * Comprehensive Chatvice Dashboard Knowledge Base
 * Used by the Chatvice Guide AI assistant to answer merchant questions.
 * Covers all 30+ dashboard pages, major workflows, plan limits, and feature details.
 */

export function buildSupervisorPanelKnowledge(): string {
  return `
===================================================================
CHATVICE SUPERVISOR PANEL — PANDUAN LENGKAP
===================================================================

TENTANG SUPERVISOR PANEL:
Supervisor Panel adalah antarmuka khusus untuk tim support manusia yang menangani eskalasi dari AI chatbot. Supervisors mengakses panel ini di URL: /supervisor (berbeda dari merchant dashboard).

===================================================================
AUTENTIKASI & LOGIN SUPERVISOR
===================================================================

CARA LOGIN:
1. Buka halaman /supervisor (bukan /dashboard — itu untuk merchant)
2. Masukkan email dan password yang diberikan oleh merchant Anda
3. Klik "Login"
4. Jika lupa password, hubungi merchant/admin untuk reset

PERBEDAAN AKUN:
- Akun Supervisor: dibuat oleh merchant, login di /supervisor
- Akun Merchant: pemilik bisnis, login di /dashboard
- Jangan mencampurkan kredensial kedua akun ini

===================================================================
MENANGANI CHAT YANG DIESKALASI
===================================================================

ALUR ESKALASI:
1. AI chatbot mendeteksi keyword atau kondisi tertentu → eskalasi otomatis
2. Atau customer meminta berbicara dengan manusia → eskalasi manual
3. Chat masuk ke antrian supervisor dengan status "Escalated"
4. Notifikasi muncul di panel supervisor (suara + badge)
5. Supervisor klik "Take Over" untuk mengambil alih percakapan
6. Status berubah ke "Human" — AI tidak lagi merespons sesi ini

CARA HANDLE ESKALASI:
1. Lihat daftar chat di sidebar kiri panel supervisor
2. Chat dengan label "Escalated" atau badge merah = butuh perhatian segera
3. Klik chat tersebut untuk membuka percakapan
4. Baca riwayat percakapan untuk konteks
5. Klik tombol "Take Over" di header chat
6. Mulai balas pesan customer secara langsung
7. Setelah selesai, klik tombol selesai/close session

TIPS HANDLING ESKALASI:
- Baca seluruh riwayat percakapan sebelum merespons
- Gunakan Quick Replies untuk respons cepat
- Cek Info Panel (tombol "i") untuk data visitor (IP, lokasi, device, halaman)
- Untuk pertanyaan teknis, escalate ke senior atau tutup dengan informasi yang tepat

STATUS CHAT:
- AI: Ditangani otomatis oleh AI agent
- ESCALATED: Menunggu supervisor (belum diambil alih)
- HUMAN: Sedang ditangani oleh supervisor
- CLOSED: Percakapan selesai/ditutup

===================================================================
QUICK REPLIES (TEMPLATE RESPONS CEPAT)
===================================================================

APA ITU QUICK REPLIES:
Template pesan yang sudah dibuat merchant agar supervisor bisa merespons lebih cepat tanpa mengetik ulang.

CARA MENGGUNAKAN QUICK REPLIES SAAT CHAT:
1. Buka percakapan yang sedang ditangani
2. Di area input pesan, klik ikon Quick Reply (biasanya ikon petir/flash)
3. Pilih template dari daftar
4. Edit jika perlu, lalu kirim
5. Atau ketik "/" di input untuk memunculkan Quick Reply suggestions

CONTOH QUICK REPLIES UMUM:
- "Terima kasih telah menghubungi kami. Mohon tunggu sebentar, saya akan membantu Anda."
- "Permintaan Anda sedang kami proses, estimasi [X] hari kerja."
- "Mohon maaf atas ketidaknyamanannya. Boleh saya tahu nomor order/transaksi Anda?"

CATATAN: Quick Replies dibuat oleh merchant di Dashboard → Quick Replies. Supervisor tidak bisa membuat/mengedit template dari panel supervisor.

===================================================================
NOTIFIKASI TELEGRAM
===================================================================

APA ITU TELEGRAM BRIDGE:
Fitur yang memungkinkan supervisor menerima notifikasi dan membalas chat customer langsung dari aplikasi Telegram.

CARA SETUP TELEGRAM NOTIFICATIONS:
1. Buka halaman Notifications di Supervisor Panel (menu sidebar)
2. Cari bagian "Telegram Notifications"
3. Masukkan Telegram Chat ID Anda
   - Cara cari Telegram Chat ID: chat dengan bot @userinfobot di Telegram → bot akan kirim Chat ID Anda
4. Klik Simpan
5. Pastikan merchant sudah mengaktifkan Telegram Bridge di Dashboard → Integrations

CARA KERJA SETELAH SETUP:
- Saat ada chat yang dieskalasi, bot Telegram merchant akan DM ke Anda
- Pesan berisi: nama customer, konteks singkat, dan beberapa pesan terakhir
- Customer juga memforward pesan ke Telegram Anda saat session sudah HUMAN
- Anda bisa REPLY langsung dari Telegram → pesan terkirim ke customer di widget

TROUBLESHOOTING TELEGRAM:
- Tidak terima notifikasi? Pastikan merchant sudah aktifkan "Enable Supervisor Telegram Replies" di Dashboard → Integrations
- Chat ID salah? Cek kembali dengan chat @userinfobot di Telegram
- Bot tidak merespons? Hubungi merchant untuk verifikasi webhook sudah terdaftar

===================================================================
TEAM ACTIVITY & MONITORING
===================================================================

HALAMAN TEAM ACTIVITY:
Menampilkan aktivitas real-time seluruh tim supervisor:
- Siapa yang sedang online/offline
- Jumlah chat aktif per supervisor
- Status handle setiap supervisor

CARA AKSES:
- Klik menu "Team Activity" di sidebar Supervisor Panel

INFORMASI YANG TERSEDIA:
- Nama supervisor + status online (titik hijau = online)
- Jumlah chat yang sedang ditangani
- Waktu mulai shift / last seen

===================================================================
VISITOR INFO PANEL
===================================================================

INFO PANEL DI CHAT:
Saat menangani percakapan, Anda bisa lihat informasi detail tentang customer:
- Klik tombol "Info" (ikon "i") di header percakapan
- Panel terbuka di sisi kanan

INFORMASI YANG TERSEDIA:
- Alamat IP customer (dengan tombol copy)
- Negara dan kota (dengan bendera negara)
- Device: OS, browser, dan user agent lengkap
- Halaman yang sedang dibuka customer
- Sumber traffic (referrer URL atau "Direct / Unknown")

KEGUNAAN INFO PANEL:
- Verifikasi lokasi customer untuk layanan berbasis wilayah
- Cek device untuk troubleshooting masalah teknis
- Lihat halaman customer untuk konteks pertanyaan

===================================================================
PROACTIVE CHAT (SAPA PENGUNJUNG LEBIH DULU)
===================================================================

LIVE VISITORS:
Jika merchant mengaktifkan fitur Proactive Chat, Anda bisa lihat pengunjung yang sedang di website secara real-time.

CARA GUNAKAN:
1. Buka tab "Live Visitors" di Supervisor Panel
2. Lihat daftar pengunjung aktif (dengan info halaman, lokasi, device)
3. Klik pengunjung yang ingin Anda sapa
4. Ketik pesan awal → kirim
5. Widget di browser pengunjung otomatis terbuka dengan pesan Anda

TIPS PROACTIVE CHAT:
- Sapa pengunjung yang sudah lama di halaman pricing/checkout
- Gunakan pesan yang personal dan tidak terasa seperti spam
- Jangan spam banyak pengunjung sekaligus

===================================================================
CHAT SECURITY MONITORING ALERTS
===================================================================

APA ITU SECURITY MONITORING:
AI (Gemini 2.5 Flash) memantau percakapan supervisor untuk mendeteksi aktivitas mencurigakan seperti:
- Percobaan manipulasi harga atau kebijakan di luar SOP
- Sharing informasi sensitif yang tidak semestinya
- Pola percakapan yang tidak wajar

ALERT YANG MUNGKIN MUNCUL:
- Low/Medium/High sensitivity tergantung konfigurasi merchant
- Alert real-time muncul jika ada pola mencurigakan terdeteksi

CATATAN: Konfigurasi monitoring dilakukan oleh merchant di Dashboard → Chat Monitoring. Supervisor tidak mengubah konfigurasi ini, hanya perlu menyadari bahwa percakapan dipantau untuk keamanan.

===================================================================
TIPS & BEST PRACTICES SUPERVISOR
===================================================================

PRODUKTIVITAS:
1. Selalu aktifkan notifikasi suara agar tidak ketinggalan eskalasi baru
2. Setup Telegram Bridge untuk terima notifikasi di mana saja
3. Gunakan Quick Replies untuk mempercepat respons
4. Cek Info Panel untuk konteks customer sebelum merespons
5. Tutup sesi yang sudah selesai agar antrian tetap bersih

WAKTU RESPONS:
- Target respons pertama: < 2 menit setelah eskalasi
- Customer yang sudah menunggu lama akan terlihat dengan tanda waktu di daftar chat
- Jika tidak bisa handle, koordinasi dengan supervisor lain via Team Activity

KOMUNIKASI DENGAN MERCHANT:
- Jika ada pola pertanyaan yang sering dieskalasi → sarankan merchant update Knowledge Base AI
- Jika Quick Replies tidak cukup → minta merchant tambahkan template baru di Dashboard
- Jika butuh perubahan trigger → hubungi merchant untuk update di Dashboard → Triggers
`;
}

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

// ===================================================================
// ENGLISH VARIANTS
// ===================================================================

export function buildSupervisorPanelKnowledgeEn(): string {
  return `
===================================================================
CHATVICE SUPERVISOR PANEL — COMPLETE GUIDE
===================================================================

ABOUT THE SUPERVISOR PANEL:
The Supervisor Panel is a dedicated interface for the human support team that handles escalations from the AI chatbot. Supervisors access this panel at the URL: /supervisor (different from the merchant dashboard).

===================================================================
AUTHENTICATION & LOGIN
===================================================================

HOW TO LOG IN:
1. Open /supervisor (not /dashboard — that is for merchants)
2. Enter the email and password provided by your merchant
3. Click "Login"
4. If you forgot your password, contact the merchant/admin for a reset

ACCOUNT DIFFERENCES:
- Supervisor account: created by the merchant, login at /supervisor
- Merchant account: business owner, login at /dashboard
- Do not mix credentials between the two account types

===================================================================
HANDLING ESCALATED CHATS
===================================================================

ESCALATION FLOW:
1. AI chatbot detects certain keywords or conditions → automatic escalation
2. Or a customer requests to speak with a human → manual escalation
3. Chat enters the supervisor queue with status "Escalated"
4. Notification appears in the supervisor panel (sound + badge)
5. Supervisor clicks "Take Over" to take control of the conversation
6. Status changes to "Human" — AI no longer responds to this session

HOW TO HANDLE AN ESCALATION:
1. View the chat list in the left sidebar of the supervisor panel
2. Chats labeled "Escalated" or with a red badge = need immediate attention
3. Click the chat to open the conversation
4. Read the conversation history for context
5. Click the "Take Over" button in the chat header
6. Start replying to the customer directly
7. When done, click the close/finish session button

ESCALATION HANDLING TIPS:
- Read the full conversation history before responding
- Use Quick Replies for fast responses
- Check the Info Panel (the "i" button) for visitor data (IP, location, device, current page)
- For technical questions, escalate to a senior or close with the appropriate information

CHAT STATUS:
- AI: Handled automatically by the AI agent
- ESCALATED: Waiting for a supervisor (not yet taken over)
- HUMAN: Currently being handled by a supervisor
- CLOSED: Conversation ended/closed

===================================================================
QUICK REPLIES (RESPONSE TEMPLATES)
===================================================================

WHAT ARE QUICK REPLIES:
Pre-written message templates created by the merchant so supervisors can respond faster without retyping common messages.

HOW TO USE QUICK REPLIES DURING A CHAT:
1. Open the conversation you are handling
2. In the message input area, click the Quick Reply icon (usually a lightning/flash icon)
3. Choose a template from the list
4. Edit if needed, then send
5. Or type "/" in the input to trigger Quick Reply suggestions

COMMON QUICK REPLY EXAMPLES:
- "Thank you for contacting us. Please wait a moment, I will assist you."
- "Your request is being processed; estimated [X] business days."
- "We apologize for the inconvenience. May I have your order/transaction number?"

NOTE: Quick Replies are created by the merchant in Dashboard → Quick Replies. Supervisors cannot create or edit templates from the supervisor panel.

===================================================================
TELEGRAM NOTIFICATIONS
===================================================================

WHAT IS THE TELEGRAM BRIDGE:
A feature that lets supervisors receive notifications and reply to customer chats directly from the Telegram app.

HOW TO SET UP TELEGRAM NOTIFICATIONS:
1. Open the Notifications page in the Supervisor Panel (sidebar menu)
2. Find the "Telegram Notifications" section
3. Enter your Telegram Chat ID
   - How to find your Telegram Chat ID: chat with @userinfobot on Telegram → the bot will send you your Chat ID
4. Click Save
5. Make sure the merchant has enabled the Telegram Bridge in Dashboard → Integrations

HOW IT WORKS AFTER SETUP:
- When a chat is escalated, the merchant's Telegram bot will DM you
- The message includes: customer name, brief context, and recent messages
- Customer messages are also forwarded to your Telegram when the session is in HUMAN mode
- You can REPLY directly from Telegram → message is sent to the customer in the widget

TELEGRAM TROUBLESHOOTING:
- Not receiving notifications? Make sure the merchant has enabled "Enable Supervisor Telegram Replies" in Dashboard → Integrations
- Wrong Chat ID? Check again by chatting with @userinfobot on Telegram
- Bot not responding? Contact the merchant to verify the webhook is registered

===================================================================
TEAM ACTIVITY & MONITORING
===================================================================

TEAM ACTIVITY PAGE:
Shows real-time activity of the entire supervisor team:
- Who is online/offline
- Number of active chats per supervisor
- Handle status of each supervisor

HOW TO ACCESS:
- Click the "Team Activity" menu in the Supervisor Panel sidebar

INFORMATION AVAILABLE:
- Supervisor name + online status (green dot = online)
- Number of chats currently being handled
- Shift start time / last seen

===================================================================
VISITOR INFO PANEL
===================================================================

INFO PANEL IN CHAT:
While handling a conversation, you can view detailed information about the customer:
- Click the "Info" button (the "i" icon) in the conversation header
- A panel opens on the right side

INFORMATION AVAILABLE:
- Customer's IP address (with copy button)
- Country and city (with country flag)
- Device: OS, browser, and full user agent
- Page the customer currently has open
- Traffic source (referrer URL or "Direct / Unknown")

USES OF THE INFO PANEL:
- Verify customer location for region-based services
- Check the device to troubleshoot technical issues
- See the customer's current page for question context

===================================================================
PROACTIVE CHAT (REACH OUT TO VISITORS FIRST)
===================================================================

LIVE VISITORS:
If the merchant has enabled Proactive Chat, you can see visitors on the website in real-time.

HOW TO USE:
1. Open the "Live Visitors" tab in the Supervisor Panel
2. View the list of active visitors (with page info, location, device)
3. Click the visitor you want to greet
4. Type an opening message → send
5. The widget in the visitor's browser automatically opens with your message

PROACTIVE CHAT TIPS:
- Greet visitors who have been on the pricing/checkout page for a while
- Use personalized messages that don't feel like spam
- Don't spam many visitors at once

===================================================================
CHAT SECURITY MONITORING ALERTS
===================================================================

WHAT IS SECURITY MONITORING:
AI (Gemini 2.5 Flash) monitors supervisor conversations to detect suspicious activity such as:
- Attempts to manipulate prices or policies outside of SOP
- Sharing sensitive information inappropriately
- Unusual conversation patterns

ALERTS THAT MAY APPEAR:
- Low/Medium/High sensitivity depending on merchant configuration
- Real-time alerts appear when suspicious patterns are detected

NOTE: Monitoring configuration is done by the merchant in Dashboard → Chat Monitoring. Supervisors do not change this configuration; they only need to be aware that conversations are monitored for security.

===================================================================
TIPS & BEST PRACTICES FOR SUPERVISORS
===================================================================

PRODUCTIVITY:
1. Always enable sound notifications so you don't miss new escalations
2. Set up the Telegram Bridge to receive notifications anywhere
3. Use Quick Replies to speed up responses
4. Check the Info Panel for customer context before responding
5. Close completed sessions to keep the queue clean

RESPONSE TIME:
- Target first response: < 2 minutes after escalation
- Customers who have been waiting a long time will show a timestamp indicator in the chat list
- If you can't handle it, coordinate with another supervisor via Team Activity

COMMUNICATION WITH THE MERCHANT:
- If there are frequently escalated question patterns → suggest the merchant update the AI Knowledge Base
- If Quick Replies are insufficient → ask the merchant to add new templates in Dashboard
- If triggers need adjustment → contact the merchant to update them in Dashboard → Triggers
`;
}

export function buildFullDashboardKnowledgeEn(): string {
  return `
===================================================================
CHATVICE DASHBOARD — COMPLETE GUIDE TO ALL FEATURES
===================================================================

DASHBOARD PAGES & THEIR FUNCTIONS:
================================================================

1. OVERVIEW (/dashboard)
   Main page displaying real-time analytics:
   - KPI cards: Total Chats Today, Active Sessions (last 24 hours), AI Resolution Rate, Average Response Time
   - "Active Chats" chart (session trend by day/week)
   - "AI Resolution Rate" chart (AI resolution vs human escalation trend)
   - Status tiles: Agents Online, Supervisors Online, Active Sessions
   - Info Tip (i) on each card explains how the metric is calculated
   [LINK:Open Overview:/dashboard]

2. AI AGENTS (/dashboard/agents)
   Manage the brain of your chatbot:
   - Create, edit, delete AI Agents
   - Each agent has: name, AI model, personality/system prompt, profile photo
   - Choose which agent is "active" for the widget
   - Available models: GPT-4.1-mini (recommended), GPT-4, etc.
   - Limit by plan: Free/Starter=1 agent, Pro=3 agents, Enterprise=10 agents, Custom=unlimited
   HOW TO CREATE A NEW AGENT:
   1. Open [LINK:AI Agents:/dashboard/agents]
   2. Click "Create New Agent" in the top right corner
   3. Enter the agent name (e.g., "Budi Store Assistant")
   4. Choose an AI model (GPT-4.1-mini is recommended for speed and cost efficiency)
   5. Write the personality/system prompt to match your brand
   6. Click Save → set it as the Active Agent
   [LINK:Manage AI Agents:/dashboard/agents]

3. KNOWLEDGE BASE (/dashboard/knowledge)
   Learning material for your AI agent (three tabs):
   TRAINING DATA TAB:
   - Add manual knowledge entries (FAQ, policies, pricing, business hours)
   - Drag-and-drop to set priority order
   - AI will auto-format content when saved
   ACTIVE SOURCES TAB:
   - Enter website URLs to crawl automatically
   - Content syncs periodically so the AI stays up-to-date
   - Great for product pages, website FAQs, blogs
   CREATE WITH AI TAB:
   - Choose your business type and article category
   - AI will generate a knowledge article for you
   - Edit the result before saving
   HOW TO ADD KNOWLEDGE:
   1. Open [LINK:Knowledge Base:/dashboard/knowledge]
   2. Training Data tab → click "Add Entry"
   3. Write the title and content (FAQ, policies, procedures)
   4. Save — AI will auto-format the content
   5. For URLs: Active Sources tab → enter URL → click Crawl
   [LINK:Knowledge Base:/dashboard/knowledge]

4. SOURCES (/dashboard/sources)
   Manage all knowledge sources per agent:
   - Add text/content directly
   - Upload files (PDF, DOCX, TXT)
   - Add website URLs to crawl
   - Set syncEnabled for periodic auto-sync
   - Each source is linked to a specific agent
   [LINK:Knowledge Sources:/dashboard/sources]

5. TRIGGERS (/dashboard/triggers)
   Automatic rules based on keywords:
   - "escalate" trigger: specific keywords immediately escalate to a supervisor
   - "respond" trigger: reply with a custom response
   - Example keywords: "refund", "manager", "complaint", "money back"
   HOW TO CREATE A TRIGGER:
   1. Open [LINK:Triggers:/dashboard/triggers]
   2. Click "Add Trigger"
   3. Enter keyword(s) (or multiple keywords separated by commas)
   4. Choose action: Escalate to Human or Custom Response
   5. Enable the trigger
   [LINK:Triggers:/dashboard/triggers]

6. SESSIONS / CHAT SESSIONS (/dashboard/sessions)
   Monitor all customer conversations in real-time:
   - View active sessions and archives
   - Open individual conversations to read transcripts
   - Filter by status (AI, HUMAN, escalated)
   - View escalation time, customer name, channel
   - Export chat history
   [LINK:Chat Sessions:/dashboard/sessions]

7. CHAT LOGS (/dashboard/chat-logs)
   Archive of completed/archived conversations:
   - Full transcript of each session
   - Filter by date, agent, supervisor
   - Download transcripts
   - Retention period by plan: Free=1 hour, Starter=24 hours, Pro=48 hours, Enterprise=7 days
   [LINK:Chat Logs:/dashboard/chat-logs]

8. ANALYTICS (/dashboard/analytics)
   In-depth data on chatbot performance (Pro/Enterprise/Custom):
   - Most frequently occurring chat topics
   - Keyword ranking — most popular questions
   - Average response time per agent
   - Escalation rate per period
   - Performance trend charts
   [LINK:Analytics:/dashboard/analytics]

9. WIDGET (/dashboard/widget)
   Customize the appearance and configuration of the chat widget (many tabs):
   APPEARANCE TAB: Colors, position (left/right), light/dark theme, custom icon, agent photo
   PRECHAT TAB: Welcome bubble, name collection (ask for name + phone), banner image, AI greeting, profanity filter
   EMBED/DOMAIN TAB: Embed code snippet, allowed domains (whitelist), unregistered domain attempts
   SOCIAL MEDIA TAB: Add social media buttons (WhatsApp, Instagram, etc.) to the widget
   CHAT BUTTONS TAB: Quick action buttons inside the widget
   CLOSING STATEMENT TAB: Automatic closing message when chat is inactive
   HOW TO GET THE EMBED CODE:
   1. Open [LINK:Widget:/dashboard/widget]
   2. Select the Embed tab
   3. Click "Copy" to copy the script
   4. Paste it before the </body> tag in your website's HTML
   [LINK:Widget Settings:/dashboard/widget]

10. SUPERVISORS (/dashboard/supervisors)
    Add and manage your supervisor team:
    - Create supervisor accounts (name, email, password)
    - Set permissions/roles
    - View supervisor online/offline status
    - Limit by plan: Free=0, Starter=1, Pro=3, Enterprise=10, Custom=unlimited
    HOW TO ADD A SUPERVISOR:
    1. Open [LINK:Supervisors:/dashboard/supervisors]
    2. Click "Add Supervisor"
    3. Enter name, email, password
    4. Click Save — the supervisor will receive their credentials
    5. Set their schedule in [LINK:Work Scheduler:/dashboard/work-scheduler]
    [LINK:Supervisors:/dashboard/supervisors]

11. WORK SCHEDULER (/dashboard/work-scheduler)
    Work schedules for supervisors and AI agents:
    - Create work shifts (shift name, start/end time, active days)
    - Assign shifts to supervisors or agents
    - The widget automatically knows when supervisors are online/offline
    - Outside of schedule → AI handles all chats or shows an offline message
    HOW TO CREATE A SCHEDULE:
    1. Open [LINK:Work Scheduler:/dashboard/work-scheduler]
    2. Click "Add Shift"
    3. Enter shift name, start time, end time, active days (Mon–Sun)
    4. Assign to supervisor or agent
    5. Save
    [LINK:Work Scheduler:/dashboard/work-scheduler]

12. QUICK REPLIES (/dashboard/quick-replies)
    Fast response templates for supervisors:
    - Create frequently-used message templates
    - Supervisors can use shortcuts when serving customers
    - Examples: "Thank you, your order is being processed", "Please wait a moment"
    [LINK:Quick Replies:/dashboard/quick-replies]

13. PRODUCT CARDS (/dashboard/product-cards)
    Product cards displayed inside the chat:
    - Create product cards with image, name, price, description, link
    - AI can automatically recommend products to customers
    - Product Catalog Crawler: scan a store URL to extract products using AI
    [LINK:Product Cards:/dashboard/product-cards]

14. PROACTIVE CHAT (/dashboard/proactive-chat)
    Track website visitors in real-time and initiate chat first:
    - View list of visitors currently on the website (IP, location, device, page)
    - Supervisor can click a visitor and send an initial message
    - Customer's widget automatically opens when supervisor sends a message
    - Feature can be enabled/disabled in settings
    HOW TO USE PROACTIVE CHAT:
    1. Enable the feature at [LINK:Proactive Chat:/dashboard/proactive-chat]
    2. Wait for visitors to appear in the live visitors list
    3. Click a visitor → send a greeting message
    4. Their widget opens automatically
    [LINK:Proactive Chat:/dashboard/proactive-chat]

15. LIVE PREVIEW (/dashboard/live-preview)
    Preview the chatbot widget without installing it on your website:
    - Test the widget's appearance and behavior directly from the dashboard
    - Simulate conversations to ensure AI responds correctly
    [LINK:Live Preview:/dashboard/live-preview]

16. CHAT MONITORING (/dashboard/chat-monitoring)
    Security monitoring of supervisor conversations using AI (Gemini 2.5 Flash):
    - Automatic detection of suspicious activity in supervisor conversations
    - Configurable sensitivity (low/medium/high)
    - Real-time alerts when suspicious patterns are detected
    [LINK:Chat Monitoring:/dashboard/chat-monitoring]

17. INTEGRATIONS (/dashboard/integrations)
    Connect Chatvice with external services:
    TELEGRAM BRIDGE:
    - Supervisors can link their Telegram Chat ID
    - Escalated chats are automatically sent as DMs to supervisors on Telegram
    - Supervisor can reply from Telegram directly to the customer
    - Setup: click "Enable Supervisor Telegram Replies" to set up the webhook
    [LINK:Integrations:/dashboard/integrations]

18. CUSTOM DATA SOURCE (/dashboard/custom-data-source)
    Connect your backend panel REST API to query real-time data:
    - AI can answer questions like: "what's my deposit status", "how much did I withdraw?"
    - Settings tab: base URL, auth header, health path, cache TTL, rate limit, API key
    - Intent Lookup tab: create intents (e.g. deposit_status) with trigger keywords, endpoint, fields, response template
    - History tab: audit log of all API calls
    - Default intents: deposit_status, withdraw_status, turnover_progress, last_login_ip
    HOW TO SET UP CUSTOM DATA SOURCE:
    1. Open [LINK:Custom Data Source:/dashboard/custom-data-source]
    2. Settings tab: enter your panel API base URL
    3. Generate an API Key and copy it to your backend panel
    4. Click "Test Connection" to verify
    5. Intent tab: create intents as needed (see presets: deposit_status, etc.)
    6. Download the Postman collection for backend implementation
    [LINK:Custom Data Source:/dashboard/custom-data-source]

19. ADDITIONAL SERVICES (/dashboard/additional-services)
    Paid add-ons for extra features:
    HOSPITALITY ADD-ON ($12/month):
    - AI Hotel Availability Checker with Google Sheet integration
    - Configuration: hotel name, booking URL, Google Sheet (columns: room_name, price_per_night, availability, image_url)
    - Widget displays hotel room cards with best price and availability badges
    - 7-day free trial available
    SMART APPOINTMENT SCHEDULING ($7/month):
    - Appointment booking via chat
    - Integrated calendar management
    HOW TO ACTIVATE AN ADD-ON:
    1. Open [LINK:Additional Services:/dashboard/additional-services]
    2. Click "Start Trial" (7 days free) or "Pay"
    3. Scan the Kompas Pay QR code to pay
    4. Add-on activates after payment is confirmed
    [LINK:Additional Services:/dashboard/additional-services]

20. APPOINTMENTS (/dashboard/appointments)
    Manage appointment bookings from chat (requires Smart Appointment Scheduling add-on):
    - View all appointments created via the chatbot
    - Update appointment status
    - Calendar integration
    [LINK:Appointments:/dashboard/appointments]

21. LEADS / USER DATA (/dashboard/leads)
    Customer data collected from the prechat form:
    - Customer name, email, phone number
    - Interaction history per customer
    - Export lead data
    [LINK:Customer Leads:/dashboard/leads]

22. TEAM ACTIVITY (/dashboard/team-activity)
    Monitor supervisor team activity in real-time:
    - See who is currently online
    - Number of active chats per supervisor
    - Response time per supervisor
    [LINK:Team Activity:/dashboard/team-activity]

23. AFFILIATE (/dashboard/affiliate)
    Affiliate program to earn commissions:
    - Get a unique referral link
    - View referral statistics (clicks, sign-ups, conversions)
    - Commission per referral who subscribes
    - Request withdrawal to bank account/e-wallet
    - Minimum payout applies
    HOW TO JOIN THE AFFILIATE PROGRAM:
    1. Open [LINK:Affiliate Program:/dashboard/affiliate]
    2. Enable the affiliate program
    3. Copy your referral link
    4. Share it with your community/audience
    5. Track commissions in the dashboard
    6. Click "Request Withdrawal" when balance meets the minimum
    [LINK:Affiliate Program:/dashboard/affiliate]

24. PLANS (/dashboard/plans)
    View and upgrade your subscription plan:
    - Free: 50 conversations/month, 1 agent, basic features
    - Starter ($29/month): 500 conversations, 1 agent, email support
    - Pro ($79/month): 5,000 conversations, 3 agents, analytics, custom domain
    - Enterprise ($299/month): 50,000 conversations, 10 agents, dedicated support
    - Custom: contact sales for unlimited features and quota
    Available in monthly or annual billing intervals (save ~17%)
    [LINK:Choose a Plan:/dashboard/plans]

25. BILLING (/dashboard/billing)
    Billing details and payment history:
    - View active plan, renewal date, payment method
    - Invoice history and transactions
    - If there is a pending payment, complete it here
    [LINK:Billing:/dashboard/billing]

26. SETTINGS (/dashboard/settings)
    Merchant account settings:
    - Edit profile (company name, logo, contact)
    - Change password
    - Language and timezone settings
    - Email notification configuration
    [LINK:Settings:/dashboard/settings]

27. WELCOME BUBBLE (/dashboard/welcome-bubble)
    Set the message bubble that appears next to the widget icon:
    - Welcome bubble text
    - Bubble appearance delay
    - Animation
    [LINK:Welcome Bubble:/dashboard/welcome-bubble]

28. CHAT BUTTONS (/dashboard/chat-buttons)
    Action buttons inside the chat window:
    - Create shortcut buttons for customers
    - Examples: "Check Order Status", "Contact Support", "View Catalog"
    [LINK:Chat Buttons:/dashboard/chat-buttons]

29. DATA USAGE (/dashboard/data-usage)
    Monitor resource usage:
    - Number of conversations used vs plan limit
    - Knowledge base usage (storage)
    - Bandwidth usage
    [LINK:Data Usage:/dashboard/data-usage]

30. MARKETPLACE (/dashboard/marketplace)
    Discover additional integrations and templates for your chatbot
    [LINK:Marketplace:/dashboard/marketplace]

31. PROFILE (/dashboard/profile)
    Edit your personal account profile (name, photo, password)
    [LINK:Profile:/dashboard/profile]

===================================================================
KEY WORKFLOWS
===================================================================

WORKFLOW A — SETUP FROM SCRATCH (6 PHASES):
Phase 1: Create AI Agent → [LINK:AI Agents:/dashboard/agents]
Phase 2: Configure Widget Appearance → [LINK:Widget:/dashboard/widget]
Phase 3: Set Up Prechat → [LINK:Widget:/dashboard/widget] (Prechat tab)
Phase 4: Register Your Domain → [LINK:Widget:/dashboard/widget] (Embed tab)
Phase 5: Fill the Knowledge Base → [LINK:Knowledge Base:/dashboard/knowledge]
Phase 6: Deploy to Your Website → copy embed code from [LINK:Widget:/dashboard/widget] Embed tab

WORKFLOW B — MANAGING HUMAN ESCALATIONS:
1. Create triggers in [LINK:Triggers:/dashboard/triggers] with escalation keywords (e.g. "refund", "speak to manager")
2. Add supervisors in [LINK:Supervisors:/dashboard/supervisors]
3. Set supervisor schedules in [LINK:Work Scheduler:/dashboard/work-scheduler]
4. Supervisors log in to the Supervisor Panel to handle chats
5. (Optional) Link supervisor Telegram in [LINK:Integrations:/dashboard/integrations] for Telegram notifications

WORKFLOW C — SETTING UP THE HOSPITALITY ADD-ON:
1. Activate the add-on in [LINK:Additional Services:/dashboard/additional-services]
2. Go to "Manage" under Hospitality → enter hotel name and booking URL
3. Create a Google Sheet with columns: room_name, price_per_night, availability, image_url
4. Paste the Google Sheet URL in the settings
5. Write AI instructions for room recommendations
6. Test by asking about room availability in the widget

WORKFLOW D — CUSTOM DATA SOURCE SETUP (for fintech/gaming businesses):
1. Open [LINK:Custom Data Source:/dashboard/custom-data-source]
2. Settings tab: enter your panel API base URL, auth header name, health path
3. Click "Generate API Key" → copy the key to your backend panel
4. Click "Test Connection" to verify the connection
5. Intent tab: review default intents (deposit_status, withdraw_status, etc.) or create new ones
6. Each intent has: intentKey, trigger keywords, HTTP method, endpoint path, required fields, response template
7. Download the Postman collection for your backend implementation
8. Test by sending a question like "check my deposit, transaction ID TXN001"

WORKFLOW E — PROACTIVE CHAT (reach visitors first):
1. Enable the feature at [LINK:Proactive Chat:/dashboard/proactive-chat]
2. Supervisor logs in to the Supervisor Panel
3. Open the "Live Visitors" tab in the Supervisor Panel
4. Click a detected visitor → start the conversation
5. The customer's widget opens automatically with the supervisor's message

WORKFLOW F — AFFILIATE PROGRAM:
1. Register at [LINK:Affiliate:/dashboard/affiliate]
2. Copy your unique referral link
3. Share it with friends, community, or your audience
4. Track clicks and conversions
5. Request withdrawal when minimum payout is met

===================================================================
THIRD-PARTY INTEGRATIONS
===================================================================

TELEGRAM BRIDGE:
- Merchant enables it in [LINK:Integrations:/dashboard/integrations]
- Supervisor links their Telegram Chat ID in the Supervisor Panel Notifications page
- When there is an escalation, the Telegram bot DMs the supervisor
- Supervisor replies in Telegram → message goes to the customer in the widget
Setup: Integrations → "Enable Supervisor Telegram Replies" → follow the bot instructions

GOOGLE SHEETS:
- For Hospitality: room data from Google Sheet
- For Custom Data Source: transaction lookup via Google Sheet
- Sheet format must match the required template

===================================================================
SECURITY & DOMAINS
===================================================================

DOMAIN WHITELIST:
- Widget only runs on registered and validated domains
- A grace period applies when no domains are registered (widget can run on any domain)
- After 1 domain is registered → strict enforcement is active
- Unknown domain → HTTP 403, recorded in Unregistered Domains
- Approve/dismiss unknown domains in [LINK:Widget:/dashboard/widget] Embed tab

WIDGET IDENTITY VERIFICATION:
- Secure customer authentication using JWT tokens
- Suitable for websites that require customer identity verification

===================================================================
PLANS & FEATURE LIMITS
===================================================================

FREE: 50 conversations/month, 1 AI Agent, 0 supervisors, basic features
STARTER ($29/month): 500 conversations, 1 AI Agent, 1 supervisor, email support
PRO ($79/month): 5,000 conversations, 3 AI Agents, 3 supervisors, analytics, custom domain
ENTERPRISE ($299/month): 50,000 conversations, 10 AI Agents, 10 supervisors, dedicated support
CUSTOM: All unlimited, contact sales

All plans include: knowledge base, triggers, widget embed, escalation to supervisors
Pro and above include: in-depth analytics, custom domain branding
Enterprise and above include: priority support, SLA

===================================================================
CHATBOT OPTIMIZATION TIPS
===================================================================

- Fill the Knowledge Base with comprehensive FAQs → AI gives more accurate answers
- Create Triggers for critical keywords (refund, complaint, urgent)
- Configure the Work Scheduler so AI doesn't forward to supervisors outside business hours
- Use Custom Data Source for businesses that need real-time data (fintech, gaming)
- Review Analytics regularly to identify unanswered questions
- Use Proactive Chat to increase conversions from passive visitors
- Enable AI Greeting in Prechat so the widget feels more personal
- Upload an agent photo in Widget settings for a more trustworthy appearance
`;
}

/**
 * Score a piece of text for English vs Indonesian using keyword heuristics.
 * Returns { en, id } scores.
 */
function scoreLanguage(text: string): { en: number; id: number } {
  const lower = text.toLowerCase();

  const englishMarkers = [
    'how', 'what', 'where', 'when', 'why', 'who', 'which', 'can', 'could',
    'please', 'help', 'want', 'need', 'would', 'should', 'the', 'is', 'are',
    'do', 'does', 'did', 'have', 'has', 'had', 'will', 'get', 'set', 'add',
    'create', 'edit', 'delete', 'show', 'view', 'find', 'use', 'like',
    'my', 'your', 'our', 'their', 'this', 'that', 'these', 'those',
  ];

  const indonesianMarkers = [
    'bagaimana', 'apa', 'dimana', 'kapan', 'mengapa', 'kenapa', 'siapa',
    'bisa', 'tolong', 'mau', 'minta', 'butuh', 'perlu', 'saya', 'kami',
    'anda', 'kalian', 'kamu', 'cara', 'buat', 'buka', 'klik', 'tambah',
    'hapus', 'lihat', 'pakai', 'gunakan', 'dengan', 'untuk', 'dari', 'ke',
    'yang', 'dan', 'atau', 'ini', 'itu', 'sudah', 'belum', 'tidak',
    'juga', 'apakah', 'sudahkah', 'bisakah',
  ];

  let en = 0;
  let id = 0;

  for (const word of englishMarkers) {
    if (new RegExp(`\\b${word}\\b`).test(lower)) en++;
  }
  for (const word of indonesianMarkers) {
    if (new RegExp(`\\b${word}\\b`).test(lower)) id++;
  }

  return { en, id };
}

/**
 * Detect whether a message is predominantly English.
 * Returns true if English, false if Indonesian (or other language).
 */
export function detectEnglish(text: string): boolean {
  const { en, id } = scoreLanguage(text);
  return en > id;
}

/**
 * Detect language from the current question plus recent conversation history.
 * Falls back to history when the current question is too short to classify
 * confidently (fewer than 4 total marker hits). Returns true for English.
 */
export function detectEnglishFromContext(
  question: string,
  conversationHistory?: Array<{ role: string; content: string }>,
): boolean {
  const current = scoreLanguage(question);
  const totalCurrent = current.en + current.id;

  if (totalCurrent >= 4) {
    return current.en > current.id;
  }

  if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
    const recentUserMessages = conversationHistory
      .filter((m) => m.role === 'user')
      .slice(-5)
      .map((m) => m.content)
      .join(' ');

    if (recentUserMessages.trim()) {
      const hist = scoreLanguage(recentUserMessages);
      const combined = {
        en: current.en + hist.en,
        id: current.id + hist.id,
      };
      return combined.en > combined.id;
    }
  }

  return current.en >= current.id;
}
