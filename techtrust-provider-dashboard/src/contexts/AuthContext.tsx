'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/router'
import Cookies from 'js-cookie'
import api from '@/services/api'

// Modo DEMO - permite testar sem backend
const DEMO_MODE = true

interface User {
  id: string
  email: string
  fullName: string
  phone: string
  role: string
  providerProfile?: {
    businessName: string
    businessType: string
    averageRating: number
    totalReviews: number
    isVerified: boolean
  }
}

// Usuário demo para testes
const DEMO_USER: User = {
  id: 'demo-provider-001',
  email: 'fornecedor@teste.com',
  fullName: 'João Mecânico',
  phone: '+1 (407) 555-1234',
  role: 'PROVIDER',
  providerProfile: {
    businessName: 'Auto Center Express',
    businessType: 'AUTO_REPAIR',
    averageRating: 4.8,
    totalReviews: 47,
    isVerified: true,
  }
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const token = Cookies.get('token')
    
    if (!token) {
      setLoading(false)
      return
    }

    // MODO DEMO
    if (DEMO_MODE) {
      setUser(DEMO_USER)
      setLoading(false)
      return
    }

    try {
      const response = await api.get('/users/me')
      const userData = response.data.data
      
      // Verificar se é um fornecedor
      if (userData.role !== 'PROVIDER') {
        throw new Error('Acesso negado. Apenas fornecedores.')
      }
      
      setUser(userData)
    } catch (error) {
      console.error('Erro ao verificar auth:', error)
      Cookies.remove('token')
      Cookies.remove('refreshToken')
    } finally {
      setLoading(false)
    }
  }

  async function login(email: string, password: string) {
    // MODO DEMO - aceita qualquer email/senha
    if (DEMO_MODE) {
      // Simular delay de rede
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Validação básica
      if (!email || !password) {
        throw new Error('Preencha email e senha')
      }
      
      // Salvar token fake
      Cookies.set('token', 'demo-token-12345', { expires: 7 })
      Cookies.set('refreshToken', 'demo-refresh-token', { expires: 30 })
      
      // Usar email do usuário no perfil demo
      const demoUserWithEmail = {
        ...DEMO_USER,
        email: email,
      }
      
      setUser(demoUserWithEmail)
      router.push('/dashboard')
      return
    }

    // Modo produção - conecta ao backend real
    try {
      const response = await api.post('/auth/login', { email, password })
      const { accessToken, refreshToken, user: userData } = response.data.data
      
      // Verificar se é um fornecedor
      if (userData.role !== 'PROVIDER') {
        throw new Error('Acesso negado. Este portal é apenas para fornecedores.')
      }
      
      Cookies.set('token', accessToken, { expires: 7 })
      Cookies.set('refreshToken', refreshToken, { expires: 30 })
      
      setUser(userData)
      router.push('/dashboard')
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Erro ao fazer login')
    }
  }

  function logout() {
    Cookies.remove('token')
    Cookies.remove('refreshToken')
    setUser(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
