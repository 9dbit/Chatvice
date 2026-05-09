import crypto from "crypto";

const APPROX_CHARS_PER_TOKEN = 4;

export const AI_LIMITS = {
  SYSTEM_PROMPT_MAX_TOKENS: 800,
  KB_CONTEXT_MAX_TOKENS: 1500,
  HISTORY_MAX_MESSAGES: 10,
  FAQ_CACHE_TTL_MS: 6 * 60 * 60 * 1000,
  FAQ_CACHE_MAX_ENTRIES: 5000,
  FAQ_MIN_QUESTION_LEN: 8,
  FAQ_MAX_QUESTION_LEN: 240,
} as const;

export function approxTokenCount(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / APPROX_CHARS_PER_TOKEN);
}

export function truncateToTokens(text: string, maxTokens: number): { text: string; truncated: boolean } {
  if (!text) return { text: "", truncated: false };
  const maxChars = maxTokens * APPROX_CHARS_PER_TOKEN;
  if (text.length <= maxChars) return { text, truncated: false };
  return { text: text.slice(0, maxChars), truncated: true };
}

export function capKnowledgeChunks(chunks: string[], maxTokens: number = AI_LIMITS.KB_CONTEXT_MAX_TOKENS, maxChunks: number = 5): string {
  const limited = chunks.slice(0, maxChunks);
  let total = 0;
  const out: string[] = [];
  for (const c of limited) {
    const t = approxTokenCount(c);
    if (total + t > maxTokens) {
      const remaining = Math.max(0, maxTokens - total);
      if (remaining > 50) {
        out.push(truncateToTokens(c, remaining).text);
      }
      break;
    }
    out.push(c);
    total += t;
  }
  return out.join("\n\n---\n\n");
}

export function capSystemPrompt(prompt: string, maxTokens: number = AI_LIMITS.SYSTEM_PROMPT_MAX_TOKENS): { text: string; truncated: boolean; originalTokens: number } {
  const originalTokens = approxTokenCount(prompt);
  const { text, truncated } = truncateToTokens(prompt, maxTokens);
  return { text, truncated, originalTokens };
}

function normalizeQuestion(q: string): string {
  return q
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim();
}

interface CacheEntry {
  answer: string;
  expiresAt: number;
  hits: number;
}

const faqStore = new Map<string, CacheEntry>();
let faqHits = 0;
let faqMisses = 0;

function makeKey(merchantId: string, agentId: string | undefined | null, question: string): string {
  const normalized = normalizeQuestion(question);
  const h = crypto.createHash("sha1").update(`${merchantId}|${agentId || ""}|${normalized}`).digest("hex");
  return h;
}

export function isCacheableQuestion(question: string): boolean {
  if (!question) return false;
  const len = question.length;
  if (len < AI_LIMITS.FAQ_MIN_QUESTION_LEN || len > AI_LIMITS.FAQ_MAX_QUESTION_LEN) return false;
  const lower = question.toLowerCase();
  const dynamicKeywords = [
    "saya", "akun saya", "username", "user id", "id saya", "deposit", "withdraw", "wd", "depo",
    "transaksi", "saldo", "status", "kode", "otp", "verifikasi", "no hp", "nomor hp",
    "email saya", "pesanan saya", "order saya", "rek", "rekening", "ip", "login terakhir",
    "turnover", "ttd", "saldo saya", "@", "rp ", "idr ", "$",
  ];
  if (dynamicKeywords.some(k => lower.includes(k))) return false;
  if (/\d{4,}/.test(question)) return false;
  return true;
}

export function getFaqCache(merchantId: string, agentId: string | undefined | null, question: string): string | null {
  if (!isCacheableQuestion(question)) return null;
  const key = makeKey(merchantId, agentId, question);
  const entry = faqStore.get(key);
  if (!entry) {
    faqMisses++;
    return null;
  }
  if (entry.expiresAt < Date.now()) {
    faqStore.delete(key);
    faqMisses++;
    return null;
  }
  entry.hits++;
  faqHits++;
  return entry.answer;
}

export function setFaqCache(merchantId: string, agentId: string | undefined | null, question: string, answer: string): void {
  if (!isCacheableQuestion(question)) return;
  if (!answer || answer.length < 20 || answer.length > 4000) return;
  if (/\[.*?\]/.test(answer)) return;
  if (faqStore.size >= AI_LIMITS.FAQ_CACHE_MAX_ENTRIES) {
    const firstKey = faqStore.keys().next().value;
    if (firstKey) faqStore.delete(firstKey);
  }
  const key = makeKey(merchantId, agentId, question);
  faqStore.set(key, {
    answer,
    expiresAt: Date.now() + AI_LIMITS.FAQ_CACHE_TTL_MS,
    hits: 0,
  });
}

export function getFaqCacheStats() {
  return {
    size: faqStore.size,
    hits: faqHits,
    misses: faqMisses,
    hitRate: faqHits + faqMisses > 0 ? faqHits / (faqHits + faqMisses) : 0,
  };
}

export function clearFaqCacheAll(): number {
  const n = faqStore.size;
  faqStore.clear();
  return n;
}
