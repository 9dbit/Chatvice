export type OnboardingCheckpointId =
  | "agent"
  | "widget-settings"
  | "prechat"
  | "domain"
  | "knowledge"
  | "deploy";

export type OnboardingFlagKey =
  | "onboardingWidgetInstalled"
  | "onboardingPrechatConfigured"
  | "onboardingDomainRegistered"
  | "onboardingKnowledgeConfigured"
  | "onboardingDeployed";

export interface OnboardingTutorialStep {
  title: string;
  body: string;
}

export interface OnboardingPhase {
  id: OnboardingCheckpointId;
  number: number;
  title: string;
  description: string;
  guidePath: string;
  deepLinkLabel: string;
  deepLinkHref: string;
  manualMarkable: boolean;
  flagKey?: OnboardingFlagKey;
  autoDetectHint: string;
  tutorial: OnboardingTutorialStep[];
}

export const onboardingPhases: OnboardingPhase[] = [
  {
    id: "agent",
    number: 1,
    title: "Buat AI Agent pertama",
    description:
      "Agent adalah otak chatbot Anda. Tanpa agent, widget tidak bisa menjawab pesan.",
    guidePath: "/agents",
    deepLinkLabel: "Buka halaman AI Agents",
    deepLinkHref: "/dashboard/agents",
    manualMarkable: false,
    autoDetectHint: "Selesai otomatis ketika minimal 1 agent dibuat.",
    tutorial: [
      {
        title: "Buka halaman AI Agents",
        body: "Di sidebar dashboard, klik menu AI Agents untuk masuk ke halaman pengelolaan agent.",
      },
      {
        title: "Klik Buat Agent Baru",
        body: "Tekan tombol Buat Agent Baru di pojok kanan atas halaman.",
      },
      {
        title: "Isi data agent",
        body: "Tulis nama agent (contoh: Asisten Toko), pilih model AI (GPT-4.1-mini direkomendasikan), dan tulis kepribadian/peran agent agar respons sesuai brand.",
      },
      {
        title: "Aktifkan agent",
        body: "Klik Simpan, lalu jadikan agent ini sebagai Agent Aktif untuk widget. Agent inilah yang akan menyapa pengunjung Anda.",
      },
    ],
  },
  {
    id: "widget-settings",
    number: 2,
    title: "Atur tampilan widget",
    description:
      "Sesuaikan warna, posisi, ikon, greeting, dan suggested questions agar widget cocok dengan brand Anda.",
    guidePath: "/widget",
    deepLinkLabel: "Buka halaman Widget",
    deepLinkHref: "/dashboard/widget",
    manualMarkable: true,
    flagKey: "onboardingWidgetInstalled",
    autoDetectHint:
      "Tandai selesai setelah Anda menyimpan pengaturan dasar widget.",
    tutorial: [
      {
        title: "Buka halaman Widget",
        body: "Dari sidebar, klik menu Widget untuk masuk ke pengaturan tampilan.",
      },
      {
        title: "Pilih warna dan posisi",
        body: "Atur warna utama widget (sebaiknya sama dengan warna brand), pilih posisi bubble (kiri atau kanan), dan tema terang/gelap.",
      },
      {
        title: "Upload ikon dan foto agent",
        body: "Upload ikon widget kustom (opsional) dan foto profil agent agar terlihat lebih personal.",
      },
      {
        title: "Atur greeting dan suggested questions",
        body: "Tulis pesan sambutan yang muncul saat widget dibuka. Tambahkan suggested questions agar pengunjung tahu apa saja yang bisa ditanyakan.",
      },
      {
        title: "Pilih mode interaksi",
        body: "Pilih click-to-open (widget terbuka ketika diklik) atau auto-open (widget terbuka otomatis dengan greeting AI).",
      },
      {
        title: "Tandai selesai",
        body: "Setelah semua pengaturan dasar disimpan, klik Tandai selesai pada checklist Getting Started.",
      },
    ],
  },
  {
    id: "prechat",
    number: 3,
    title: "Konfigurasi Prechat",
    description:
      "Atur welcome bubble, name collection, banner, dan AI greeting untuk pengalaman pertama yang menarik.",
    guidePath: "/widget",
    deepLinkLabel: "Buka tab Prechat di Widget",
    deepLinkHref: "/dashboard/widget",
    manualMarkable: true,
    flagKey: "onboardingPrechatConfigured",
    autoDetectHint: "Tandai selesai setelah pengaturan prechat disimpan.",
    tutorial: [
      {
        title: "Buka tab Prechat",
        body: "Di halaman Widget, pilih tab Prechat untuk membuka pengaturan formulir awal.",
      },
      {
        title: "Aktifkan welcome bubble",
        body: "Tulis pesan singkat yang muncul di samping ikon widget untuk menarik perhatian pengunjung.",
      },
      {
        title: "Atur name collection",
        body: "Aktifkan name collection bila Anda ingin meminta nama (dan opsional nomor HP) sebelum chat dimulai.",
      },
      {
        title: "Upload banner prechat",
        body: "Upload gambar banner (opsional) untuk menampilkan promo, jam operasional, atau brand di atas form prechat.",
      },
      {
        title: "Aktifkan AI greeting",
        body: "Bila ingin AI menyapa pengunjung lebih dulu dengan pesan personal, aktifkan AI greeting di pengaturan.",
      },
      {
        title: "Tandai selesai",
        body: "Setelah semua disimpan, klik Tandai selesai pada checklist.",
      },
    ],
  },
  {
    id: "domain",
    number: 4,
    title: "Daftarkan domain website",
    description:
      "Tambahkan domain website Anda ke whitelist agar widget hanya berjalan di tempat yang sah.",
    guidePath: "/widget",
    deepLinkLabel: "Buka tab Embed/Domain di Widget",
    deepLinkHref: "/dashboard/widget",
    manualMarkable: true,
    flagKey: "onboardingDomainRegistered",
    autoDetectHint:
      "Selesai otomatis ketika minimal 1 domain ter-validate.",
    tutorial: [
      {
        title: "Buka tab Embed/Domain",
        body: "Di halaman Widget, pilih tab Embed (Allowed Domains) untuk mengelola domain yang diizinkan.",
      },
      {
        title: "Tambah domain",
        body: "Klik Tambah Domain dan masukkan domain website Anda (contoh: example.com, tanpa http:// dan tanpa www).",
      },
      {
        title: "Validasi domain",
        body: "Klik tombol Validasi. Sistem akan memeriksa apakah widget sudah terpasang di domain tersebut. Jika berhasil, badge Tervalidasi akan muncul.",
      },
      {
        title: "Tinjau Unregistered Domains",
        body: "Bila ada domain lain yang mencoba menggunakan widget, akan muncul di panel Unregistered Domains. Approve domain yang sah atau dismiss yang tidak.",
      },
    ],
  },
  {
    id: "knowledge",
    number: 5,
    title: "Atur Knowledge Base",
    description:
      "Beri AI bahan belajar lewat Training Data, Active Sources, dan Create with AI agar jawaban akurat.",
    guidePath: "/knowledge",
    deepLinkLabel: "Buka halaman Knowledge Base",
    deepLinkHref: "/dashboard/knowledge",
    manualMarkable: true,
    flagKey: "onboardingKnowledgeConfigured",
    autoDetectHint:
      "Selesai otomatis ketika minimal 1 source aktif atau 1 entry training data dibuat.",
    tutorial: [
      {
        title: "Buka halaman Knowledge Base",
        body: "Dari sidebar, klik menu Knowledge Base untuk mulai melatih AI Anda.",
      },
      {
        title: "Tab Training Data",
        body: "Tambahkan informasi inti bisnis Anda (FAQ, kebijakan, jam operasional, harga) sebagai entri training. Bisa drag-and-drop untuk mengatur urutan.",
      },
      {
        title: "Tab Active Sources",
        body: "Masukkan URL website Anda untuk di-crawl otomatis. Konten akan tersinkron berkala sehingga AI selalu up-to-date.",
      },
      {
        title: "Tab Create with AI",
        body: "Pilih jenis bisnis dan kategori, lalu biarkan AI membuat artikel pengetahuan untuk Anda. Edit hasilnya bila perlu.",
      },
      {
        title: "AI auto-format",
        body: "Saat menyimpan, sistem akan otomatis merapikan format konten sehingga lebih mudah dipahami AI.",
      },
      {
        title: "Tandai selesai",
        body: "Setelah minimal satu sumber aktif, klik Tandai selesai. Selesai otomatis bila Anda menambah source.",
      },
    ],
  },
  {
    id: "deploy",
    number: 6,
    title: "Deploy ke website",
    description:
      "Pasang snippet widget di website Anda, verifikasi muncul, dan kirim test message.",
    guidePath: "/widget",
    deepLinkLabel: "Buka tab Embed di Widget",
    deepLinkHref: "/dashboard/widget",
    manualMarkable: true,
    flagKey: "onboardingDeployed",
    autoDetectHint:
      "Selesai otomatis ketika menerima minimal 1 sesi chat (artinya widget sudah live).",
    tutorial: [
      {
        title: "Copy snippet embed",
        body: "Buka halaman Widget, pilih tab Embed, lalu klik Copy untuk menyalin script tag widget Anda.",
      },
      {
        title: "Paste sebelum </body>",
        body: "Buka kode website Anda dan paste snippet tersebut tepat sebelum tag penutup </body>. Untuk WordPress, gunakan plugin code injection di footer.",
      },
      {
        title: "Refresh website",
        body: "Buka website Anda di browser dan pastikan ikon widget muncul di sudut yang Anda atur.",
      },
      {
        title: "Kirim test message",
        body: "Klik widget, kirim pesan test, dan pastikan AI agent menjawab dengan benar.",
      },
      {
        title: "Verifikasi domain",
        body: "Pastikan domain website sudah ter-validate (lihat fase Daftarkan Domain) agar widget tidak diblok.",
      },
      {
        title: "Tandai selesai",
        body: "Klik Tandai selesai. Selamat, chatbot Anda kini live!",
      },
    ],
  },
];

