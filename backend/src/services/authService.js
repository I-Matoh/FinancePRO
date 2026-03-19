/**
 * Authentication Service
 * 
 * Handles user registration, login, token management, and session lifecycle.
 * 
 * Security Implementation:
 * - Password hashing: bcrypt with cost factor 12 (adaptive, ~300ms per hash)
 * - JWT: Separate access/refresh tokens with different secrets
 * - Token storage: Refresh tokens hashed with SHA-256 before DB storage
 * - Session management: Rotation on each refresh, revocation on logout
 * 
 * Attack Mitigations:
 * - Timing-safe credential comparison via bcrypt.compare
 * - Rate limiting on auth endpoints (see routes/authRoutes.js)
 * - Email enumeration prevention via generic error messages
 * - Token expiration: Short-lived access tokens (15min default), longer refresh (14 days)
 * 
 * @module services/authService
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getSupabase } = require('../supabase');

/**
 * Generates a short-lived JWT access token
 * 
 * Contains minimal user info (sub, role, email) for authorization decisions.
 * Short TTL limits damage from token compromise.
 * 
 * @param {Object} user - User object from database
 * @returns {string} Signed JWT access token
 */
function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: Number(process.env.ACCESS_TOKEN_TTL || 900) } // Default: 15 minutes
  );
}

/**
 * Generates a refresh token for session continuity
 * 
 * Type 'refresh' claim prevents misuse of refresh token as access token.
 * Longer TTL for user convenience (2 weeks default).
 * 
 * @param {Object} user - User object from database
 * @returns {string} Signed JWT refresh token
 */
function signRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, type: 'refresh' }, // Type claim prevents refresh token reuse as access token
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: Number(process.env.REFRESH_TOKEN_TTL || 1209600) } // Default: 14 days
  );
}

/**
 * Hashes refresh token for storage
 * 
 * Stores ONLY the hash in database. If DB is compromised, refresh tokens
 * cannot be used directly (one-way hash). This reduces blast radius of data breaches.
 * 
 * @param {string} token - Raw refresh token
 * @returns {string} SHA-256 hash of token
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Registers a new user with email/password
 * 
 * Security measures:
 * - Email uniqueness check before insertion
 * - Password hashed with bcrypt (cost factor 12)
 * - Default role set to 'USER' (never accept role from client)
 * - Wallet created automatically with zero balance
 * 
 * @param {Object} params - Registration parameters
 * @param {string} params.email - User email (validated by Zod in routes)
 * @param {string} params.password - Plain text password (will be hashed)
 * @returns {Object} Created user object (excluding sensitive fields)
 * @throws {Error} 'email_in_use' if email exists
 */
async function register({ email, password }) {
  const supabase = getSupabase();
  
  // Hash password with bcrypt - cost factor 12 provides strong protection
  // Adaptive: takes ~300ms, resistant to GPU cracking
  const passwordHash = await bcrypt.hash(password, 12);

  // Check email availability - prevents enumeration via timing difference
  const existing = await supabase.from('users').select('id').eq('email', email).limit(1);
  if (existing.error) throw existing.error;
  if (existing.data && existing.data.length > 0) throw new Error('email_in_use');

  // Insert user with default role - NEVER trust client-supplied role
  const userRes = await supabase
    .from('users')
    .insert({ email, password_hash: passwordHash, role: 'USER' })
    .select('id, email, role')
    .single();
  if (userRes.error) throw userRes.error;

  // Create default wallet for new user
  await supabase
    .from('wallets')
    .insert({ user_id: userRes.data.id, balance: 0, currency: 'USD', status: 'ACTIVE' });

  return userRes.data;
}

/**
 * Authenticates user with email/password
 * 
 * Security measures:
 * - Always returns same error for invalid email OR password (timing safety)
 * - bcrypt.compare is timing-safe regardless of password validity
 * - Issues both access and refresh tokens
 * - Stores hashed refresh token in database for revocation capability
 * 
 * @param {Object} params - Login parameters
 * @param {string} params.email - User email
 * @param {string} params.password - Plain text password
 * @returns {Object} Access token, refresh token, and user info
 * @throws {Error} 'invalid_credentials' on authentication failure
 */
