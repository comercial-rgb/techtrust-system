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
  hasCompletedOnboarding: boolean
  completeOnboarding: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true)
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

    // Check onboarding status from localStorage
    const onboardingDone = localStorage.getItem('tt_provider_onboarding_done')
    setHasCompletedOnboarding(onboardingDone === 'true')

    try {
      const response = await api.get('/users/me')
      const userData = response.data.data
      
      if (userData.role !== 'PROVIDER') {
        throw new Error('Acesso negado. Apenas fornecedores.')
      }
      
      setUser(userData)

      // If user has compliance items, consider onboarding done
      if (!onboardingDone) {
        try {
          const complianceRes = await api.get('/compliance/summary')
          const summary = complianceRes.data?.data || complianceRes.data
          const hasUploads = summary?.complianceItems?.some((c: any) => c.documentUploads?.length > 0) ||
                            summary?.insurancePolicies?.some((i: any) => i.coiUploads?.length > 0)
          if (hasUploads) {
            localStorage.setItem('tt_provider_onboarding_done', 'true')
            setHasCompletedOnboarding(true)
          }
        } catch {}
      }
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

      // Check if provider needs onboarding
      const onboardingDone = localStorage.getItem('tt_provider_onboarding_done')
      if (onboardingDone === 'true') {
        setHasCompletedOnboarding(true)
        router.push('/dashboard')
      } else {
        // Check if they have any compliance uploads already
        try {
          const complianceRes = await api.get('/compliance/summary')
          const summary = complianceRes.data?.data || complianceRes.data
          const hasUploads = summary?.complianceItems?.some((c: any) => c.documentUploads?.length > 0) ||
                            summary?.insurancePolicies?.some((i: any) => i.coiUploads?.length > 0)
          if (hasUploads) {
            localStorage.setItem('tt_provider_onboarding_done', 'true')
            setHasCompletedOnboarding(true)
            router.push('/dashboard')
          } else {
            setHasCompletedOnboarding(false)
            router.push('/onboarding')
          }
        } catch {
          // If compliance check fails, go to onboarding
          setHasCompletedOnboarding(false)
          router.push('/onboarding')
        }
      }
    } catch (error: any) {
      // Re-throw the original axios error so login page can inspect response data (e.g. PHONE_NOT_VERIFIED)
      if (error.response) {
        throw error
      }
      throw new Error(error.message || 'Erro ao fazer login')
    }
  }

  function logout() {
    Cookies.remove('token')
    Cookies.remove('refreshToken')
    localStorage.removeItem('tt_provider_onboarding_done')
    setUser(null)
    router.push('/login')
  }

  function completeOnboarding() {
    localStorage.setItem('tt_provider_onboarding_done', 'true')
    setHasCompletedOnboarding(true)
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      isAuthenticated: !!user,
      hasCompletedOnboarding,
      completeOnboarding,
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
