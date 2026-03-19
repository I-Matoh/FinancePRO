/**
 * FinancePRO API Entry Point
 * 
 * Security Architecture:
 * - Helmet: Sets security-focused HTTP headers (HSTS, X-Frame-Options, etc.)
 * - Body parsing limited to 1MB to prevent DoS via large payloads
 * - Cookie-parser: Enables secure cookie handling for JWT storage
 * - Morgan: Request logging for audit trail and intrusion detection
 * - All routes protected by auth middleware (except /health and /auth)
 * 
 * @module server
 */

require('dotenv').config(); // Load environment variables - NEVER commit .env files
const express = require('express');
const helmet = require('helmet'); // HTTP security headers middleware
const cookieParser = require('cookie-parser'); // Parse cookies for JWT extraction
const morgan = require('morgan'); // HTTP request logging
const { auditLogger } = require('./middleware/audit');
const { errorHandler } = require('./middleware/error');

const authRoutes = require('./routes/authRoutes');
const walletRoutes = require('./routes/walletRoutes');
const transferRoutes = require('./routes/transferRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Security: Helmet sets multiple HTTP headers to protect against common attacks
// - X-Content-Type-Options: prevents MIME type sniffing
// - X-Frame-Options: prevents clickjacking
// - X-XSS-Protection: XSS filter in legacy browsers
// - Strict-Transport-Security: enforces HTTPS
app.use(helmet());

// Limit JSON body size to 1MB - prevents DoS attacks with large payloads
app.use(express.json({ limit: '1mb' }));

// Parse cookies from request headers - enables httpOnly cookie access
app.use(cookieParser());

// Log all HTTP requests in Combined format (Apache-style) for security monitoring
app.use(morgan('combined'));

// Audit logger first to capture status codes for all routes.
// Logs are essential for: incident response, forensics, compliance (PCI-DSS, SOC2)
app.use(auditLogger());

// Health check endpoint - no auth required for load balancer probes
app.get('/health', (req, res) => res.json({ ok: true }));

// Route mounting with path-based routing
app.use('/auth', authRoutes);
app.use('/wallet', walletRoutes);
app.use('/transfer', transferRoutes);
app.use('/transactions', transactionRoutes);
app.use('/admin', adminRoutes);

// Global error handler - MUST be last middleware to catch all errors
app.use(errorHandler);

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`API listening on ${port}`);
});
