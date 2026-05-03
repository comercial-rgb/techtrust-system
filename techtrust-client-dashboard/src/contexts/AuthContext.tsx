/**
 * AuthContext - Cliente Web Dashboard
 * Autenticação integrada com Backend TechTrust
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/router";
import { api } from "../services/api";
import { logApiError, logDev } from "../utils/logger";

interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: "CUSTOMER";
  memberSince?: string;
  avatarUrl?: string;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  socialLogin: (
    provider: 'google' | 'apple',
    token: string,
    extra?: { appleUserId?: string; fullName?: string }
  ) => Promise<
    | { status: 'AUTHENTICATED' }
    | { status: 'NEEDS_PASSWORD'; userId: string; email: string; fullName: string }
  >;
  completeSocialSignup: (
    userId: string,
    phone: string,
    password: string
  ) => Promise<
    | { status: 'AUTHENTICATED' }
    | { status: 'NEEDS_PHONE_VERIFICATION'; userId: string; phone: string }
  >;
  verifySocialPhone: (userId: string, otpCode: string) => Promise<void>;
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
      const token = Cookies.get("tt_client_token");
      const savedUser = Cookies.get("tt_client_user");

      if (token && savedUser) {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);

        try {
          const response = await api.getProfile();
          if (response.data) {
            // api.ts auto-unwraps { success, data } — response.data is the actual payload
            const responseData = response.data;
            const userData = responseData.user || responseData;
            const updatedUser: User = {
              id: userData.id,
              email: userData.email,
              fullName: userData.fullName,
              phone: userData.phone,
              role: userData.role,
              avatarUrl: userData.avatarUrl,
              memberSince: userData.createdAt ? new Date(userData.createdAt).getFullYear().toString() : undefined,
            };
            setUser(updatedUser);
            Cookies.set("tt_client_user", JSON.stringify(updatedUser), {
              expires: 7,
            });
          }
        } catch (e) {
          logDev("Token inválido, limpando sessão");
          Cookies.remove("tt_client_token");
          Cookies.remove("tt_client_user");
          setUser(null);
        }
      }
    } catch (error) {
      logApiError("Erro ao verificar auth:", error);
    } finally {
      setLoading(false);
    }
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://techtrust-api.onrender.com/api/v1'

  function setAuthCookiesAndUser(token: string, userData: any) {
    const loggedUser: User = {
      id: userData.id,
      email: userData.email,
      fullName: userData.fullName,
      phone: userData.phone,
      role: userData.role,
      avatarUrl: userData.avatarUrl,
    }
    Cookies.set('tt_client_token', token, { expires: 7 })
    Cookies.set('tt_client_user', JSON.stringify(loggedUser), { expires: 7 })
    setUser(loggedUser)
    return loggedUser
  }

  async function socialLogin(
    provider: 'google' | 'apple',
    token: string,
    extra?: { appleUserId?: string; fullName?: string }
  ): Promise<
    | { status: 'AUTHENTICATED' }
    | { status: 'NEEDS_PASSWORD'; userId: string; email: string; fullName: string }
  > {
    const res = await fetch(`${apiBase}/auth/social`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: provider.toUpperCase(),
        token,
        appleUserId: extra?.appleUserId,
        fullName: extra?.fullName,
      }),
    })
    const json = await res.json()
    const data = json?.data

    if (data?.status === 'AUTHENTICATED') {
      setAuthCookiesAndUser(data.token, data.user)
      router.push('/dashboard')
      return { status: 'AUTHENTICATED' }
    }

    if (data?.status === 'NEEDS_PASSWORD') {
      return {
        status: 'NEEDS_PASSWORD',
        userId: data.userId,
        email: data.email,
        fullName: data.fullName || '',
      }
    }

    throw new Error('Social sign-in could not complete. Please try again.')
  }

  async function completeSocialSignup(
    userId: string,
    phone: string,
    password: string
  ): Promise<
    | { status: 'AUTHENTICATED' }
    | { status: 'NEEDS_PHONE_VERIFICATION'; userId: string; phone: string }
  > {
    const res = await fetch(`${apiBase}/auth/social/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, phone, password }),
    })
    const json = await res.json()
    const data = json?.data

    if (data?.status === 'AUTHENTICATED') {
      setAuthCookiesAndUser(data.token, data.user)
      router.push('/dashboard')
      return { status: 'AUTHENTICATED' }
    }

    if (data?.status === 'NEEDS_PHONE_VERIFICATION') {
      return {
        status: 'NEEDS_PHONE_VERIFICATION',
        userId: data.userId,
        phone: data.phone,
      }
    }

    const errorMsg = json?.message || json?.error || 'Could not complete sign-up. Please try again.'
    throw new Error(errorMsg)
  }

  async function verifySocialPhone(userId: string, otpCode: string): Promise<void> {
    const res = await fetch(`${apiBase}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, otpCode, method: 'sms' }),
    })
    const json = await res.json()
    const data = json?.data

    if (!res.ok) {
      throw new Error(json?.message || json?.error || 'Verification failed')
    }

    if (data?.token && data?.user) {
      setAuthCookiesAndUser(data.token, data.user)
    }
    router.push('/dashboard')
  }

  async function login(email: string, password: string) {
    if (!email || !password) {
      throw new Error("Preencha email e senha");
    }

    const response = await api.login(email, password);

    if (response.error) {
      // Preserve error code and response data for PHONE_NOT_VERIFIED handling
      const err = new Error(response.error) as any;
      err.code = response.code;
      err.responseData = response.responseData;
      throw err;
    }

    if (response.data) {
      // api.ts auto-unwraps { success, data } — response.data is { token, user }
      const responseData = response.data;
      const token = responseData.token;
      const userData = responseData.user;

      if (!token || !userData) {
        throw new Error("Invalid response from server");
      }

      const loggedUser: User = {
        id: userData.id,
        email: userData.email,
        fullName: userData.fullName,
        phone: userData.phone,
        role: userData.role,
        avatarUrl: userData.avatarUrl,
      };

      Cookies.set("tt_client_token", token, { expires: 7 });
      Cookies.set("tt_client_user", JSON.stringify(loggedUser), { expires: 7 });

      setUser(loggedUser);
      router.push("/dashboard");
    }
  }

  async function register(data: RegisterData): Promise<void> {
    const response = await api.register(data);

    if (response.error) {
      throw new Error(response.error);
    }
  }

  function logout() {
    Cookies.remove("tt_client_token");
    Cookies.remove("tt_client_user");
    setUser(null);
    router.push("/login");
  }

  function updateUser(data: Partial<User>) {
    if (user) {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      Cookies.set("tt_client_user", JSON.stringify(updatedUser), {
        expires: 7,
      });
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        socialLogin,
        completeSocialSignup,
        verifySocialPhone,
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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export { AuthContext };
