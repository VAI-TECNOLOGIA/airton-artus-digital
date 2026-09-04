import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client.js';
import { initPushNotifications, teardownPushNotifications } from '../lib/push.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('aad_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((r) => {
        setUser(r.data);
        initPushNotifications(); // sessão reidratada no app → garante token FCM
      })
      .catch(() => localStorage.removeItem('aad_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('aad_token', data.token);
    setUser(data.user);
    initPushNotifications(); // no navegador é no-op
    return data.user;
  };

  // Cadastro público: cria a conta (Apoiador) e já entra logado.
  const signup = async (payload) => {
    const { data } = await api.post('/auth/signup', payload);
    localStorage.setItem('aad_token', data.token);
    setUser(data.user);
    initPushNotifications();
    return data.user;
  };

  const logout = () => {
    teardownPushNotifications();
    localStorage.removeItem('aad_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
