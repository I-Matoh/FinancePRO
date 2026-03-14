const transferService = require('../services/transferService');

async function transfer(req, res) {
  try {
    const { recipientEmail, amount } = req.validated.body;
    const result = await transferService.transfer({
      senderUserId: req.user.sub,
      receiverEmail: recipientEmail,
      amount: Number(amount)
    });
    return res.status(201).json(result);
  } catch (err) {
    if (err.message === 'receiver_wallet_not_found') return res.status(404).json({ error: 'recipient_not_found' });
    if (err.message === 'insufficient_funds') return res.status(400).json({ error: 'insufficient_funds' });
    if (err.message === 'wallet_inactive') return res.status(403).json({ error: 'wallet_inactive' });
    return res.status(400).json({ error: err.message || 'transfer_failed' });
  }
}

module.exports = { transfer };
