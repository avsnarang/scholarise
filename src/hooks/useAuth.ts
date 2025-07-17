"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter as useAppRouter } from "next/navigation";
import { useAuth as useSupabaseAuth } from "@/providers/auth-provider";

export function useAuth() {
  const [mounted, setMounted] = useState(false);
  
  // Use App Router's navigation hooks inside useEffect to prevent hydration errors
  const appRouter = useAppRouter();
  const pathname = usePathname();
  
  // Handle Supabase auth
  const { user: supabaseUser, session, loading, signIn, signOut, signInWithGoogle } = useSupabaseAuth();

  // Track component mount state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Map Supabase user to our app's user format
  const user = supabaseUser ? {
    id: supabaseUser.id,
    name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || '',
    email: supabaseUser.email || '',
    image: supabaseUser.user_metadata?.avatar_url || null,
    role: (supabaseUser.user_metadata?.role as string) || 'User',
    roles: (supabaseUser.user_metadata?.roles as string[]) || ['User'],
    branchId: (supabaseUser.user_metadata?.branchId as string) || '1',
  } : null;

  const isAuthenticated = !!session && !!supabaseUser;

  // Login method using Supabase
  const login = async (email: string, password: string, branchId?: string) => {
    try {
      const { error } = await signIn(email, password);
      if (error) {
        return { ok: false, error: error.message };
      }
      return { ok: true, error: null };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const loginWithGoogle = async (branchId?: string) => {
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        return { ok: false, error: error.message };
      }
      return { ok: true, error: null };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const logout = useCallback(async () => {
    try {
      await signOut();
      appRouter.push("/sign-in");
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  }, [signOut, appRouter]);

  const requireAuth = useCallback(() => {
    // Only run redirect if component is mounted and auth state is loaded
    if (mounted && !loading && !isAuthenticated) {
      appRouter.push("/sign-in");
    }
  }, [loading, isAuthenticated, appRouter, mounted]);

  return {
    session: { user },
    user,
    isAuthenticated,
    isLoading: loading,
    login,
    loginWithGoogle,
    logout,
    requireAuth,
    pathname,
  };
}
