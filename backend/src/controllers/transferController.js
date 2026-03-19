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
    switch (err.message) {
      case 'receiver_wallet_not_found':
        return res.status(404).json({ error: 'recipient_not_found' });
      case 'sender_wallet_not_found':
        return res.status(404).json({ error: 'wallet_not_found' });
      case 'insufficient_funds':
        return res.status(400).json({ error: 'insufficient_funds' });
      case 'wallet_inactive':
        return res.status(403).json({ error: 'wallet_inactive' });
      case 'invalid_amount':
        return res.status(400).json({ error: 'invalid_amount' });
      default:
        console.error('transfer_failed', err);
        return res.status(500).json({ error: 'transfer_failed' });
    }
  }
}

module.exports = { transfer };
