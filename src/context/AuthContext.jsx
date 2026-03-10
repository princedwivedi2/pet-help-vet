import { createContext, useState, useEffect } from 'react';
import authService from '../services/authService';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('vet_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      localStorage.removeItem('vet_user');
      return null;
    }
  });
  const [loading, setLoading] = useState(() => !!localStorage.getItem('vet_token'));

  const isAuthenticated = !!user && !!localStorage.getItem('vet_token');

  const login = async (email, password) => {
    const res = await authService.login({ email, password });
    
    // Backend returns { success, message, data: { user, token } }
    // After api interceptor: { success, message, data: { user, token } }
    const userData = res.data?.user || res.user;
    const token = res.data?.token || res.token;

    if (!userData || !token) {
      throw new Error('Invalid response from server');
    }

    if (userData.role !== 'vet') {
      throw new Error('Access denied. Vet account required.');
    }

    localStorage.setItem('vet_token', token);
    localStorage.setItem('vet_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // ignore
    }
    localStorage.removeItem('vet_token');
    localStorage.removeItem('vet_user');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      setLoading(true);
      const res = await authService.me();
      const userData = res.data?.user || res.user;
      if (userData) {
        localStorage.setItem('vet_user', JSON.stringify(userData));
        setUser(userData);
      }
    } catch {
      // token might be invalid
      localStorage.removeItem('vet_token');
      localStorage.removeItem('vet_user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (localStorage.getItem('vet_token') && !user) {
      refreshUser();
    }
  }, []);

  // Listen for forced logout from API interceptor (401)
  useEffect(() => {
    const handleForceLogout = () => {
      setUser(null);
    };
    window.addEventListener('auth:logout', handleForceLogout);
    return () => window.removeEventListener('auth:logout', handleForceLogout);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, login, logout, loading, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
