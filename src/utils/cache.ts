import { debugStats } from './debugStats';

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  hits: number;
}

export class LRUCache<K, V> {
  private cache: Map<K, CacheEntry<V>> = new Map();
  private maxSize: number;
  private ttl: number;
  private trackMetrics: boolean;

  constructor(maxSize: number = 100, ttlMs: number = 300000, trackMetrics: boolean = true) {
    this.maxSize = maxSize;
    this.ttl = ttlMs;
    this.trackMetrics = trackMetrics;
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      if (this.trackMetrics) {
        debugStats.recordCacheMiss();
      }
      return undefined;
    }

    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      if (this.trackMetrics) {
        debugStats.recordCacheMiss();
      }
      return undefined;
    }

    entry.hits++;
    this.cache.delete(key);
    this.cache.set(key, entry);

    if (this.trackMetrics) {
      debugStats.recordCacheHit();
    }

    return entry.value;
  }

  set(key: K, value: V): void {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    const entries = Array.from(this.cache.values());
    const totalHits = entries.reduce((sum, e) => sum + e.hits, 0);
    const avgHits = entries.length > 0 ? totalHits / entries.length : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      totalHits,
      avgHits,
      hitRate: entries.length > 0 ? (entries.filter(e => e.hits > 0).length / entries.length) * 100 : 0,
    };
  }
}

export class QueryCache {
  private cache: LRUCache<string, any>;
  private keyGenerator: (input: string) => string;

  constructor(maxSize?: number, ttlMs?: number, keyGenerator?: (input: string) => string) {
    this.cache = new LRUCache(maxSize, ttlMs);
    this.keyGenerator = keyGenerator || this.defaultKeyGenerator;
  }

  private defaultKeyGenerator(input: string): string {
    return input.toLowerCase().trim();
  }

  get(input: string): any | undefined {
    const key = this.keyGenerator(input);
    return this.cache.get(key);
  }

  set(input: string, result: any): void {
    const key = this.keyGenerator(input);
    this.cache.set(key, result);
  }

  has(input: string): boolean {
    const key = this.keyGenerator(input);
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    return this.cache.getStats();
  }
}

let instanceCache: LRUCache<string, any> | null = null;

export function getGlobalCache(): LRUCache<string, any> {
  if (!instanceCache) {
    instanceCache = new LRUCache(200, 600000);
  }
  return instanceCache;
}
