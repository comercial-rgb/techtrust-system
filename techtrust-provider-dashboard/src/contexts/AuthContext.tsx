'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/router'
import Cookies from 'js-cookie'
import api from '@/services/api'

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

    try {
      const response = await api.get('/users/me')
      const userData = response.data.data
      
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
    if (!email || !password) {
      throw new Error('Preencha email e senha')
    }

    try {
      const response = await api.post('/auth/login', { email, password })
      const { accessToken, refreshToken, user: userData } = response.data.data
      
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
