import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const AuthContext = createContext(null);

const STORAGE_KEY = 'podcastai_auth';

export function AuthProvider({ children }) {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.user || null;
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    return null;
  });

  const [token, setToken] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.token || null;
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(false);

  // Listen for 401 session expiry from axios interceptor
  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null);
      setToken(null);
      localStorage.removeItem(STORAGE_KEY);
      navigate('/auth', { replace: true });
    };
    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, [navigate]);

  // Restore saved theme preference on mount
  useEffect(() => {
    if (!user) return;
    const savedTheme = user.preferences?.theme;
    if (savedTheme && savedTheme !== 'light') {
      document.documentElement.dataset.theme = savedTheme;
    }
  }, [user]);

  const persist = useCallback((userData, tokenData) => {
    setUser(userData);
    setToken(tokenData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: userData, token: tokenData }));
  }, []);

  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    try {
      // Try regular user login first, then fall back to admin
      let res;
      try {
        res = await api.post('/login', { email, password });
      } catch (regularErr) {
        if (regularErr.response?.status === 401) {
          // Try admin login
          res = await api.post('/admin/login', { email, password });
        } else {
          throw regularErr;
        }
      }
      const { token: newToken, user: userData } = res.data;
      const safeUser = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        avatar: null,
        bio: '',
        joinedAt: '',
      };
      persist(safeUser, newToken);
      return safeUser;
    } catch (err) {
      const message = err.response?.data?.error || 'Login failed. Please check your credentials.';
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [persist]);

  const register = useCallback(async (name, email, password) => {
    setIsLoading(true);
    try {
      const res = await api.post('/register', { name, email, password });
      const { token: newToken, user: userData } = res.data;
      const safeUser = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        avatar: null,
        bio: '',
        joinedAt: '',
      };
      persist(safeUser, newToken);
      return safeUser;
    } catch (err) {
      const message = err.response?.data?.error || 'Registration failed.';
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [persist]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const updateProfile = useCallback(async (updates) => {
    if (!user) throw new Error('Not authenticated');
    const updated = { ...user, ...updates };
    persist(updated, token);
    return updated;
  }, [user, token, persist]);

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isModerator: user?.role === 'moderator',
    isStaff: user?.role === 'admin' || user?.role === 'moderator',
    isLoading,
    login,
    register,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
