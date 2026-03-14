const { getSupabase } = require('../supabase');

async function freezeWallet(walletId) {
  const supabase = getSupabase();
  await supabase.from('wallets').update({ status: 'FROZEN' }).eq('id', walletId);
}

async function listFraudAlerts({ status }) {
  const supabase = getSupabase();
  let query = supabase
    .from('fraud_alerts')
    .select('id, transaction_id, rule, severity, status, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (status) query = query.eq('status', status);
  const res = await query;
  if (res.error) throw res.error;
  return res.data || [];
}

async function listAuditLogs() {
  const supabase = getSupabase();
  const res = await supabase
    .from('audit_logs')
    .select('id, actor_id, action, entity_type, entity_id, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (res.error) throw res.error;
  return res.data || [];
}

async function listTransactions() {
  const supabase = getSupabase();
  const res = await supabase
    .from('transactions')
    .select('id, sender_wallet_id, receiver_wallet_id, amount, status, fraud_flag, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (res.error) throw res.error;
  return res.data || [];
}

module.exports = {
  freezeWallet,
  listFraudAlerts,
  listAuditLogs,
  listTransactions
};
