/**
 * Transfer Routes
 * 
 * Express router for /transfer endpoint group.
 * All transfers require authentication - no public access.
 * 
 * Security Pipeline:
 * 1. authRequired - Verify JWT, populate req.user
 * 2. rateLimit - Prevent transfer abuse/DoS
 * 3. validate - Zod schema validation
 * 4. controller - Business logic with fraud detection
 * 
 * Important: senderUserId comes from JWT (req.user.sub), NOT request body.
 * This prevents IDOR attacks where attacker specifies arbitrary victim.
 * 
 * @module routes/transferRoutes
 */

const express = require('express');
const { z } = require('zod');
const transferController = require('../controllers/transferController');
const { authRequired } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { rateLimit } = require('../middleware/rateLimit');

const router = express.Router();

/**
 * POST /transfer
 * 
 * Execute a fund transfer between wallets.
 * 
 * Authentication: REQUIRED (JWT in Authorization header or cookie)
 * Rate limit: 10 transfers per minute per IP
 * 
 * Input (validated):
 * - recipientEmail: string (valid email format)
 * - amount: number (positive)
 * 
 * IMPORTANT: sender is determined from JWT token, NOT request body.
 * This is a critical security measure against IDOR attacks.
 * 
 * Transfer flow:
 * 1. Validate input
 * 2. Check sender wallet exists and is active
 * 3. Look up recipient by email (not wallet ID - prevents enumeration)
 * 4. Run fraud detection heuristics
 * 5. Execute atomic DB transfer
 * 6. Create fraud alerts if suspicious
 * 
 * Response: { transaction: {...}, fraudAlerts: [...] }
 */
router.post(
  '/',
  // FIRST: Authenticate - all transfers require login
  authRequired,
  // SECOND: Rate limit - prevent abuse
  rateLimit({ keyPrefix: 'transfer', windowSeconds: 60, max: 10 }),
  // THIRD: Validate input schema
  validate(
    z.object({
      body: z.object({
        recipientEmail: z.string().email(),
        amount: z.number().positive() // Must be positive - zero/negative rejected
      })
    })
  ),
  // FOURTH: Controller handles business logic
  transferController.transfer
);

module.exports = router;
