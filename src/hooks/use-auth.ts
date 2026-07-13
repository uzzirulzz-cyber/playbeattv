"use client";

import { useSession } from "next-auth/react";

export function useAuth() {
  const { data: session, status, update } = useSession();
  const user = session?.user;
  return {
    status, // "loading" | "authenticated" | "unauthenticated"
    session,
    user,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
    role: user?.role,
    plan: user?.plan,
    planExpires: user?.planExpires,
    isAdmin: user?.role === "admin",
    userId: user?.id,
    update,
  };
}
