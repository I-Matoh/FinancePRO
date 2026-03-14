const authService = require('../services/authService');

function setAuthCookies(res, { accessToken, refreshToken }) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    sameSite: 'strict',
    secure: isProd,
    maxAge: Number(process.env.ACCESS_TOKEN_TTL || 900) * 1000
  });
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    sameSite: 'strict',
    secure: isProd,
    maxAge: Number(process.env.REFRESH_TOKEN_TTL || 1209600) * 1000
  });
}

async function register(req, res) {
  try {
    const { email, password } = req.validated.body;
    const user = await authService.register({ email, password });
    return res.status(201).json({ user });
  } catch (err) {
    if (err.message === 'email_in_use') return res.status(409).json({ error: 'email_in_use' });
    return res.status(500).json({ error: 'register_failed' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.validated.body;
    const result = await authService.login({ email, password });
    setAuthCookies(res, result);
    return res.json({ user: result.user, accessToken: result.accessToken });
  } catch (err) {
    if (err.message === 'invalid_credentials') return res.status(401).json({ error: 'invalid_credentials' });
    return res.status(500).json({ error: 'login_failed' });
  }
}

async function refresh(req, res) {
  try {
    const refreshToken = req.cookies?.refresh_token || req.validated.body.refreshToken;
    const result = await authService.refresh({ refreshToken });
    setAuthCookies(res, result);
    return res.json({ accessToken: result.accessToken });
  } catch (err) {
    return res.status(401).json({ error: 'invalid_refresh' });
  }
}

async function logout(req, res) {
  const refreshToken = req.cookies?.refresh_token || req.validated.body.refreshToken;
  if (refreshToken) await authService.logout({ refreshToken });
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  return res.status(204).send();
}

module.exports = {
  register,
  login,
  refresh,
  logout
};
