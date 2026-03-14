const adminService = require('../services/adminService');

async function freezeWallet(req, res) {
  await adminService.freezeWallet(req.params.walletId);
  return res.status(204).send();
}

async function listFraudAlerts(req, res) {
  const alerts = await adminService.listFraudAlerts({ status: req.query.status });
  return res.json({ alerts });
}

async function listAuditLogs(req, res) {
  const logs = await adminService.listAuditLogs();
  return res.json({ logs });
}

async function listTransactions(req, res) {
  const transactions = await adminService.listTransactions();
  return res.json({ transactions });
}

module.exports = {
  freezeWallet,
  listFraudAlerts,
  listAuditLogs,
  listTransactions
};
