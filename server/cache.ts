
// Simple LRU cache (upgrade to Redis for production)
class LRUCache<T> {
  private cache = new Map<string, { value: T; expiry: number }>();
  private maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  set(key: string, value: T, ttlMs = 60000): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlMs,
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    // Move to end (LRU behavior)
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    return entry.value;
  }

  clear(): void {
    this.cache.clear();
  }
}

export const merchantCache = new LRUCache<any>(500);
export const agentCache = new LRUCache<any>(1000);
export const knowledgeCache = new LRUCache<any>(200);

// Auto-cleanup expired entries every minute
setInterval(() => {
  const now = Date.now();
  
  [merchantCache, agentCache, knowledgeCache].forEach(cache => {
    for (const [key, entry] of (cache as any).cache.entries()) {
      if (now > entry.expiry) {
        (cache as any).cache.delete(key);
      }
    }
  });
}, 60000);
