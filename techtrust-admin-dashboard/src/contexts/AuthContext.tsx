import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';
import { adminApi } from '../services/api';
import { unwrapApiData } from '../utils/unwrapApiData';

interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'ADMIN';
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Modo desenvolvimento - permite login sem backend
const DEV_MODE = false;
const DEV_ADMIN = {
  id: 'admin-1',
  fullName: 'Administrador TechTrust',
  email: 'admin@techtrust.com',
  phone: '11999999999',
  role: 'ADMIN' as const,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const token = Cookies.get('tt_admin_token');
    
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await adminApi.getProfile();
      // api.ts auto-unwraps — response.data is the user object (or { user, subscription })
      const root = unwrapApiData<Record<string, unknown>>(response.data) as Record<string, unknown>;
      const profileData = (root.user as User | undefined) ?? (root as unknown as User);

      if (profileData && profileData.role === 'ADMIN') {
        setUser(profileData);
      } else if (DEV_MODE && token === 'dev-admin-token') {
        setUser(DEV_ADMIN);
      } else {
        Cookies.remove('tt_admin_token');
      }
    } catch (error) {
      if (DEV_MODE && token === 'dev-admin-token') {
        setUser(DEV_ADMIN);
      } else {
        Cookies.remove('tt_admin_token');
      }
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    try {
      // Modo desenvolvimento
      if (DEV_MODE && email === 'admin@techtrust.com' && password === 'admin123') {
        Cookies.set('tt_admin_token', 'dev-admin-token', { expires: 7 });
        setUser(DEV_ADMIN);
        return { success: true };
      }

      const response = await adminApi.login(email, password);

      if (response.error) {
        return { success: false, error: response.error };
      }

      // api.ts auto-unwraps { success, data } — response.data is { token, user }
      const loginData = unwrapApiData<{ token?: string; user?: User }>(response.data);

      if (loginData?.user?.role !== 'ADMIN') {
        return { success: false, error: 'Acesso restrito a administradores' };
      }

      if (!loginData?.token) {
        return { success: false, error: 'Resposta inválida do servidor' };
      }

      Cookies.set('tt_admin_token', loginData.token, { expires: 7 });
      setUser(loginData.user);
      return { success: true };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro ao fazer login';
      return { success: false, error: msg };
    }
  }

  function logout() {
    Cookies.remove('tt_admin_token');
    setUser(null);
    router.push('/login');
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
