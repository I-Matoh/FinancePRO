const { getSupabase } = require('../supabase');

// Heuristic fraud checks. Keep fast and deterministic; deeper analysis should be async.
async function evaluateFraud({ senderWalletId, receiverWalletId, amount }) {
  const supabase = getSupabase();
  const alerts = [];
  const amountThreshold = Number(process.env.FRAUD_AMOUNT_THRESHOLD || 10000);
  const velocityCount = Number(process.env.FRAUD_VELOCITY_COUNT || 5);
  const velocityWindow = Number(process.env.FRAUD_VELOCITY_WINDOW_SECONDS || 60);

  if (amount > amountThreshold) {
    alerts.push({ rule: 'amount_threshold', severity: 'high' });
  }

  const since = new Date(Date.now() - velocityWindow * 1000).toISOString();
  const velocityRes = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('sender_wallet_id', senderWalletId)
    .gte('created_at', since);
  if (!velocityRes.error && (velocityRes.count || 0) >= velocityCount) {
    alerts.push({ rule: 'velocity', severity: 'medium' });
  }

  const recipientRes = await supabase
    .from('transactions')
    .select('id')
    .eq('sender_wallet_id', senderWalletId)
    .eq('receiver_wallet_id', receiverWalletId)
    .limit(1);
  if (!recipientRes.error && (!recipientRes.data || recipientRes.data.length === 0)) {
    alerts.push({ rule: 'new_recipient', severity: 'low' });
  }

  return alerts;
}

module.exports = { evaluateFraud };
