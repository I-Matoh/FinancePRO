/**
 * Authentication Controller
 * 
 * HTTP request handlers for authentication endpoints.
 * Acts as layer between HTTP requests and business logic (authService).
 * 
 * Security responsibilities:
 * - Sets secure httpOnly cookies for token storage
 * - Generic error messages (prevents enumeration)
 * - Proper HTTP status codes
 * - Input already validated by validate middleware (Zod)
 * 
 * @module controllers/authController
 */

const authService = require('../services/authService');

/**
 * Sets authentication cookies with secure defaults
 * 
 * Cookie Security Settings:
 * - httpOnly: Prevents XSS from accessing tokens (JavaScript can't read)
 * - sameSite='strict': CSRF protection - cookies only sent to origin
 * - secure: Only sent over HTTPS (required in production)
 * - maxAge: Aligns with token TTL for automatic expiration
 * 
 * @param {Object} res - Express response object
 * @param {Object} tokens - Token pair
 * @param {string} tokens.accessToken - JWT access token
 * @param {string} tokens.refreshToken - JWT refresh token
 */
function setAuthCookies(res, { accessToken, refreshToken }) {
  // Determine if running in production for secure cookie flag
  const isProd = process.env.NODE_ENV === 'production';
  
  // Access token cookie - short-lived (15 minutes default)
  res.cookie('access_token', accessToken, {
    httpOnly: true, // JavaScript cannot access - prevents XSS token theft
    sameSite: 'strict', // CSRF protection - only sent to this site
    secure: isProd, // HTTPS only in production
    maxAge: Number(process.env.ACCESS_TOKEN_TTL || 900) * 1000 // Convert seconds to ms
  });
  
  // Refresh token cookie - longer-lived (14 days default)
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    sameSite: 'strict',
    secure: isProd,
    maxAge: Number(process.env.REFRESH_TOKEN_TTL || 1209600) * 1000
  });
}

/**
 * Handle user registration
 * 
 * @param {Object} req - Express request (validated body: email, password)
 * @param {Object} res - Express response
 * @returns {Object} 201 with user object or error
 */
async function register(req, res) {
  try {
    const { email, password } = req.validated.body;
    const user = await authService.register({ email, password });
    return res.status(201).json({ user });
  } catch (err) {
    // Specific error for email in use (needed for UX)
    if (err.message === 'email_in_use') return res.status(409).json({ error: 'email_in_use' });
    // Generic error for all other cases - no internal details leaked
    return res.status(500).json({ error: 'register_failed' });
  }
}

/**
 * Handle user login
 * 
 * Returns both cookies AND access token in body for flexibility:
 * - Cookies: Browser clients (automatic cookie handling)
 * - Body token: Mobile/API clients (explicit token handling)
 * 
 * @param {Object} req - Express request (validated body: email, password)
 * @param {Object} res - Express response
 * @returns {Object} 200 with user and tokens or 401 on failure
 */
async function login(req, res) {
  try {
    const { email, password } = req.validated.body;
    const result = await authService.login({ email, password });
    
    // Set httpOnly cookies for browser clients
    setAuthCookies(res, result);
    
    // Also return tokens in body for API/mobile clients
    // Access token in body allows clients without cookie support
    return res.json({ user: result.user, accessToken: result.accessToken });
  } catch (err) {
    // Generic error message prevents email enumeration
    if (err.message === 'invalid_credentials') return res.status(401).json({ error: 'invalid_credentials' });
    return res.status(500).json({ error: 'login_failed' });
  }
}

/**
 * Handle token refresh
 * 
 * Accepts refresh token from cookie OR body.
 * Returns new access token and rotates refresh token.
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @returns {Object} 200 with new access token or 401 on failure
 */
async function refresh(req, res) {
  try {
    // Accept refresh token from cookie (preferred) or body (for API clients)
    const refreshToken = req.cookies?.refresh_token || req.validated.body.refreshToken;
    const result = await authService.refresh({ refreshToken });
    
    setAuthCookies(res, result);
    return res.json({ accessToken: result.accessToken });
  } catch (err) {
    return res.status(401).json({ error: 'invalid_refresh' });
  }
}

/**
 * Handle user logout
 * 
 * Revokes refresh token and clears cookies.
 * Works even without refresh token (clears stale cookies).
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @returns {Object} 204 No Content
 */
async function logout(req, res) {
  // Attempt to revoke token if provided
  const refreshToken = req.cookies?.refresh_token || req.validated.body.refreshToken;
  if (refreshToken) await authService.logout({ refreshToken });
  
  // Clear cookies regardless of token presence
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  
  return res.status(204).send();
}

module.exports = {
  register,
  login,
  refresh,
  logout
};
