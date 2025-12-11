/**
 * AuthContext - Cliente Web Dashboard
 * Autenticação integrada com Backend TechTrust
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/router';
import { api } from '../services/api';

// Modo de desenvolvimento - aceita login demo
const DEV_MODE = process.env.NODE_ENV === 'development';

interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: 'CUSTOMER';
  memberSince?: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  updateUser: (data: Partial<User>) => void;
}

interface RegisterData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

// Usuário demo para desenvolvimento
const DEMO_USER: User = {
  id: 'demo-customer-001',
  email: 'cliente@teste.com',
  fullName: 'João Cliente',
  phone: '+55 11 99999-9999',
  role: 'CUSTOMER',
  memberSince: '2023',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = Cookies.get('tt_client_token');
      const savedUser = Cookies.get('tt_client_user');

      if (token && savedUser) {
        // Carrega usuário salvo primeiro (fast)
        const parsed = JSON.parse(savedUser);
        setUser(parsed);

        // Em background, valida o token com o backend (slow)
        if (!DEV_MODE || token !== 'demo-token-client') {
          try {
            const response = await api.getProfile();
            if (response.data) {
              const updatedUser: User = {
                id: response.data.id,
                email: response.data.email,
                fullName: response.data.fullName,
                phone: response.data.phone,
                role: response.data.role,
                avatarUrl: response.data.avatarUrl,
              };
              setUser(updatedUser);
              Cookies.set('tt_client_user', JSON.stringify(updatedUser), { expires: 7 });
            }
          } catch (e) {
            // Token inválido - limpar sessão
            console.log('Token inválido, limpando sessão');
            Cookies.remove('tt_client_token');
            Cookies.remove('tt_client_user');
            setUser(null);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao verificar auth:', error);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    if (!email || !password) {
      throw new Error('Preencha email e senha');
    }

    // Modo demo para desenvolvimento rápido
    if (DEV_MODE && (email === 'demo@teste.com' || email.includes('demo'))) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const demoUser = { ...DEMO_USER, email };
      Cookies.set('tt_client_token', 'demo-token-client', { expires: 7 });
      Cookies.set('tt_client_user', JSON.stringify(demoUser), { expires: 7 });
      setUser(demoUser);
      router.push('/dashboard');
      return;
    }

    // Login real via API
    const response = await api.login(email, password);
    
    if (response.error) {
      throw new Error(response.error);
    }

    if (response.data) {
      const { token, user: userData } = response.data;
      
      const loggedUser: User = {
        id: userData.id,
        email: userData.email,
        fullName: userData.fullName,
        phone: userData.phone,
        role: userData.role,
        avatarUrl: userData.avatarUrl,
      };

      Cookies.set('tt_client_token', token, { expires: 7 });
      Cookies.set('tt_client_user', JSON.stringify(loggedUser), { expires: 7 });
      
      setUser(loggedUser);
      router.push('/dashboard');
    }
  }

  async function register(data: RegisterData) {
    const response = await api.register(data);
    
    if (response.error) {
      throw new Error(response.error);
    }

    // Após registro bem-sucedido, fazer login automático
    await login(data.email, data.password);
  }

  function logout() {
    Cookies.remove('tt_client_token');
    Cookies.remove('tt_client_user');
    setUser(null);
    router.push('/login');
  }

  function updateUser(data: Partial<User>) {
    if (user) {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      Cookies.set('tt_client_user', JSON.stringify(updatedUser), { expires: 7 });
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        updateUser,
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

export { AuthContext };