export function getOnboardingPhase(id: OnboardingCheckpointId): OnboardingPhase | undefined {
  return onboardingPhases.find((p) => p.id === id);
}

export const ONBOARDING_FLAG_KEYS: OnboardingFlagKey[] = [
  "onboardingWidgetInstalled",
  "onboardingPrechatConfigured",
  "onboardingDomainRegistered",
  "onboardingKnowledgeConfigured",
  "onboardingDeployed",
];

// ───────────────────────────── Knowledge serialization ─────────────────────────────

export function buildOnboardingKnowledgeForGuide(): string {
  const lines: string[] = [];
  lines.push("===== ALUR ONBOARDING CHATVICE (6 FASE) =====");
  lines.push(
    "Chatvice memandu setiap merchant baru lewat 6 fase berurutan. Checklist Getting Started di dashboard menampilkan semua fase ini dengan tutorial dan tombol Tandai selesai. Bila merchant bertanya bagaimana memulai, gunakan struktur 6 fase di bawah."
  );
  lines.push("");

  for (const phase of onboardingPhases) {
    lines.push(
      `FASE ${phase.number} — ${phase.title.toUpperCase()} (id: ${phase.id})`
    );
    lines.push(`Deskripsi: ${phase.description}`);
    lines.push(`Halaman: [LINK:${phase.deepLinkLabel}:${phase.guidePath}]`);
    lines.push(`Auto-detect: ${phase.autoDetectHint}`);
    lines.push("Langkah tutorial:");
    phase.tutorial.forEach((step, idx) => {
      lines.push(`  ${idx + 1}. ${step.title} — ${step.body}`);
    });
    lines.push("");
  }

  lines.push("Tombol cepat onboarding yang bisa Anda tawarkan ke merchant:");
  for (const phase of onboardingPhases) {
    lines.push(
      `  [BTN:Fase ${phase.number} ${phase.title}:Bagaimana cara ${phase.title.toLowerCase()}?]`
    );
  }
  lines.push("");

  return lines.join("\n");
}

