/**
 * Authentication Middleware
 * 
 * Verifies JWT access tokens from Authorization header or httpOnly cookies.
 * Implements defense-in-depth: checks both Bearer token and cookies for flexibility.
 * 
 * Security considerations:
 * - Tokens validated against JWT_ACCESS_SECRET (env variable, never hardcoded)
 * - Returns 401 on missing/invalid tokens to prevent unauthorized access
 * - Does NOT reveal token details in error messages (prevents info leakage)
 * 
 * @module middleware/auth
 */

const jwt = require('jsonwebtoken');

/**
 * Express middleware to enforce authentication
 * 
 * Checks two sources for JWT (defense-in-depth):
 * 1. Authorization: Bearer <token> header (common SPA pattern)
 * 2. Cookie: access_token cookie (set by auth controller)
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {Object} 401 response if unauthorized, otherwise calls next()
 */
function authRequired(req, res, next) {
  // Extract Bearer token from Authorization header
  const header = req.headers.authorization || '';
  const bearerToken = header.startsWith('Bearer ') ? header.slice(7) : null;
  
  // Fallback to httpOnly cookie - prevents XSS from stealing tokens
  // Cookie is httpOnly, so JavaScript cannot access it (only browser sends automatically)
  const cookieToken = req.cookies?.access_token;
  
  // Use whichever token is present; prefer Bearer for API clients
  const token = bearerToken || cookieToken;
  
  if (!token) {
    // Generic "unauthorized" message - avoid revealing auth mechanism details
    return res.status(401).json({ error: 'unauthorized' });
  }
  
  try {
    // Verify token signature and expiration
    // Throws on: expired token, invalid signature, malformed token
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    // Attach user payload to request for downstream middleware/routes
    // Contains: sub (user ID), role, email (from authService.signAccessToken)
    req.user = payload;
    return next();
  } catch (err) {
    // Common JWT errors: TokenExpiredError, JsonWebTokenError, NotBeforeError
    // All treated the same: return generic invalid_token
    return res.status(401).json({ error: 'invalid_token' });
  }
}

module.exports = { authRequired };
