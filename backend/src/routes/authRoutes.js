/**
 * Authentication Routes
 * 
 * Express router for /auth endpoint group.
 * 
 * Security Layer Order (Middleware Pipeline):
 * 1. Rate limiting - BEFORE any processing to prevent brute force
 * 2. Validation (Zod) - Sanitize and type-coerce input
 * 3. Controller - Business logic
 * 
 * Each endpoint has rate limiting to mitigate:
 * - Brute force password attacks
 * - Credential stuffing
 * - Email enumeration
 * 
 * @module routes/authRoutes
 */

const express = require('express');
const { z } = require('zod');
const authController = require('../controllers/authController');
const { validate } = require('../middleware/validate');
const { rateLimit } = require('../middleware/rateLimit');

const router = express.Router();

/**
 * POST /auth/register
 * 
 * User registration endpoint.
 * 
 * Rate limit: 5 requests per minute per IP (prevents spam/automation)
 * Input: { email: string, password: string }
 * Validation: Email format + minimum 8 character password
 */
router.post(
  '/register',
  // Rate limit BEFORE validation to catch abuse early
  rateLimit({ keyPrefix: 'register', windowSeconds: 60, max: 5 }),
  // Zod schema validates and sanitizes input
  validate(z.object({ body: z.object({ email: z.string().email(), password: z.string().min(8) }) })),
  authController.register
);

/**
 * POST /auth/login
 * 
 * User authentication endpoint.
 * 
 * Rate limit: 5 requests per minute per IP (prevents brute force)
 * Input: { email: string, password: string }
 * Output: User object + access token + httpOnly cookies
 */
router.post(
  '/login',
  rateLimit({ keyPrefix: 'login', windowSeconds: 60, max: 5 }),
  validate(z.object({ body: z.object({ email: z.string().email(), password: z.string().min(8) }) })),
  authController.login
);

/**
 * POST /auth/refresh
 * 
 * Token refresh endpoint - exchanges valid refresh token for new access token.
 * Also performs refresh token rotation (new refresh token issued).
 * 
 * Rate limit: 10 requests per minute (higher than login - normal operation)
 * Input: { refreshToken?: string } (optional - also checks cookie)
 */
router.post(
  '/refresh',
  rateLimit({ keyPrefix: 'refresh', windowSeconds: 60, max: 10 }),
  validate(z.object({ body: z.object({ refreshToken: z.string().optional() }) })),
  authController.refresh
);

/**
 * POST /auth/logout
 * 
 * User logout - revokes refresh token and clears cookies.
 * 
 * NO rate limit (should always succeed to allow logout even under attack)
 * Input: { refreshToken?: string } (optional - also checks cookie)
 */
router.post(
  '/logout',
  // No rate limit - allow logout even if under attack
  validate(z.object({ body: z.object({ refreshToken: z.string().optional() }) })),
  authController.logout
);

module.exports = router;


