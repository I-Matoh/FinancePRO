const transactionService = require('../services/transactionService');

async function list(req, res) {
  const { page, pageSize, from, to } = req.validated.query;
  const rows = await transactionService.listTransactions({
    userId: req.user.sub,
    page: Number(page || 1),
    pageSize: Number(pageSize || 20),
    from: from || null,
    to: to || null
  });
  return res.json({ transactions: rows });
}

module.exports = { list };
