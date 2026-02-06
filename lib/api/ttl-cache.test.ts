import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TTLCache } from './ttl-cache';

describe('TTLCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should store and retrieve value within TTL', () => {
    const cache = new TTLCache<string>(30 * 60 * 1000); // 30 minutes
    cache.set('key1', 'value1');

    expect(cache.get('key1')).toBe('value1');
    cache.destroy();
  });

  it('should return undefined for expired entry', () => {
    const cache = new TTLCache<string>(30 * 60 * 1000); // 30 minutes
    cache.set('key1', 'value1');

    // Advance time past TTL
    vi.advanceTimersByTime(31 * 60 * 1000); // 31 minutes

    expect(cache.get('key1')).toBeUndefined();
    cache.destroy();
  });

  it('should return value at 29 minute boundary (just before expiration)', () => {
    const cache = new TTLCache<string>(30 * 60 * 1000); // 30 minutes
    cache.set('key1', 'value1');

    // Advance to just before expiration
    vi.advanceTimersByTime(29 * 60 * 1000); // 29 minutes

    expect(cache.get('key1')).toBe('value1');
    cache.destroy();
  });

  it('should return undefined at 30 minute boundary (exact expiration)', () => {
    const cache = new TTLCache<string>(30 * 60 * 1000); // 30 minutes
    cache.set('key1', 'value1');

    // Advance to exact expiration time
    vi.advanceTimersByTime(30 * 60 * 1000); // 30 minutes

    expect(cache.get('key1')).toBeUndefined();
    cache.destroy();
  });

  it('should support custom TTL per entry', () => {
    const cache = new TTLCache<string>(30 * 60 * 1000); // default 30 minutes
    cache.set('key1', 'value1', 5 * 60 * 1000); // 5 minutes custom TTL

    // Advance 4 minutes - should still be valid
    vi.advanceTimersByTime(4 * 60 * 1000);
    expect(cache.get('key1')).toBe('value1');

    // Advance 2 more minutes (total 6) - should be expired
    vi.advanceTimersByTime(2 * 60 * 1000);
    expect(cache.get('key1')).toBeUndefined();

    cache.destroy();
  });

  it('should delete entry immediately', () => {
    const cache = new TTLCache<string>(30 * 60 * 1000);
    cache.set('key1', 'value1');

    expect(cache.get('key1')).toBe('value1');

    cache.delete('key1');
    expect(cache.get('key1')).toBeUndefined();

    cache.destroy();
  });

  it('should handle multiple concurrent entries without collision', () => {
    const cache = new TTLCache<string>(30 * 60 * 1000);
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');

    expect(cache.get('key1')).toBe('value1');
    expect(cache.get('key2')).toBe('value2');
    expect(cache.get('key3')).toBe('value3');

    cache.destroy();
  });

  it('should return correct size', () => {
    const cache = new TTLCache<string>(30 * 60 * 1000);
    expect(cache.size).toBe(0);

    cache.set('key1', 'value1');
    expect(cache.size).toBe(1);

    cache.set('key2', 'value2');
    expect(cache.size).toBe(2);

    cache.delete('key1');
    expect(cache.size).toBe(1);

    cache.destroy();
  });

  it('should force cleanup and return count of removed entries', () => {
    const cache = new TTLCache<string>(30 * 60 * 1000, 60 * 60 * 1000); // 1 hour cleanup interval
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');

    // Advance past TTL but not cleanup interval
    vi.advanceTimersByTime(31 * 60 * 1000);

    // Entries are expired but still in cache (background cleanup hasn't run yet)
    expect(cache.size).toBe(2);

    const removedCount = cache.forceCleanup();
    expect(removedCount).toBe(2);
    expect(cache.size).toBe(0);

    cache.destroy();
  });

  it('should run background cleanup on interval', () => {
    const cache = new TTLCache<string>(5 * 1000, 10 * 1000); // 5s TTL, 10s cleanup interval
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');

    // Advance past entry TTL but not cleanup interval yet
    vi.advanceTimersByTime(6 * 1000); // 6 seconds - entries expired, cleanup hasn't run
    expect(cache.size).toBe(2); // Expired but not cleaned yet

    // Advance to trigger first cleanup interval
    vi.advanceTimersByTime(4 * 1000); // Total 10 seconds - cleanup runs
    expect(cache.size).toBe(0); // Cleaned up by background timer

    cache.destroy();
  });

  it('should clear everything and stop timer on destroy', () => {
    const cache = new TTLCache<string>(30 * 60 * 1000);
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');

    expect(cache.size).toBe(2);

    cache.destroy();
    expect(cache.size).toBe(0);

    // Verify no errors when accessing after destroy
    expect(cache.get('key1')).toBeUndefined();
  });

  it('should lazily delete expired entry on get', () => {
    const cache = new TTLCache<string>(30 * 60 * 1000, 60 * 60 * 1000); // 1 hour cleanup interval
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');

    expect(cache.size).toBe(2);

    // Advance past TTL but not cleanup interval
    vi.advanceTimersByTime(31 * 60 * 1000);

    // Size still shows 2 (lazy deletion, background cleanup hasn't run)
    expect(cache.size).toBe(2);

    // Get triggers lazy deletion
    expect(cache.get('key1')).toBeUndefined();
    expect(cache.size).toBe(1);

    expect(cache.get('key2')).toBeUndefined();
    expect(cache.size).toBe(0);

    cache.destroy();
  });

  it('should handle has() method', () => {
    const cache = new TTLCache<string>(30 * 60 * 1000);
    cache.set('key1', 'value1');

    expect(cache.has('key1')).toBe(true);
    expect(cache.has('key2')).toBe(false);

    // After expiration
    vi.advanceTimersByTime(31 * 60 * 1000);
    expect(cache.has('key1')).toBe(false);

    cache.destroy();
  });

  it('should handle complex object values', () => {
    interface UploadSession {
      chunks: Buffer[];
      totalChunks: number;
      receivedChunks: number;
    }

    const cache = new TTLCache<UploadSession>(30 * 60 * 1000);
    const session: UploadSession = {
      chunks: [Buffer.from('chunk1'), Buffer.from('chunk2')],
      totalChunks: 5,
      receivedChunks: 2,
    };

    cache.set('upload-123', session);

    const retrieved = cache.get('upload-123');
    expect(retrieved).toBeDefined();
    expect(retrieved?.totalChunks).toBe(5);
    expect(retrieved?.receivedChunks).toBe(2);
    expect(retrieved?.chunks).toHaveLength(2);

    cache.destroy();
  });
});
