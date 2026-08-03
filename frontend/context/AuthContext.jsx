import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { api, ApiError } from '../lib/api';
import { clearSession, getUser, getToken, saveSession } from '../lib/auth';

const AuthContext = createContext(null);

const ROLE_CAPABILITIES = {
  admin: {
    assets: { create: true, update: true, delete: true, predict: true },
    requests: { create: true, update: true, delete: true },
    services: { create: true, update: true, delete: true },
    analytics: true,
  },
  manager: {
    assets: { create: true, update: true, delete: false, predict: true },
    requests: { create: true, update: true, delete: false },
    services: { create: true, update: true, delete: false },
    analytics: true,
  },
  technician: {
    assets: { create: false, update: false, delete: false, predict: false },
    requests: { create: true, update: false, delete: false },
    services: { create: false, update: false, delete: false },
    analytics: true,
  },
  viewer: {
    assets: { create: false, update: false, delete: false, predict: false },
    requests: { create: false, update: false, delete: false },
    services: { create: false, update: false, delete: false },
    analytics: false,
  },
};

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within an AuthProvider');
  return value;
}

export function AuthProvider({ children }) {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = getToken();
    const storedUser = getUser();
    if (storedToken) {
      setToken(storedToken);
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const data = await api.post('/auth/login', { username, password });
      const nextUser = {
        username: data.user.username,
        role: data.user.role,
        lastLogin: data.user.lastLogin,
        loginStatus: data.user.loginStatus,
      };
      saveSession(data.accessToken, nextUser);
      setToken(data.accessToken);
      setUser(nextUser);
      return nextUser;
    } catch (error) {
      throw error instanceof ApiError
        ? error
        : new ApiError('Unable to log in. Please try again.', 0, error);
    }
  };

  const register = async (payload) => {
    const data = await api.post('/auth/register', payload);
    return data;
  };

  const logout = async () => {
    try {
      if (token) await api.post('/auth/logout');
    } catch {
      // logout must still clear the local session even if the API call fails
    } finally {
      clearSession();
      setToken(null);
      setUser(null);
      router.push('/login');
    }
  };

  const can = useMemo(() => {
    const capabilities = ROLE_CAPABILITIES[user?.role] || ROLE_CAPABILITIES.viewer;
    return {
      role: user?.role || 'viewer',
      resource: (resource) => capabilities[resource] || {},
      analytics: capabilities.analytics,
    };
  }, [user]);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(token),
      login,
      register,
      logout,
      can,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token, user, loading, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
