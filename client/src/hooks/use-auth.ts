import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { authStorage, createAuthHeaders } from "@/lib/auth";
import type { User, LoginData, InsertUser } from "../../../shared/schema";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginData) => Promise<void>;
  register: (data: InsertUser) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const queryClient = useQueryClient();

  // Fetch current user
  const { data: currentUser, isLoading } = useQuery({
    queryKey: ["/api/me"],
    queryFn: async () => {
      const token = authStorage.getToken();
      if (!token) return null;

      const response = await fetch("/api/me", {
        headers: createAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          authStorage.removeToken();
          return null;
        }
        throw new Error("Failed to fetch user");
      }

      return response.json();
    },
    enabled: !!authStorage.getToken(),
  });

  useEffect(() => {
    setUser(currentUser || null);
    // Сохраняем userId в глобальной переменной для доступа из других хуков
    if (currentUser) {
      (window as any).__CURRENT_USER_ID__ = currentUser.id;
    } else {
      delete (window as any).__CURRENT_USER_ID__;
    }
  }, [currentUser]);

  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const response = await apiRequest("POST", "/api/login", data);
      return response.json();
    },
    onSuccess: (data: any) => {
      authStorage.setToken(data.token);
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      const response = await apiRequest("POST", "/api/register", data);
      return response.json();
    },
    onSuccess: (data: any) => {
      authStorage.setToken(data.token);
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
    },
  });

  const logout = () => {
    authStorage.removeToken();
    setUser(null);
    delete (window as any).__CURRENT_USER_ID__;
    queryClient.clear();
  };

  const login = async (data: LoginData) => {
    await loginMutation.mutateAsync(data);
  };

  const register = async (data: InsertUser) => {
    await registerMutation.mutateAsync(data);
  };

  const contextValue: AuthContextType = {
    user,
    isLoading: isLoading || loginMutation.isPending || registerMutation.isPending,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return React.createElement(AuthContext.Provider, { value: contextValue }, children);
}
