import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user); setWallet(data.wallet);
    } catch { setUser(null); setWallet(null); }
  }, []);

  useEffect(() => { refresh().finally(() => setLoading(false)); }, [refresh]);
  useEffect(() => {
    const onExpired = () => { setUser(null); setWallet(null); };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const value = useMemo(() => ({
    user, wallet, loading, refresh,
    async login(body) { const { data } = await api.post('/auth/login', body); await refresh(); return data.user; },
    async register(body) { const { data } = await api.post('/auth/register', body); await refresh(); return data.user; },
    async logout() { await api.post('/auth/logout').catch(() => {}); setUser(null); setWallet(null); },
    updateUser: setUser,
  }), [user, wallet, loading, refresh]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
