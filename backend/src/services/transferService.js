const { getSupabase } = require('../supabase');
const { evaluateFraud } = require('./fraudService');

async function transfer({ senderUserId, receiverEmail, amount }) {
  if (amount <= 0) throw new Error('invalid_amount');
  const supabase = getSupabase();

  const senderWalletRes = await supabase
    .from('wallets')
    .select('id, balance, status')
    .eq('user_id', senderUserId)
    .limit(1)
    .single();
  if (senderWalletRes.error) throw new Error('sender_wallet_not_found');

  const receiverUserRes = await supabase
    .from('users')
    .select('id')
    .eq('email', receiverEmail)
    .limit(1)
    .single();
  if (receiverUserRes.error) throw new Error('receiver_wallet_not_found');

  const receiverWalletRes = await supabase
    .from('wallets')
    .select('id, balance, status')
    .eq('user_id', receiverUserRes.data.id)
    .limit(1)
    .single();
  if (receiverWalletRes.error) throw new Error('receiver_wallet_not_found');

  const fraudAlerts = await evaluateFraud({
    senderWalletId: senderWalletRes.data.id,
    receiverWalletId: receiverWalletRes.data.id,
    amount
  });

  const status = fraudAlerts.length > 0 ? 'PENDING_REVIEW' : 'COMPLETED';
  const fraudFlag = fraudAlerts.length > 0;

  // `transfer_funds` performs atomic balance updates and ledger writes in the DB.
  const rpcRes = await supabase.rpc('transfer_funds', {
    p_sender_user_id: senderUserId,
    p_receiver_email: receiverEmail,
    p_amount: amount,
    p_status: status,
    p_fraud_flag: fraudFlag
  });
  if (rpcRes.error) {
    if (rpcRes.error.message) throw new Error(rpcRes.error.message);
    throw new Error('transfer_failed');
  }

  const transaction = Array.isArray(rpcRes.data) ? rpcRes.data[0] : rpcRes.data;

  if (fraudAlerts.length > 0 && transaction?.id) {
    for (const alert of fraudAlerts) {
      await supabase.from('fraud_alerts').insert({
        transaction_id: transaction.id,
        rule: alert.rule,
        severity: alert.severity,
        status: 'OPEN'
      });
    }
  }

  return { transaction, fraudAlerts };
}

module.exports = { transfer };
