/**
 * API Response Cache — P1 Performance
 * 
 * Simple TTL-based cache for static/semi-static API data.
 * Prevents redundant network calls for agents list, policy templates, etc.
 */

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const cache = new Map<string, CacheEntry<any>>();

const DEFAULT_TTL_MS = 60000; // 1 minute

/**
 * Get cached data or fetch fresh
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<T> {
  const existing = cache.get(key);
  if (existing && existing.expiry > Date.now()) {
    return existing.data;
  }

  const data = await fetcher();
  cache.set(key, { data, expiry: Date.now() + ttlMs });
  return data;
}

/**
 * Invalidate a specific cache key
 */
export function invalidateCache(key: string): void {
  cache.delete(key);
}

/**
 * Invalidate all keys matching a prefix
 */
export function invalidateCachePrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

/**
 * Clear entire cache
 */
export function clearCache(): void {
  cache.clear();
}

// Pre-defined cache keys
export const CACHE_KEYS = {
  AGENTS_LIST: 'agents_list',
  POLICY_TEMPLATES: 'policy_templates',
  EXECUTION_STATS: 'execution_stats',
  FLEET_OVERVIEW: 'fleet_overview',
} as const;
