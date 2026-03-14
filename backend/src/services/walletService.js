const { getSupabase } = require('../supabase');

async function getWalletByUser(userId) {
  const supabase = getSupabase();
  const res = await supabase
    .from('wallets')
    .select('id, balance, currency, status')
    .eq('user_id', userId)
    .limit(1)
    .single();
  if (res.error) throw new Error('wallet_not_found');
  return res.data;
}

module.exports = { getWalletByUser };
