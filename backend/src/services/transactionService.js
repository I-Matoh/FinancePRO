const { getSupabase } = require('../supabase');

async function listTransactions({ userId, page, pageSize, from, to }) {
  const supabase = getSupabase();
  const fromIdx = (page - 1) * pageSize;
  const toIdx = fromIdx + pageSize - 1;

  // Fetch user wallet ids first to avoid unsafe string interpolation in filters.
  const walletRes = await supabase.from('wallets').select('id').eq('user_id', userId);
  if (walletRes.error) throw walletRes.error;
  const walletIds = (walletRes.data || []).map((w) => w.id);
  if (walletIds.length === 0) return [];

  const quotedIds = walletIds.map((id) => `"${String(id).replace(/"/g, '""')}"`);
  let query = supabase
    .from('transactions')
    .select('id, amount, status, fraud_flag, created_at, sender_wallet_id, receiver_wallet_id')
    .or(`sender_wallet_id.in.(${quotedIds.join(',')}),receiver_wallet_id.in.(${quotedIds.join(',')})`)
    .order('created_at', { ascending: false })
    .range(fromIdx, toIdx);

  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);

  const res = await query;
  if (res.error) throw res.error;
  return res.data || [];
}

module.exports = { listTransactions };
