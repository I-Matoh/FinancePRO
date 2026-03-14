const express = require('express');
const adminController = require('../controllers/adminController');
const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

router.use(authRequired, requireRole(['ADMIN', 'AUDITOR']));

router.get('/transactions', adminController.listTransactions);
router.get('/fraud-alerts', adminController.listFraudAlerts);
router.get('/audit-logs', adminController.listAuditLogs);
router.post('/wallets/:walletId/freeze', requireRole(['ADMIN']), adminController.freezeWallet);

module.exports = router;
