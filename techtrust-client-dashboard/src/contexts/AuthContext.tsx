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

interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: "CUSTOMER";
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
            // Backend returns { success, data: { user, subscription } }
            const responseData = response.data.data || response.data;
            const userData = responseData.user || responseData;
            const updatedUser: User = {
              id: userData.id,
              email: userData.email,
              fullName: userData.fullName,
              phone: userData.phone,
              role: userData.role,
              avatarUrl: userData.avatarUrl,
            };
            setUser(updatedUser);
            Cookies.set("tt_client_user", JSON.stringify(updatedUser), {
              expires: 7,
            });
          }
        } catch (e) {
          console.log("Token inválido, limpando sessão");
          Cookies.remove("tt_client_token");
          Cookies.remove("tt_client_user");
          setUser(null);
        }
      }
    } catch (error) {
      console.error("Erro ao verificar auth:", error);
    } finally {
      setLoading(false);
    }
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
      // Backend returns { success, data: { token, user } }
      const responseData = response.data.data || response.data;
      const token = responseData.token || response.data.token;
      const userData = responseData.user || response.data.user;

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
