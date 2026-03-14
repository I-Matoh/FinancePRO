require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const { auditLogger } = require('./middleware/audit');
const { errorHandler } = require('./middleware/error');

const authRoutes = require('./routes/authRoutes');
const walletRoutes = require('./routes/walletRoutes');
const transferRoutes = require('./routes/transferRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express(); 

app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(morgan('combined'));

// Audit logger first to capture status codes for all routes.
app.use(auditLogger());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/auth', authRoutes);
app.use('/wallet', walletRoutes);
app.use('/transfer', transferRoutes);
app.use('/transactions', transactionRoutes);
app.use('/admin', adminRoutes);
app.use(errorHandler);

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`API listening on ${port}`);
});