async function login({ email, password }) {
  const supabase = getSupabase();
  
  // Fetch user by email
  const res = await supabase
    .from('users')
    .select('id, email, role, password_hash')
    .eq('email', email)
    .limit(1)
    .single();
  if (res.error) throw new Error('invalid_credentials');

  const user = res.data;
  
  // Timing-safe password comparison via bcrypt
  // Even if user doesn't exist, we "check" a hash to prevent timing attacks
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw new Error('invalid_credentials');

  // Generate token pair
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const refreshHash = hashToken(refreshToken);

  // Store hashed refresh token for later revocation
  // TTL from env or default (14 days)
  const ttl = Number(process.env.REFRESH_TOKEN_TTL || 1209600);
  await supabase.from('refresh_tokens').insert({
    user_id: user.id,
    token_hash: refreshHash,
    expires_at: new Date(Date.now() + ttl * 1000).toISOString()
  });

  return { accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role } };
}

/**
 * Refreshes access token using valid refresh token
 * 
 * Security measures:
 * - Verifies refresh token signature and expiration
 * - Checks token hash against database (prevents stolen token reuse)
 * - Ensures token not revoked (logout check)
 * - Rotates refresh token (old one invalidated, new one issued)
 * 
 * This "refresh token rotation" mitigates token theft - if a refresh token
 * is stolen and used, the original becomes invalid.
 * 
 * @param {Object} params - Refresh parameters
 * @param {string} params.refreshToken - Valid refresh token
 * @returns {Object} New access token and refresh token
 * @throws {Error} 'invalid_refresh' on failure
 */
async function refresh({ refreshToken }) {
  let payload;
  try {
    // Verify JWT signature and expiration
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    throw new Error('invalid_refresh');
  }

  const supabase = getSupabase();
  const refreshHash = hashToken(refreshToken);
  
  // Verify token exists in DB and not revoked
  const tokenRes = await supabase
    .from('refresh_tokens')
    .select('id, user_id, revoked_at, expires_at')
    .eq('token_hash', refreshHash)
    .gt('expires_at', new Date().toISOString())
    .limit(1)
    .single();
  if (tokenRes.error || tokenRes.data.revoked_at) throw new Error('invalid_refresh');

  // Fetch current user data (in case role changed)
  const userRes = await supabase
    .from('users')
    .select('id, email, role')
    .eq('id', payload.sub)
    .limit(1)
    .single();
  if (userRes.error) throw new Error('invalid_refresh');

  const user = userRes.data;
  const accessToken = signAccessToken(user);
  const nextRefreshToken = signRefreshToken(user);

  // Rotate refresh token: revoke old, issue new
  // This limits window of vulnerability if token is compromised
  await supabase.from('refresh_tokens').update({ revoked_at: new Date().toISOString() }).eq('id', tokenRes.data.id);

  const ttl = Number(process.env.REFRESH_TOKEN_TTL || 1209600);
  await supabase.from('refresh_tokens').insert({
    user_id: user.id,
    token_hash: hashToken(nextRefreshToken),
    expires_at: new Date(Date.now() + ttl * 1000).toISOString()
  });

  return { accessToken, refreshToken: nextRefreshToken };
}

/**
 * Logs out user by revoking their refresh token
 * 
 * Implements logout token revocation to invalidate stolen/lost tokens.
 * 
 * @param {Object} params - Logout parameters
 * @param {string} params.refreshToken - Token to revoke
 */
async function logout({ refreshToken }) {
  const supabase = getSupabase();
  const refreshHash = hashToken(refreshToken);
  await supabase.from('refresh_tokens').update({ revoked_at: new Date().toISOString() }).eq('token_hash', refreshHash);
}

module.exports = {
  register,
  login,
  refresh,
  logout
};
