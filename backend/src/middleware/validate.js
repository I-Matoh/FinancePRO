/**
 * Input Validation Middleware
 * 
 * Uses Zod for schema validation - provides type safety and input sanitization.
 * This is the FIRST line of defense - rejects malformed/malicious input early.
 * 
 * Security Benefits:
 * - Type coercion: Zod normalizes input (e.g., string "123" → number 123)
 * - Parsing: Rejects non-parseable data before it reaches business logic
 * - Strict schemas: Only explicitly allowed fields pass through
 * - Custom refinements: Can add complex validation rules
 * 
 * Validation approach:
 * - Fail fast: Reject invalid input immediately (400 Bad Request)
 * - Descriptive errors: Zod errors include path and message for debugging
 * - Production: Consider NOT returning detailed errors (prevents enumeration)
 * 
 * @module middleware/validate
 */

/**
 * Creates validation middleware from a Zod schema
 * 
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware
 * 
 * @example
 * const { z } = require('zod');
 * 
 * const loginSchema = z.object({
 *   body: z.object({
 *     email: z.string().email(),
 *     password: z.string().min(8)
 *   })
 * });
 * 
 * router.post('/login', validate(loginSchema), controller.login);
 */
function validate(schema) {
  return (req, res, next) => {
    try {
      // Parse validates against the schema and throws on invalid input
      // Also coerces types where specified (e.g., z.number() from string)
      const data = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });
      
      // Attach validated/sanitized data to request
      // Downstream code uses req.validated instead of req.body
      req.validated = data;
      return next();
    } catch (err) {
      // Return validation errors with 400 Bad Request
      // In production, consider: return res.status(400).json({ error: 'validation_error' });
      return res.status(400).json({ error: 'validation_error', details: err.errors });
    }
  };
}

module.exports = { validate };
