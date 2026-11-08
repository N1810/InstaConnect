/**
 * Interface for configurable caching in InstaConnect.
 * Compatible with In-Memory, Redis, Upstash, or Database key-value stores.
 */
export interface CacheAdapter {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear?(): Promise<void>;
}

interface MemoryEntry<T> {
  value: T;
  expiresAt: number | null;
}

/**
 * Built-in thread-safe in-memory LRU-like cache adapter with TTL expiration.
 * Ideal for local development and single-instance server deployments.
 */
export class MemoryCacheAdapter implements CacheAdapter {
  private readonly store = new Map<string, MemoryEntry<unknown>>();
  private readonly maxEntries: number;
  private readonly defaultTtlSeconds: number;

  constructor(options: { maxEntries?: number; defaultTtlSeconds?: number } = {}) {
    this.maxEntries = options.maxEntries ?? 500;
    this.defaultTtlSeconds = options.defaultTtlSeconds ?? 300;
  }

  public async get<T = unknown>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    // Refresh insertion order for LRU behavior
    this.store.delete(key);
    this.store.set(key, entry);

    return entry.value as T;
  }

  public async set<T = unknown>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const effectiveTtl = ttlSeconds ?? this.defaultTtlSeconds;
    if (effectiveTtl <= 0) {
      this.store.delete(key);
      return;
    }

    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + effectiveTtl * 1000
    });
  }

  public async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  public async clear(): Promise<void> {
    this.store.clear();
  }

  public size(): number {
    return this.store.size;
  }
}

/**
 * Minimal interface representing any Redis client (e.g. `ioredis`, `@upstash/redis`, `redis`).
 */
export interface RedisLikeClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: unknown[]): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

/**
 * Redis-compatible cache adapter.
 * Wraps any standard Redis or Upstash client with namespace prefixing and JSON serialization.
 */
export class RedisCacheAdapter implements CacheAdapter {
  private readonly client: RedisLikeClient;
  private readonly prefix: string;
  private readonly defaultTtlSeconds: number;

  constructor(
    client: RedisLikeClient,
    options: { prefix?: string; defaultTtlSeconds?: number } = {}
  ) {
    this.client = client;
    this.prefix = options.prefix ?? "instaconnect:cache:";
    this.defaultTtlSeconds = options.defaultTtlSeconds ?? 300;
  }

  private formatKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  public async get<T = unknown>(key: string): Promise<T | null> {
    const raw = await this.client.get(this.formatKey(key));
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  public async set<T = unknown>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.defaultTtlSeconds;
    const serialized = JSON.stringify(value);
    await this.client.set(this.formatKey(key), serialized, "EX", ttl);
  }

  public async delete(key: string): Promise<void> {
    await this.client.del(this.formatKey(key));
  }
}

/**
 * No-op cache adapter when caching is disabled.
 */
export class NoopCacheAdapter implements CacheAdapter {
  public async get<T = unknown>(_key: string): Promise<T | null> {
    return null;
  }

  public async set<T = unknown>(_key: string, _value: T, _ttlSeconds?: number): Promise<void> {
    // No-op
  }

  public async delete(_key: string): Promise<void> {
    // No-op
  }
}

