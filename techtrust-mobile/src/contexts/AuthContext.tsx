/**
 * Auth Context - Gerenciamento de autenticação
 */

import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { User, AuthResponse, SignupData, LoginData } from '../types';

interface AuthContextData {
  user: User | null;
  loading: boolean;
  signUp: (data: SignupData) => Promise<{ userId: string }>;
  verifyOTP: (userId: string, otpCode: string) => Promise<void>;
  login: (data: LoginData) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredData();
  }, []);

  async function loadStoredData() {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      const token = await AsyncStorage.getItem('token');

      if (storedUser && token) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  async function signUp(data: SignupData) {
    try {
      const response = await api.post('/auth/signup', data);
      return { userId: response.data.data.userId };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao cadastrar');
    }
  }

  async function verifyOTP(userId: string, otpCode: string) {
    try {
      const response = await api.post<AuthResponse>('/auth/verify-otp', {
        userId,
        otpCode,
      });

      const { user: userData, token, refreshToken } = response.data.data;

      await AsyncStorage.multiSet([
        ['user', JSON.stringify(userData)],
        ['token', token],
        ['refreshToken', refreshToken],
      ]);

      setUser(userData);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Código inválido');
    }
  }

  async function login(data: LoginData) {
    try {
      const response = await api.post<AuthResponse>('/auth/login', data);

      const { user: userData, token, refreshToken } = response.data.data;

      await AsyncStorage.multiSet([
        ['user', JSON.stringify(userData)],
        ['token', token],
        ['refreshToken', refreshToken],
      ]);

      setUser(userData);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao fazer login');
    }
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      await AsyncStorage.multiRemove(['user', 'token', 'refreshToken']);
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, verifyOTP, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
