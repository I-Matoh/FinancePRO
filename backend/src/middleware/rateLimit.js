/**
 * Rate Limiting Middleware (Token Bucket Algorithm)
 * 
 * Implements per-IP request rate limiting to prevent:
 * - Brute force attacks on authentication endpoints
 * - API abuse and DoS attacks
 * - Resource exhaustion from rapid requests
 * 
 * IMPORTANT: This is an in-memory implementation suitable for:
 * - Development/single-instance deployment
 * - Basic protection
 * 
 * For production/multi-node deployment, replace with:
 * - Redis-backed rate limiter (shared state)
 * - API gateway rate limiting (AWS API Gateway, Kong, etc.)
 * - CDN rate limiting (Cloudflare, Akamai)
 * 
 * Security notes:
 * - Uses req.ip which may be spoofed behind proxies (use trusted proxy config)
 * - Keys by IP + prefix to allow different limits per endpoint
 * 
 * @module middleware/rateLimit
 */

// In-memory rate limiter storage
// WARNING: Resets on server restart, not shared across instances
const buckets = new Map();

/**
 * Creates rate limiting middleware with token bucket algorithm
 * 
 * @param {Object} options - Rate limit configuration
 * @param {string} options.keyPrefix - Identifier prefix for this limit (e.g., 'login', 'transfer')
 * @param {number} options.windowSeconds - Time window in seconds
 * @param {number} options.max - Maximum requests allowed in window
 * @returns {Function} Express middleware
 * 
 * @example
 * // Limit login attempts: 5 per minute per IP
 * rateLimit({ keyPrefix: 'login', windowSeconds: 60, max: 5 })
 */
function rateLimit({ keyPrefix, windowSeconds, max }) {
  return (req, res, next) => {
    // Use IP for rate limiting - consider X-Forwarded-For in production behind load balancer
    // Note: req.ip requires 'trust proxy' setting in Express for accurate client IP behind proxies
    const key = `${keyPrefix}:${req.ip}`;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    
    // Check if key exists (first request in window) or window has expired
    const entry = buckets.get(key);
    
    if (!entry || now - entry.start > windowMs) {
      // New window: reset counter
      buckets.set(key, { start: now, count: 1 });
      return next();
    }
    
    // Within window: increment counter
    entry.count += 1;
    
    if (entry.count > max) {
      // Rate limit exceeded - return 429 Too Many Requests
      // Include Retry-After header in production
      res.set('Retry-After', String(Math.ceil(windowMs / 1000)));
      return res.status(429).json({ error: 'rate_limited' });
    }
    
    return next();
  };
}

module.exports = { rateLimit };

