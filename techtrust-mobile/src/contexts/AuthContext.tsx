/**
 * AuthContext - Contexto de Autenticação
 * Suporta CUSTOMER e PROVIDER com modo demo
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// TYPES
// ============================================
interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
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
// DEMO DATA
// ============================================
const DEMO_CUSTOMER: User = {
  id: 'demo-customer-001',
  email: 'cliente@teste.com',
  fullName: 'João Cliente',
  phone: '+1 (407) 555-1234',
  role: 'CUSTOMER',
};

const DEMO_PROVIDER: User = {
  id: 'demo-provider-001',
  email: 'fornecedor@teste.com',
  fullName: 'Carlos Mecânico',
  phone: '+1 (407) 555-5678',
  role: 'PROVIDER',
  providerProfile: {
    businessName: 'Auto Center Express',
    businessType: 'AUTO_REPAIR',
    averageRating: 4.8,
    totalReviews: 47,
    isVerified: true,
  },
};

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
      // Simular delay de rede
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (!email || !password) {
        throw new Error('Preencha email e senha');
      }

      // Modo demo - usar dados do cliente
      const userData = { ...DEMO_CUSTOMER, email };
      
      await AsyncStorage.setItem('@TechTrust:user', JSON.stringify(userData));
      await AsyncStorage.setItem('@TechTrust:token', 'demo-token-customer');
      
      setUser(userData);
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao fazer login');
    }
  };

  // Login como FORNECEDOR
  const loginAsProvider = async (email: string, password: string) => {
    try {
      // Simular delay de rede
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (!email || !password) {
        throw new Error('Preencha email e senha');
      }

      // Modo demo - usar dados do fornecedor
      const userData = { ...DEMO_PROVIDER, email };
      
      await AsyncStorage.setItem('@TechTrust:user', JSON.stringify(userData));
      await AsyncStorage.setItem('@TechTrust:token', 'demo-token-provider');
      
      setUser(userData);
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao fazer login');
    }
  };

  const signup = async (data: SignupData): Promise<{ userId: string }> => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const newUser: User = {
        id: `user-${Date.now()}`,
        email: data.email,
        fullName: data.fullName,
        phone: data.phone,
        role: 'CUSTOMER',
      };

      // Store temporarily until OTP verification
      await AsyncStorage.setItem('@TechTrust:pendingUser', JSON.stringify(newUser));

      return { userId: newUser.id };
    } catch (error: any) {
      throw new Error(error.message || 'Error creating account');
    }
  };

  const verifyOTP = async (userId: string, code: string): Promise<void> => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Demo mode - accept any 6-digit code or specific code
      if (code.length !== 6) {
        throw new Error('Invalid verification code');
      }

      // Get pending user and complete registration
      const pendingUserStr = await AsyncStorage.getItem('@TechTrust:pendingUser');
      if (!pendingUserStr) {
        throw new Error('No pending registration found');
      }

      const pendingUser = JSON.parse(pendingUserStr);
      
      await AsyncStorage.setItem('@TechTrust:user', JSON.stringify(pendingUser));
      await AsyncStorage.setItem('@TechTrust:token', 'demo-token-verified-user');
      await AsyncStorage.removeItem('@TechTrust:pendingUser');

      setUser(pendingUser);
    } catch (error: any) {
      throw new Error(error.message || 'Error verifying code');
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
