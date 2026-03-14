const walletService = require('../services/walletService');

async function getWallet(req, res) {
  try {
    const wallet = await walletService.getWalletByUser(req.user.sub);
    return res.json({ wallet });
  } catch (err) {
    return res.status(404).json({ error: 'wallet_not_found' });
  }
}

module.exports = { getWallet };
