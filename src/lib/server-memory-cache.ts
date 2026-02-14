type CacheEntry<T> = {
  value: T;
  expiresAtMs: number;
};

export class ServerMemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (entry.expiresAtMs !== -1 && Date.now() > entry.expiresAtMs) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set<T>(key: string, value: T, ttlSeconds: number): void {
    const expiresAtMs = ttlSeconds === -1 ? -1 : Date.now() + ttlSeconds * 1000;
    this.store.set(key, { value, expiresAtMs });
  }

  del(key: string): void {
    this.store.delete(key);
  }

  clearByPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }
}

export const serverMemoryCache = new ServerMemoryCache();

