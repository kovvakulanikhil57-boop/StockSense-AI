import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('stocksense_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('stocksense_token') || null);
  const [loading, setLoading] = useState(true);

  // Validate session on boot
  useEffect(() => {
    async function initAuth() {
      if (token) {
        try {
          const res = await api.auth.getProfile();
          if (res.success && res.profile) {
            setUser(res.profile);
            localStorage.setItem('stocksense_user', JSON.stringify(res.profile));
          }
        } catch (err) {
          console.warn('Session expired or invalid, logging out.');
          logout();
        }
      }
      setLoading(false);
    }
    initAuth();
  }, [token]);

  const login = async (credentials, expectedRole = null) => {
    const payload = { ...credentials };
    if (expectedRole) payload.expectedRole = expectedRole;

    const res = await api.auth.login(payload);
    if (res.success && res.token) {
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('stocksense_token', res.token);
      localStorage.setItem('stocksense_user', JSON.stringify(res.user));
    }
    return res;
  };

  const agentLogin = async (credentials) => {
    const res = await api.auth.agentLogin(credentials);
    if (res.success && res.token) {
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('stocksense_token', res.token);
      localStorage.setItem('stocksense_user', JSON.stringify(res.user));
    }
    return res;
  };

  const register = async (studentData) => {
    const res = await api.auth.register(studentData);
    if (res.success && res.token) {
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('stocksense_token', res.token);
      localStorage.setItem('stocksense_user', JSON.stringify(res.user));
    }
    return res;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('stocksense_token');
    localStorage.removeItem('stocksense_user');
  };

  const refreshProfile = async () => {
    if (!token) return;
    try {
      const res = await api.auth.getProfile();
      if (res.success && res.profile) {
        setUser(res.profile);
        localStorage.setItem('stocksense_user', JSON.stringify(res.profile));
      }
    } catch (e) {
      console.error('Failed to refresh profile:', e);
    }
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: Boolean(token && user),
    isStudent: user?.role === 'STUDENT',
    isAgent: user?.role === 'DELIVERY_AGENT',
    isAdmin: user?.role === 'ADMIN',
    branchId: user?.branchId,
    branchCode: user?.branchCode,
    branchName: user?.branchName,
    login,
    agentLogin,
    register,
    logout,
    refreshProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
