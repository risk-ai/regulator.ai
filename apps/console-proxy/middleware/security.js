/**
 * Security Middleware
 * CORS, security headers, rate limiting
 */

// Security headers for all responses
function securityHeaders(req, res, next) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (next) next();
}

// Simple rate limiting (in-memory)
const rateLimits = new Map();

function rateLimit(options = {}) {
  const {
    windowMs = 60000, // 1 minute
    max = 100, // 100 requests per window
    keyGenerator = (req) => req.headers['x-forwarded-for'] || req.connection.remoteAddress
  } = options;
  
  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    
    if (!rateLimits.has(key)) {
      rateLimits.set(key, { count: 1, resetTime: now + windowMs });
    } else {
      const limit = rateLimits.get(key);
      
      if (now > limit.resetTime) {
        // Reset window
        limit.count = 1;
        limit.resetTime = now + windowMs;
      } else {
        limit.count++;
        
        if (limit.count > max) {
          res.setHeader('X-RateLimit-Limit', max);
          res.setHeader('X-RateLimit-Remaining', 0);
          res.setHeader('X-RateLimit-Reset', limit.resetTime);
          
          return res.status(429).json({
            success: false,
            error: 'Too many requests',
            code: 'RATE_LIMIT_EXCEEDED',
            retry_after: Math.ceil((limit.resetTime - now) / 1000)
          });
        }
      }
    }
    
    const limit = rateLimits.get(key);
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - limit.count));
    res.setHeader('X-RateLimit-Reset', limit.resetTime);
    
    if (next) next();
  };
}

// API key authentication
async function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required',
      code: 'UNAUTHORIZED'
    });
  }
  
  // Verify API key (would call api-keys.js verify)
  // For now, just check format
  if (!apiKey.startsWith('vos_')) {
    return res.status(401).json({
      success: false,
      error: 'Invalid API key format',
      code: 'UNAUTHORIZED'
    });
  }
  
  if (next) next();
}

// Clean up old rate limit entries
setInterval(() => {
  const now = Date.now();
  for (const [key, limit] of rateLimits.entries()) {
    if (now > limit.resetTime + 60000) { // 1 minute after reset
      rateLimits.delete(key);
    }
  }
}, 60000);

module.exports = {
  securityHeaders,
  rateLimit,
  authenticateApiKey
};
