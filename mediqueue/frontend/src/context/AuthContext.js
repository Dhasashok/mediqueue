import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe, login as apiLogin, logout as apiLogout } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('mq_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('mq_token');
    if (token) {
      getMe().then(res => {
        setUser(res.data.user);
        localStorage.setItem('mq_user', JSON.stringify(res.data.user));
      }).catch(() => {
        localStorage.removeItem('mq_token');
        localStorage.removeItem('mq_user');
        setUser(null);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (data) => {
    const res = await apiLogin(data);
    if (res.data.success) {
      localStorage.setItem('mq_token', res.data.token);
      localStorage.setItem('mq_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
    }
    return res.data;
  };

  const logout = async () => {
    await apiLogout().catch(() => {});
    localStorage.removeItem('mq_token');
    localStorage.removeItem('mq_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isLoggedIn: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
