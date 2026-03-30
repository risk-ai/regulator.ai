/**
 * Redis Caching Layer
 * In-memory caching for frequently accessed data
 */

// Simple in-memory cache for Vercel serverless (no Redis needed)
// For production scale, replace with Redis/Upstash

const cache = new Map();
const ttls = new Map();

const DEFAULT_TTL = 60000; // 60 seconds

function set(key, value, ttl = DEFAULT_TTL) {
  cache.set(key, value);
  
  if (ttl > 0) {
    ttls.set(key, Date.now() + ttl);
    
    // Auto-cleanup
    setTimeout(() => {
      cache.delete(key);
      ttls.delete(key);
    }, ttl);
  }
}

function get(key) {
  // Check if expired
  const expiry = ttls.get(key);
  if (expiry && Date.now() > expiry) {
    cache.delete(key);
    ttls.delete(key);
    return null;
  }
  
  return cache.get(key);
}

function del(key) {
  cache.delete(key);
  ttls.delete(key);
}

function clear() {
  cache.clear();
  ttls.clear();
}

function stats() {
  return {
    size: cache.size,
    keys: Array.from(cache.keys())
  };
}

// Cached query wrapper
async function cached(key, ttl, fetchFn) {
  const cached = get(key);
  if (cached !== null && cached !== undefined) {
    return cached;
  }
  
  const fresh = await fetchFn();
  set(key, fresh, ttl);
  return fresh;
}

module.exports = {
  set,
  get,
  del,
  clear,
  stats,
  cached
};
