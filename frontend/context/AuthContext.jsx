import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { api, ApiError } from '../lib/api';
import { clearSession, getUser, getToken, saveSession } from '../lib/auth';

const AuthContext = createContext(null);

const ROLE_CAPABILITIES = {
  admin: {
    assets: { create: true, update: true, delete: true, predict: true },
    requests: { create: true, update: true, delete: true, approve: true },
    services: { create: true, update: true, delete: true },
    assignments: { create: true, update: true, delete: true, return: true, initiateReturn: true, confirmReturn: true },
    users: true,
    audit: true,
    settings: true,
    analytics: true,
    categories: { create: true, update: true, delete: true },
    vendors: { create: true, update: true, delete: true },
    departments: { create: true, update: true, delete: true },
  },
  technician: {
    assets: { create: true, update: true, delete: false, predict: true },
    requests: { create: true, update: true, delete: false, approve: true },
    services: { create: true, update: true, delete: false },
    assignments: { create: true, return: true, initiateReturn: true, confirmReturn: true },
    users: false,
    audit: false,
    settings: false,
    analytics: true,
    categories: false,
    vendors: { create: true, update: true, delete: false },
    departments: false,
  },
  staff: {
    assets: { create: false, update: false, delete: false, predict: false },
    requests: { create: true, update: false, delete: false, approve: false },
    services: { create: false, update: false, delete: false },
    assignments: { create: false, return: false, initiateReturn: true, confirmReturn: false },
    users: false,
    audit: false,
    settings: false,
    analytics: false,
    categories: false,
    vendors: false,
    departments: false,
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
      const nextUser = data.user || {
        username: data.user?.username,
        role: data.user?.role,
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
    const capabilities = ROLE_CAPABILITIES[user?.role] || {
      assets: {},
      requests: {},
      services: {},
      assignments: {},
      users: false,
      audit: false,
      settings: false,
      analytics: false,
      categories: false,
      vendors: false,
      departments: false,
    };
    return {
      role: user?.role || 'staff',
      resource: (resource) => capabilities[resource] || {},
      analytics: capabilities.analytics,
      users: capabilities.users,
      audit: capabilities.audit,
      settings: capabilities.settings,
      categories: capabilities.categories,
      vendors: capabilities.vendors,
      departments: capabilities.departments,
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
