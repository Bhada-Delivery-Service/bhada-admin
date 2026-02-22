import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null);
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('accessToken'));
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const token       = localStorage.getItem('accessToken');
    const storedUser  = localStorage.getItem('user');
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      setAccessToken(token);
      authAPI.checkSession()
        .then(({ data }) => { if (!data.valid) logout(); })
        .catch(logout)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Keep accessToken state in sync whenever the HTTP interceptor silently
  // refreshes it into localStorage (fires a custom event we dispatch below).
  useEffect(() => {
    const handler = () => {
      const fresh = localStorage.getItem('accessToken');
      if (fresh) setAccessToken(fresh);
    };
    window.addEventListener('tokenRefreshed', handler);
    return () => window.removeEventListener('tokenRefreshed', handler);
  }, []);

  const login = (newAccessToken, refreshToken, userData) => {
    localStorage.setItem('accessToken',  newAccessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setAccessToken(newAccessToken);
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setAccessToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);