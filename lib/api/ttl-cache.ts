/**
 * TTL Cache - Time-to-live cache with lazy deletion and background cleanup
 *
 * Features:
 * - Generic type support for any value type
 * - Configurable default TTL per cache instance
 * - Optional custom TTL per entry
 * - Lazy deletion on access (get returns undefined for expired entries)
 * - Background cleanup timer with .unref() for serverless safety
 * - Manual cleanup via forceCleanup()
 * - Proper cleanup via destroy() to prevent memory leaks
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class TTLCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private defaultTTL: number;
  private cleanupInterval: number;
  private cleanupTimer?: NodeJS.Timeout;

  /**
   * Create a new TTL cache
   * @param defaultTTL Default time-to-live in milliseconds (default: 30 minutes)
   * @param cleanupInterval Background cleanup interval in milliseconds (default: 5 minutes)
   */
  constructor(defaultTTL: number = 30 * 60 * 1000, cleanupInterval: number = 5 * 60 * 1000) {
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
    this.cleanupInterval = cleanupInterval;

    // Start background cleanup timer
    this.cleanupTimer = setInterval(() => {
      this.forceCleanup();
    }, this.cleanupInterval);

    // Use unref() so timer doesn't prevent serverless process from exiting
    this.cleanupTimer.unref();
  }

  /**
   * Store a value with optional custom TTL
   * @param key Cache key
   * @param value Value to store
   * @param ttl Optional custom TTL in milliseconds (defaults to instance defaultTTL)
   */
  set(key: string, value: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl ?? this.defaultTTL);
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Retrieve a value if it exists and hasn't expired
   * Lazily deletes expired entries on access
   * @param key Cache key
   * @returns Value if found and not expired, undefined otherwise
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    // Lazy deletion: check if expired
    if (Date.now() >= entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Check if key exists and hasn't expired (without lazy deletion)
   * @param key Cache key
   * @returns true if key exists and not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    // Check expiration but don't delete (has is read-only check)
    if (Date.now() >= entry.expiresAt) {
      return false;
    }

    return true;
  }

  /**
   * Delete a key immediately (for completed uploads)
   * @param key Cache key
   * @returns true if key existed and was deleted
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Get the number of entries in cache (including expired but not yet cleaned)
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Force cleanup of all expired entries
   * @returns Number of entries removed
   */
  forceCleanup(): number {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Clear all entries and stop background cleanup timer
   * Call this when cache is no longer needed to prevent memory leaks
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.cache.clear();
  }
}