export function buildOnboardingKnowledgePublic(): string {
  const lines: string[] = [];
  lines.push("===== ALUR ONBOARDING CHATVICE (RINGKAS) =====");
  lines.push(
    "Setelah daftar, merchant melalui 6 fase singkat sampai chatbot live di website mereka:"
  );
  for (const phase of onboardingPhases) {
    lines.push(`${phase.number}. ${phase.title} — ${phase.description}`);
  }
  lines.push(
    "Setiap fase punya tutorial mini di dashboard dengan tombol Tandai selesai dan deep link ke halaman terkait."
  );
  lines.push("");
  return lines.join("\n");
}

export function buildOnboardingWorkflowGuidance(): string {
  const lines: string[] = [];
  lines.push("WORKFLOW GUIDANCE (6 FASE ONBOARDING):");
  lines.push(
    "Ketika merchant bertanya cara setup chatbot dari awal, ikuti urutan 6 fase ini:"
  );
  lines.push("");
  for (const phase of onboardingPhases) {
    lines.push(
      `${phase.number}. ${phase.title.toUpperCase()} ([LINK:${phase.deepLinkLabel}:${phase.guidePath}]):`
    );
    phase.tutorial.forEach((step, idx) => {
      lines.push(`   ${String.fromCharCode(97 + idx)}. ${step.title} — ${step.body}`);
    });
    lines.push("");
  }
  return lines.join("\n");
}

export const ONBOARDING_INITIAL_MESSAGE_BUTTONS = onboardingPhases
  .map(
    (p) =>
      `[BTN:Fase ${p.number} ${p.title}:Bagaimana cara ${p.title.toLowerCase()}?]`
  )
  .join("\n");
