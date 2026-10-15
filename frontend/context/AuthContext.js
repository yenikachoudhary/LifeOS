"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authApi, clearToken, getToken, setToken } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function restore() {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const { user } = await authApi.me();
        if (!cancelled) setUser(user);
      } catch {
        clearToken();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    restore();
    const onLogout = () => setUser(null);
    window.addEventListener("lifeos-logout", onLogout);
    return () => {
      cancelled = true;
      window.removeEventListener("lifeos-logout", onLogout);
    };
  }, []);

  const finish = useCallback(({ token, user }) => {
    setToken(token);
    setUser(user);
  }, []);

  const login = useCallback(async (email, password) => finish(await authApi.login({ email, password })), [finish]);
  const register = useCallback(
    async (name, email, password) => finish(await authApi.register({ name, email, password })),
    [finish]
  );
  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
