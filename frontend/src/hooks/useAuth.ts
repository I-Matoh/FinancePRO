import { useEffect, useState } from 'react';
import api from '../lib/api';

export type User = {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'AUDITOR';
};

// Minimal auth state that survives refresh via cookie-backed refresh token.
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .post('/auth/refresh', {})
      .then((res) => {
        if (!active) return;
        if (res.data?.accessToken) {
          // Best-effort decode of access token for UI only.
          const parts = res.data.accessToken.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            setUser({ id: payload.sub, email: payload.email, role: payload.role });
          }
        }
      })
      .catch(() => null)
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post('/auth/login', { email, password });
    const token = res.data?.accessToken;
    if (token) {
      const parts = token.split('.');
      const payload = JSON.parse(atob(parts[1]));
      setUser({ id: payload.sub, email: payload.email, role: payload.role });
    }
  }

  async function register(email: string, password: string) {
    await api.post('/auth/register', { email, password });
    await login(email, password);
  }

  async function logout() {
    await api.post('/auth/logout', {});
    setUser(null);
  }

  return { user, loading, login, register, logout };
}
