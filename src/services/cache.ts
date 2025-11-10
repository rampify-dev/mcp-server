/**
 * Simple in-memory cache with TTL support
 */

import { config } from '../config.js';
import { logger } from '../utils/logger.js';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class Cache {
  private store: Map<string, CacheEntry<any>>;
  private defaultTTL: number;

  constructor(defaultTTL?: number) {
    this.store = new Map();
    this.defaultTTL = defaultTTL || config.cacheTTL;

    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Generate cache key from parts
   */
  generateKey(...parts: (string | number | undefined)[]): string {
    return parts.filter(Boolean).join(':');
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);

    if (!entry) {
      logger.debug(`Cache miss: ${key}`);
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      logger.debug(`Cache expired: ${key}`);
      this.store.delete(key);
      return null;
    }

    logger.debug(`Cache hit: ${key}`);
    return entry.value as T;
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const ttlSeconds = ttl || this.defaultTTL;
    const expiresAt = Date.now() + (ttlSeconds * 1000);

    this.store.set(key, { value, expiresAt });
    logger.debug(`Cache set: ${key} (TTL: ${ttlSeconds}s)`);
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete specific key
   */
  delete(key: string): boolean {
    logger.debug(`Cache delete: ${key}`);
    return this.store.delete(key);
  }

  /**
   * Delete all keys matching pattern
   */
  deletePattern(pattern: string): number {
    let deleted = 0;
    const regex = new RegExp(pattern);

    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        deleted++;
      }
    }

    logger.debug(`Cache delete pattern: ${pattern} (deleted ${deleted} keys)`);
    return deleted;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    const size = this.store.size;
    this.store.clear();
    logger.debug(`Cache cleared (${size} keys)`);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cache cleanup: removed ${cleaned} expired entries`);
    }
  }

  /**
   * Get cache stats
   */
  getStats(): {
    size: number;
    hits: number;
    misses: number;
  } {
    return {
      size: this.store.size,
      hits: 0, // Would need to track these
      misses: 0,
    };
  }

  /**
   * Get or set with factory function
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }
}

export const cache = new Cache();
