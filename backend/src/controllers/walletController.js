const walletService = require('../services/walletService');

async function getWallet(req, res) {
  try {
    const wallet = await walletService.getWalletByUser(req.user.sub);
    return res.json({ wallet });
  } catch (err) {
    if (err.message === 'wallet_not_found') {
      return res.status(404).json({ error: 'wallet_not_found' });
    }
    return res.status(500).json({ error: 'wallet_fetch_failed' });
  }
}

module.exports = { getWallet };
