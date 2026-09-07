import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getItem, setItem, deleteItem } from "../lib/storage";
import { api, setToken, clearToken, getToken } from "../api/client";
import { registerForPushNotificationsAsync } from "../lib/pushNotifications";
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
  // Remembers the device's push token once we have it, so logout can
  // unregister it without re-triggering a permission prompt.
  const pushTokenRef = useRef<string | null>(null);

  // Best-effort: registers this device for "visit reminder" pushes (see
  // backend/src/jobs/sendReminders.ts). Never throws into the caller — a
  // failure here (denied permission, simulator, web) just means no push
  // notifications, not a broken login.
  const registerDeviceForPush = () => {
    registerForPushNotificationsAsync()
      .then((token) => {
        if (!token) return;
        pushTokenRef.current = token;
        return api.post("/notifications/register-device", { token });
      })
      .catch(() => {});
  };

  useEffect(() => {
    (async () => {
      const [token, storedUser] = await Promise.all([getToken(), getItem(USER_KEY)]);
      if (token && storedUser) {
        setUser(JSON.parse(storedUser));
        registerDeviceForPush();
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
    await setItem(USER_KEY, JSON.stringify(loggedInUser));
    setUser(loggedInUser);
    registerDeviceForPush();
  };

  const logout = async () => {
    if (pushTokenRef.current) {
      api.post("/notifications/unregister-device", { token: pushTokenRef.current }).catch(() => {});
      pushTokenRef.current = null;
    }
    await clearToken();
    await deleteItem(USER_KEY);
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
