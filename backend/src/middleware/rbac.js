/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * Enforces authorization by checking user role against allowed roles.
 * MUST be used AFTER authRequired middleware (relies on req.user).
 * 
 * Security model:
 * - Default deny: if role not in allowed list, access is denied
 * - Role hierarchy: ADMIN has full access, USER has limited access
 * - No role escalation: cannot modify own role via API
 * 
 * @module middleware/rbac
 */

/**
 * Creates middleware to enforce role-based access control
 * 
 * @param {string|string[]} roles - Allowed role(s). Can be single role or array.
 * @returns {Function} Express middleware function
 * 
 * @example
 * // Admin only route
 * router.get('/users', authRequired, requireRole('ADMIN'), getUsers);
 * 
 * // Multiple roles allowed
 * router.get('/reports', authRequired, requireRole(['ADMIN', 'AUDITOR']), getReports);
 */
function requireRole(roles) {
  // Normalize to array for consistent checking
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req, res, next) => {
    // Safety check: authRequired should have populated req.user
    // If missing, reject with 403 (not 401, as auth already passed)
    const role = req.user?.role;
    
    if (!role || !allowedRoles.includes(role)) {
      // Forbidden: authenticated but not authorized for this resource
      // Log this event in production for security monitoring
      return res.status(403).json({ error: 'forbidden' });
    }
    
    return next();
  };
}

module.exports = { requireRole };
