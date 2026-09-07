import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { api, setToken, clearToken, getToken } from "../api/client";
import { AuthUser } from "../types";

const USER_KEY = "pastoral_care_user";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [token, storedUser] = await Promise.all([getToken(), SecureStore.getItemAsync(USER_KEY)]);
      if (token && storedUser) {
        setUser(JSON.parse(storedUser));
      }
      setIsLoading(false);
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const { token, user: loggedInUser } = await api.post<{ token: string; user: AuthUser }>("/auth/login", {
      email,
      password,
    });
    await setToken(token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  };

  const logout = async () => {
    await clearToken();
    await SecureStore.deleteItemAsync(USER_KEY);
    setUser(null);
  };

  const value = useMemo(() => ({ user, isLoading, login, logout }), [user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

export function canSeeNotes(user: AuthUser | null): boolean {
  return user?.role === "ADMIN" || user?.role === "MINISTER";
}
