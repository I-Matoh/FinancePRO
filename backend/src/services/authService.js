const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getSupabase } = require('../supabase');

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: Number(process.env.ACCESS_TOKEN_TTL || 900) }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: Number(process.env.REFRESH_TOKEN_TTL || 1209600) }
  );
}

// Store refresh tokens as hashes to reduce blast radius on DB leaks.
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function register({ email, password }) {
  const supabase = getSupabase();
  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await supabase.from('users').select('id').eq('email', email).limit(1);
  if (existing.error) throw existing.error;
  if (existing.data && existing.data.length > 0) throw new Error('email_in_use');

  const userRes = await supabase
    .from('users')
    .insert({ email, password_hash: passwordHash, role: 'USER' })
    .select('id, email, role')
    .single();
  if (userRes.error) throw userRes.error;

  await supabase
    .from('wallets')
    .insert({ user_id: userRes.data.id, balance: 0, currency: 'USD', status: 'ACTIVE' });

  return userRes.data;
}

async function login({ email, password }) {
  const supabase = getSupabase();
  const res = await supabase
    .from('users')
    .select('id, email, role, password_hash')
    .eq('email', email)
    .limit(1)
    .single();
  if (res.error) throw new Error('invalid_credentials');

  const user = res.data;
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw new Error('invalid_credentials');

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const refreshHash = hashToken(refreshToken);

  const ttl = Number(process.env.REFRESH_TOKEN_TTL || 1209600);
  await supabase.from('refresh_tokens').insert({
    user_id: user.id,
    token_hash: refreshHash,
    expires_at: new Date(Date.now() + ttl * 1000).toISOString()
  });

  return { accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role } };
}

async function refresh({ refreshToken }) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    throw new Error('invalid_refresh');
  }

  const supabase = getSupabase();
  const refreshHash = hashToken(refreshToken);
  const tokenRes = await supabase
    .from('refresh_tokens')
    .select('id, user_id, revoked_at, expires_at')
    .eq('token_hash', refreshHash)
    .gt('expires_at', new Date().toISOString())
    .limit(1)
    .single();
  if (tokenRes.error || tokenRes.data.revoked_at) throw new Error('invalid_refresh');

  const userRes = await supabase
    .from('users')
    .select('id, email, role')
    .eq('id', payload.sub)
    .limit(1)
    .single();
  if (userRes.error) throw new Error('invalid_refresh');

  const user = userRes.data;
  const accessToken = signAccessToken(user);
  const nextRefreshToken = signRefreshToken(user);

  await supabase.from('refresh_tokens').update({ revoked_at: new Date().toISOString() }).eq('id', tokenRes.data.id);

  const ttl = Number(process.env.REFRESH_TOKEN_TTL || 1209600);
  await supabase.from('refresh_tokens').insert({
    user_id: user.id,
    token_hash: hashToken(nextRefreshToken),
    expires_at: new Date(Date.now() + ttl * 1000).toISOString()
  });

  return { accessToken, refreshToken: nextRefreshToken };
}

async function logout({ refreshToken }) {
  const supabase = getSupabase();
  const refreshHash = hashToken(refreshToken);
  await supabase.from('refresh_tokens').update({ revoked_at: new Date().toISOString() }).eq('token_hash', refreshHash);
}

module.exports = {
  register,
  login,
  refresh,
  logout
};
