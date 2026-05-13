# Chatvice

Chatvice adalah project web/app berbasis full-stack untuk dikembangkan melalui GitHub dan dijalankan/deploy melalui Replit.

## Development Flow

- **GitHub** menjadi source utama kode.
- **Replit** digunakan untuk run, test, deploy, dan republish.
- Semua pengembangan fitur dibuat di repository ini, lalu Replit tinggal pull/sync dari GitHub.

## Tech Stack Awal

- React + Vite untuk frontend
- Express + TypeScript untuk backend
- Shared TypeScript untuk type/schema bersama
- Siap dikembangkan ke PostgreSQL/Drizzle/Auth/API integration

## Struktur Project

```text
client/       Frontend React
server/       Backend Express API
shared/       Shared types/schema
.env.example  Contoh environment variables
replit.md     Catatan setup Replit dan development rules
```

## Local / Replit Run

```bash
npm install
npm run dev
```

Frontend dan backend akan berjalan dari satu command development.

## Next Development

Tahap berikutnya:

1. Setup database PostgreSQL.
2. Setup auth user/admin.
3. Buat core fitur Chatvice sesuai konsep produk.
4. Setup production build dan deployment Replit.
