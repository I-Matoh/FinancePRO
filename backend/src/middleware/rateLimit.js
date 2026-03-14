// In-memory rate limiter. Suitable for single-node dev; replace with shared store for multi-node.
const buckets = new Map();

function rateLimit({ keyPrefix, windowSeconds, max }) {
  return (req, res, next) => {
    const key = `${keyPrefix}:${req.ip}`;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const entry = buckets.get(key);

    if (!entry || now - entry.start > windowMs) {
      buckets.set(key, { start: now, count: 1 });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      return res.status(429).json({ error: 'rate_limited' });
    }
    return next();
  };
}

module.exports = { rateLimit };
