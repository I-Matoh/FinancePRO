const adminService = require('../services/adminService');

async function freezeWallet(req, res) {
  try {
    await adminService.freezeWallet(req.params.walletId);
    return res.status(204).send();
  } catch (err) {
    console.error('admin_freeze_failed', err);
    return res.status(500).json({ error: 'freeze_failed' });
  }
}

async function listFraudAlerts(req, res) {
  try {
    const alerts = await adminService.listFraudAlerts({ status: req.query.status });
    return res.json({ alerts });
  } catch (err) {
    console.error('admin_fraud_alerts_failed', err);
    return res.status(500).json({ error: 'fraud_alerts_failed' });
  }
}

async function listAuditLogs(req, res) {
  try {
    const logs = await adminService.listAuditLogs();
    return res.json({ logs });
  } catch (err) {
    console.error('admin_audit_logs_failed', err);
    return res.status(500).json({ error: 'audit_logs_failed' });
  }
}

async function listTransactions(req, res) {
  try {
    const transactions = await adminService.listTransactions();
    return res.json({ transactions });
  } catch (err) {
    console.error('admin_transactions_failed', err);
    return res.status(500).json({ error: 'transactions_failed' });
  }
}

module.exports = {
  freezeWallet,
  listFraudAlerts,
  listAuditLogs,
  listTransactions
};
