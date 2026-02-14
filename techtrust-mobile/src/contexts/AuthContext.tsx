/**
 * AuthContext - Contexto de Autenticação
 * Suporta CUSTOMER e PROVIDER com API real
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../services/api";

// ============================================
// TYPES
// ============================================
interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: "CUSTOMER" | "PROVIDER";
  avatarUrl?: string;
  providerProfile?: {
    businessName: string;
    businessType: string;
    averageRating: number;
    totalReviews: number;
    isVerified: boolean;
    description?: string;
    website?: string;
    address?: string;
    cpfCnpj?: string;
    fdacsRegistrationNumber?: string;
  };
}

interface SocialLoginResult {
  status: "AUTHENTICATED" | "NEEDS_PASSWORD" | "NEEDS_PHONE_VERIFICATION";
  userId?: string;
  email?: string;
  fullName?: string;
  phone?: string | null;
  provider?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  hasCompletedOnboarding: boolean;
  completeOnboarding: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginAsProvider: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<{ userId: string }>;
  signUp: (
    data: SignupData,
  ) => Promise<{ userId: string; otpMethod?: string; email?: string }>;
  socialLogin: (
    provider: string,
    token: string,
    extra?: { appleUserId?: string; fullName?: string },
  ) => Promise<SocialLoginResult>;
  completeSocialSignup: (
    userId: string,
    password: string,
    phone?: string,
  ) => Promise<SocialLoginResult>;
  verifyOTP: (
    userId: string,
    code: string,
    method?: "sms" | "email",
  ) => Promise<void>;
  resendOTP: (userId: string, method?: "sms" | "email") => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

interface SignupData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  language?: string;
  role?: "CLIENT" | "PROVIDER";
  businessName?: string;
  businessAddress?: string;
  businessCity?: string;
  businessState?: string;
  businessZipCode?: string;
}

// ============================================
// CONTEXT
// ============================================
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true); // default true to avoid flash

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("@TechTrust:user");
      const token = await AsyncStorage.getItem("@TechTrust:token");

      // Se não tem usuário ou token, limpar dados antigos e retornar
      if (!storedUser || !token) {
        console.log("🔍 Sem dados de autenticação salvos");
        await clearAuthData();
        return;
      }

      // Tentar validar o token com a API
      try {
        const response = await api.get("/users/me");
        if (response.data?.data) {
          // Token válido, atualizar dados do usuário
          const apiUser = response.data.data;
          const normalizedUser: User = {
            id: apiUser.id,
            email: apiUser.email,
            fullName: apiUser.fullName,
            phone: apiUser.phone || "",
            role: apiUser.role === "CLIENT" ? "CUSTOMER" : apiUser.role,
            providerProfile: apiUser.providerProfile
              ? {
                  businessName: apiUser.providerProfile.businessName || "",
                  businessType: apiUser.providerProfile.businessType || "",
                  averageRating: apiUser.providerProfile.averageRating || 0,
                  totalReviews: apiUser.providerProfile.totalReviews || 0,
                  isVerified: apiUser.providerProfile.isVerified || false,
                  description: apiUser.providerProfile.description,
                  website: apiUser.providerProfile.website,
                  address: apiUser.providerProfile.address,
                  cpfCnpj: apiUser.providerProfile.cpfCnpj,
                  fdacsRegistrationNumber:
                    apiUser.providerProfile.fdacsRegistrationNumber,
                }
              : undefined,
          };
          await AsyncStorage.setItem(
            "@TechTrust:user",
            JSON.stringify(normalizedUser),
          );

          // Check onboarding status for providers BEFORE setting user
          // to prevent a flash of ProviderNavigator before switching to onboarding
          if (normalizedUser.role === "PROVIDER") {
            const onboardingDone = await AsyncStorage.getItem(
              `@TechTrust:onboarding:${normalizedUser.id}`,
            );
            setHasCompletedOnboarding(onboardingDone === "true");
          }
          setUser(normalizedUser);
        }
      } catch (apiError: any) {
        // Token inválido ou expirado - limpar dados

        await clearAuthData();
      }
    } catch (error) {
      console.error("Erro ao verificar auth:", error);
      await clearAuthData();
    } finally {
      setLoading(false);
    }
  };

  // Função para limpar todos os dados de autenticação
  const clearAuthData = async () => {
    try {
      await AsyncStorage.multiRemove([
        "@TechTrust:user",
        "@TechTrust:token",
        "@TechTrust:refreshToken",
        "@TechTrust:pendingUser",
      ]);
      setUser(null);
      setHasCompletedOnboarding(true);
    } catch (error) {
      console.error("Erro ao limpar dados:", error);
    }
  };

  // Marcar onboarding como concluído
  const completeOnboarding = async () => {
    if (user?.id) {
      await AsyncStorage.setItem(`@TechTrust:onboarding:${user.id}`, "true");
    }
    setHasCompletedOnboarding(true);
  };

  // Login como CLIENTE (padrão) — also handles providers correctly
  const login = async (email: string, password: string) => {
    try {
      const response = await api.post("/auth/login", { email, password });

      const { token, refreshToken, user: apiUser } = response.data.data;
      const normalizedUser: User = {
        id: apiUser.id,
        email: apiUser.email,
        fullName: apiUser.fullName,
        phone: apiUser.phone || "",
        role: apiUser.role === "CLIENT" ? "CUSTOMER" : apiUser.role,
        providerProfile: apiUser.providerProfile
          ? {
              businessName: apiUser.providerProfile.businessName || "",
              businessType: apiUser.providerProfile.businessType || "",
              averageRating: apiUser.providerProfile.averageRating || 0,
              totalReviews: apiUser.providerProfile.totalReviews || 0,
              isVerified: apiUser.providerProfile.isVerified || false,
              description: apiUser.providerProfile.description,
              website: apiUser.providerProfile.website,
              address: apiUser.providerProfile.address,
              cpfCnpj: apiUser.providerProfile.cpfCnpj,
              fdacsRegistrationNumber:
                apiUser.providerProfile.fdacsRegistrationNumber,
            }
          : undefined,
      };

      await AsyncStorage.setItem(
        "@TechTrust:user",
        JSON.stringify(normalizedUser),
      );
      await AsyncStorage.setItem("@TechTrust:token", token);
      if (refreshToken) {
        await AsyncStorage.setItem("@TechTrust:refreshToken", refreshToken);
      }

      // Check onboarding status for providers
      if (normalizedUser.role === "PROVIDER") {
        const onboardingDone = await AsyncStorage.getItem(
          `@TechTrust:onboarding:${normalizedUser.id}`,
        );
        setHasCompletedOnboarding(onboardingDone === "true");
      }

      setUser(normalizedUser);
    } catch (error: any) {
      // Verificar se é erro de telefone não verificado
      const errorCode = error?.response?.data?.code;
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Erro ao fazer login";

      // Criar erro com código para tratamento específico
      const loginError = new Error(message) as any;
      loginError.code = errorCode;
      loginError.data = error?.response?.data?.data;
      throw loginError;
    }
  };

  // Login como FORNECEDOR
  const loginAsProvider = async (email: string, password: string) => {
    try {
      const response = await api.post("/auth/login", { email, password });

      const { token, refreshToken, user: apiUser } = response.data.data;

      // Validar se é provider
      if (apiUser.role !== "PROVIDER") {
        throw new Error("Esta conta não é de fornecedor");
      }

      const normalizedUser: User = {
        id: apiUser.id,
        email: apiUser.email,
        fullName: apiUser.fullName,
        phone: apiUser.phone || "",
        role: "PROVIDER",
        providerProfile: apiUser.providerProfile
          ? {
              businessName: apiUser.providerProfile.businessName || "",
              businessType: apiUser.providerProfile.businessType || "",
              averageRating: apiUser.providerProfile.averageRating || 0,
              totalReviews: apiUser.providerProfile.totalReviews || 0,
              isVerified: apiUser.providerProfile.isVerified || false,
              description: apiUser.providerProfile.description,
              website: apiUser.providerProfile.website,
              address: apiUser.providerProfile.address,
              cpfCnpj: apiUser.providerProfile.cpfCnpj,
              fdacsRegistrationNumber:
                apiUser.providerProfile.fdacsRegistrationNumber,
            }
          : undefined,
      };

      await AsyncStorage.setItem(
        "@TechTrust:user",
        JSON.stringify(normalizedUser),
      );
      await AsyncStorage.setItem("@TechTrust:token", token);
      if (refreshToken) {
        await AsyncStorage.setItem("@TechTrust:refreshToken", refreshToken);
      }

      // Check onboarding status
      const onboardingDone = await AsyncStorage.getItem(
        `@TechTrust:onboarding:${normalizedUser.id}`,
      );
      setHasCompletedOnboarding(onboardingDone === "true");

      setUser(normalizedUser);
    } catch (error: any) {
      // Verificar se é erro de telefone não verificado
      const errorCode = error?.response?.data?.code;
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Erro ao fazer login";

      // Criar erro com código para tratamento específico
      const loginError = new Error(message) as any;
      loginError.code = errorCode;
      loginError.data = error?.response?.data?.data;
      throw loginError;
    }
  };

  const signup = async (
    data: SignupData,
  ): Promise<{ userId: string; otpMethod?: string; email?: string }> => {
    try {
      const response = await api.post("/auth/signup", data);

      const { userId, otpMethod, email: responseEmail } = response.data.data;

      await AsyncStorage.setItem(
        "@TechTrust:pendingUser",
        JSON.stringify({
          userId,
          email: data.email,
          phone: data.phone,
          otpMethod,
        }),
      );

      return { userId, otpMethod, email: responseEmail || data.email };
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Erro ao criar conta";
      throw new Error(message);
    }
  };

  const resendOTP = async (
    userId: string,
    method: "sms" | "email" = "sms",
  ): Promise<void> => {
    try {
      await api.post("/auth/resend-otp", { userId, method });
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Erro ao reenviar código";
      throw new Error(message);
    }
  };

  const verifyOTP = async (
    userId: string,
    code: string,
    method: "sms" | "email" = "sms",
  ): Promise<void> => {
    try {
      const response = await api.post("/auth/verify-otp", {
        userId,
        otpCode: code,
        method,
      });

      const { token, refreshToken, user: apiUser } = response.data.data;
      const normalizedUser: User = {
        id: apiUser.id,
        email: apiUser.email,
        fullName: apiUser.fullName,
        phone: apiUser.phone || "",
        role: apiUser.role === "CLIENT" ? "CUSTOMER" : apiUser.role,
        providerProfile: apiUser.providerProfile
          ? {
              id: apiUser.providerProfile.id,
              businessName: apiUser.providerProfile.businessName,
              servicesOffered: apiUser.providerProfile.servicesOffered,
              vehicleTypesServed: apiUser.providerProfile.vehicleTypesServed,
              sellsParts: apiUser.providerProfile.sellsParts,
            }
          : undefined,
      };

      await AsyncStorage.setItem(
        "@TechTrust:user",
        JSON.stringify(normalizedUser),
      );
      await AsyncStorage.setItem("@TechTrust:token", token);
      if (refreshToken) {
        await AsyncStorage.setItem("@TechTrust:refreshToken", refreshToken);
      }
      await AsyncStorage.removeItem("@TechTrust:pendingUser");

      // Check onboarding status for providers
      if (normalizedUser.role === "PROVIDER") {
        const onboardingDone = await AsyncStorage.getItem(
          `@TechTrust:onboarding:${normalizedUser.id}`,
        );
        setHasCompletedOnboarding(onboardingDone === "true");
      }

      setUser(normalizedUser);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Erro ao verificar código";
      throw new Error(message);
    }
  };

  const logout = async () => {
    try {
      // Limpar TODOS os dados do AsyncStorage relacionados à autenticação
      await AsyncStorage.multiRemove([
        "@TechTrust:user",
        "@TechTrust:token",
        "@TechTrust:refreshToken",
        "@TechTrust:pendingUser",
      ]);
      setUser(null);
      setHasCompletedOnboarding(true);
      console.log("✅ Logout realizado com sucesso");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  // ============================================
  // SOCIAL LOGIN
  // ============================================

  const socialLogin = async (
    provider: string,
    token: string,
    extra?: { appleUserId?: string; fullName?: string },
  ): Promise<SocialLoginResult> => {
    try {
      const response = await api.post("/auth/social", {
        provider,
        token,
        appleUserId: extra?.appleUserId,
        fullName: extra?.fullName,
      });

      const data = response.data.data;

      if (data.status === "AUTHENTICATED") {
        // User is fully authenticated
        const normalizedUser: User = {
          id: data.user.id,
          email: data.user.email,
          fullName: data.user.fullName,
          phone: data.user.phone || "",
          role: data.user.role === "CLIENT" ? "CUSTOMER" : data.user.role,
          avatarUrl: data.user.avatarUrl,
          providerProfile: data.user.providerProfile
            ? {
                businessName: data.user.providerProfile.businessName || "",
                businessType: data.user.providerProfile.businessType || "",
                averageRating: data.user.providerProfile.averageRating || 0,
                totalReviews: data.user.providerProfile.totalReviews || 0,
                isVerified: data.user.providerProfile.isVerified || false,
              }
            : undefined,
        };

        await AsyncStorage.setItem(
          "@TechTrust:user",
          JSON.stringify(normalizedUser),
        );
        await AsyncStorage.setItem("@TechTrust:token", data.token);
        if (data.refreshToken) {
          await AsyncStorage.setItem(
            "@TechTrust:refreshToken",
            data.refreshToken,
          );
        }

        // Check onboarding for providers
        if (normalizedUser.role === "PROVIDER") {
          const onboardingDone = await AsyncStorage.getItem(
            `@TechTrust:onboarding:${normalizedUser.id}`,
          );
          setHasCompletedOnboarding(onboardingDone === "true");
        }

        setUser(normalizedUser);
      }

      return {
        status: data.status,
        userId: data.userId,
        email: data.email,
        fullName: data.fullName,
        phone: data.phone,
        provider: data.provider,
      };
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Social login failed";
      throw new Error(message);
    }
  };

  const completeSocialSignup = async (
    userId: string,
    password: string,
    phone?: string,
  ): Promise<SocialLoginResult> => {
    try {
      const response = await api.post("/auth/social/complete", {
        userId,
        password,
        phone,
      });

      const data = response.data.data;

      if (data.status === "AUTHENTICATED") {
        const normalizedUser: User = {
          id: data.user.id,
          email: data.user.email,
          fullName: data.user.fullName,
          phone: data.user.phone || "",
          role: data.user.role === "CLIENT" ? "CUSTOMER" : data.user.role,
          avatarUrl: data.user.avatarUrl,
          providerProfile: data.user.providerProfile
            ? {
                businessName: data.user.providerProfile.businessName || "",
                businessType: data.user.providerProfile.businessType || "",
                averageRating: data.user.providerProfile.averageRating || 0,
                totalReviews: data.user.providerProfile.totalReviews || 0,
                isVerified: data.user.providerProfile.isVerified || false,
              }
            : undefined,
        };

        await AsyncStorage.setItem(
          "@TechTrust:user",
          JSON.stringify(normalizedUser),
        );
        await AsyncStorage.setItem("@TechTrust:token", data.token);
        if (data.refreshToken) {
          await AsyncStorage.setItem(
            "@TechTrust:refreshToken",
            data.refreshToken,
          );
        }

        // Check onboarding for providers
        if (normalizedUser.role === "PROVIDER") {
          const onboardingDone = await AsyncStorage.getItem(
            `@TechTrust:onboarding:${normalizedUser.id}`,
          );
          setHasCompletedOnboarding(onboardingDone === "true");
        }

        setUser(normalizedUser);
      }

      return {
        status: data.status,
        userId: data.userId,
        phone: data.phone,
      };
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to complete signup";
      throw new Error(message);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        hasCompletedOnboarding,
        completeOnboarding,
        login,
        loginAsProvider,
        signup,
        signUp: signup,
        socialLogin,
        completeSocialSignup,
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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
