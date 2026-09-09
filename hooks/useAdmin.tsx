"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "firebase/auth";
import type { AdminUser } from "@/types";
import { watchAdmin } from "@/services/auth";

interface AdminContextValue {
  admin: AdminUser | null;
  user: User | null;
  loading: boolean;
}

const AdminContext = createContext<AdminContextValue>({ admin: null, user: null, loading: true });

export function AdminProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = watchAdmin((a, u) => {
      setAdmin(a);
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  return <AdminContext.Provider value={{ admin, user, loading }}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  return useContext(AdminContext);
}
