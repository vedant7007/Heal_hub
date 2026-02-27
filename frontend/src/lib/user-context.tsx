"use client";

import { createContext, useContext } from "react";
import type { Doctor } from "@/types";

interface UserContextValue {
  user: Doctor | null;
  role: "doctor" | "nurse";
}

const UserContext = createContext<UserContextValue>({ user: null, role: "doctor" });

export function UserProvider({
  user,
  role,
  children,
}: UserContextValue & { children: React.ReactNode }) {
  return (
    <UserContext.Provider value={{ user, role }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
