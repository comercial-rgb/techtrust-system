/**
 * AuthContext - Contexto de Autenticação
 * Suporta CUSTOMER e PROVIDER com API real
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

// ============================================
// TYPES
// ============================================
interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: 'CUSTOMER' | 'PROVIDER';
  providerProfile?: {
    businessName: string;
    businessType: string;
    averageRating: number;
    totalReviews: number;
    isVerified: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginAsProvider: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<{ userId: string }>;
  signUp: (data: SignupData) => Promise<{ userId: string }>; // Alias for signup
  verifyOTP: (userId: string, code: string) => Promise<void>;
  resendOTP: (userId: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

interface SignupData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  language?: string;
}

// ============================================
// CONTEXT
// ============================================
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('@TechTrust:user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Erro ao verificar auth:', error);
    } finally {
      setLoading(false);
    }
  };

  // Login como CLIENTE (padrão)
  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });

      const { token, refreshToken, user: apiUser } = response.data.data;
      const normalizedUser: User = {
        id: apiUser.id,
        email: apiUser.email,
        fullName: apiUser.fullName,
        phone: apiUser.phone || '',
        role: apiUser.role === 'CLIENT' ? 'CUSTOMER' : apiUser.role,
      };

      await AsyncStorage.setItem('@TechTrust:user', JSON.stringify(normalizedUser));
      await AsyncStorage.setItem('@TechTrust:token', token);
      if (refreshToken) {
        await AsyncStorage.setItem('@TechTrust:refreshToken', refreshToken);
      }

      setUser(normalizedUser);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Erro ao fazer login';
      throw new Error(message);
    }
  };

  // Login como FORNECEDOR
  const loginAsProvider = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });

      const { token, refreshToken, user: apiUser } = response.data.data;

      // Validar se é provider
      if (apiUser.role !== 'PROVIDER') {
        throw new Error('Esta conta não é de fornecedor');
      }

      const normalizedUser: User = {
        id: apiUser.id,
        email: apiUser.email,
        fullName: apiUser.fullName,
        phone: apiUser.phone || '',
        role: 'PROVIDER',
      };

      await AsyncStorage.setItem('@TechTrust:user', JSON.stringify(normalizedUser));
      await AsyncStorage.setItem('@TechTrust:token', token);
      if (refreshToken) {
        await AsyncStorage.setItem('@TechTrust:refreshToken', refreshToken);
      }

      setUser(normalizedUser);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Erro ao fazer login';
      throw new Error(message);
    }
  };

  const signup = async (data: SignupData): Promise<{ userId: string }> => {
    try {
      const response = await api.post('/auth/signup', data);
      
      const { userId } = response.data.data;

      await AsyncStorage.setItem(
        '@TechTrust:pendingUser',
        JSON.stringify({ userId, email: data.email, phone: data.phone })
      );

      return { userId };
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Erro ao criar conta';
      throw new Error(message);
    }
  };

  const resendOTP = async (userId: string): Promise<void> => {
    try {
      await api.post('/auth/resend-otp', { userId });
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Erro ao reenviar código';
      throw new Error(message);
    }
  };

  const verifyOTP = async (userId: string, code: string): Promise<void> => {
    try {
      console.log('🔐 Verificando OTP:', { userId, code, codeLength: code?.length });
      const response = await api.post('/auth/verify-otp', { userId, otpCode: code });

      const { token, refreshToken, user: apiUser } = response.data.data;
      const normalizedUser: User = {
        id: apiUser.id,
        email: apiUser.email,
        fullName: apiUser.fullName,
        phone: apiUser.phone || '',
        role: apiUser.role === 'CLIENT' ? 'CUSTOMER' : apiUser.role,
      };

      await AsyncStorage.setItem('@TechTrust:user', JSON.stringify(normalizedUser));
      await AsyncStorage.setItem('@TechTrust:token', token);
      if (refreshToken) {
        await AsyncStorage.setItem('@TechTrust:refreshToken', refreshToken);
      }
      await AsyncStorage.removeItem('@TechTrust:pendingUser');

      setUser(normalizedUser);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Erro ao verificar código';
      throw new Error(message);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('@TechTrust:user');
      await AsyncStorage.removeItem('@TechTrust:token');
      setUser(null);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginAsProvider,
        signup,
        signUp: signup, // Alias for components using signUp
        verifyOTP,
        resendOTP,
        logout,
        isAuthenticated: !!user,
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
