import { MessageCircle, Rocket, ShieldCheck } from 'lucide-react';

export default function App() {
  return (
    <main className="app-shell">
      <section className="hero-card">
        <div className="badge">Chatvice Project Ready</div>
        <h1>Build smarter customer conversations with Chatvice.</h1>
        <p>
          Chatvice sudah siap sebagai base full-stack project. Selanjutnya kita bisa
          kembangkan fitur chat, assistant, dashboard, database, auth, dan integrasi API.
        </p>
        <div className="action-row">
          <a href="/api/health" target="_blank" rel="noreferrer" className="primary-button">
            Check API Health
          </a>
          <span className="status-pill">GitHub → Replit ready</span>
        </div>
      </section>

      <section className="feature-grid">
        <article>
          <MessageCircle size={28} />
          <h2>Chat Core</h2>
          <p>Fondasi untuk fitur percakapan, inbox, AI assistant, dan customer support flow.</p>
        </article>
        <article>
          <ShieldCheck size={28} />
          <h2>Secure Backend</h2>
          <p>Express API siap dikembangkan untuk auth, database, dan permission role.</p>
        </article>
        <article>
          <Rocket size={28} />
          <h2>Replit Deploy</h2>
          <p>Struktur dibuat agar mudah dipull ke Replit, dites, lalu direpublish.</p>
        </article>
      </section>
    </main>
  );
}
