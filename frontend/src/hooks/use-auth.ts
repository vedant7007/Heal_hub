"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { login as apiLogin, getMe } from "@/lib/api";
import type { Doctor } from "@/types";

interface AuthState {
  user: Doctor | null;
  role: "doctor" | "nurse";
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    role: "doctor",
    isLoading: true,
    isAuthenticated: false,
  });

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem("healhub_token");
    if (!token) {
      setState({ user: null, role: "doctor", isLoading: false, isAuthenticated: false });
      return;
    }
    try {
      const res = await getMe();
      const role = res.data.role || "doctor";
      setState({ user: res.data, role, isLoading: false, isAuthenticated: true });
    } catch {
      localStorage.removeItem("healhub_token");
      setState({ user: null, role: "doctor", isLoading: false, isAuthenticated: false });
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      void checkAuth();
    }, 0);
    return () => clearTimeout(id);
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    localStorage.setItem("healhub_token", res.data.token);
    const role = res.data.doctor?.role || "doctor";
    setState({ user: res.data.doctor, role, isLoading: false, isAuthenticated: true });
    router.push("/");
  };

  const logout = () => {
    localStorage.removeItem("healhub_token");
    setState({ user: null, role: "doctor", isLoading: false, isAuthenticated: false });
    router.push("/login");
  };

  return { ...state, login, logout, checkAuth };
}
