"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter as useAppRouter } from "next/navigation";
import { useUser, useClerk, useAuth as useClerkAuth } from "@clerk/nextjs";

export function useAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  // Use App Router's navigation hooks inside useEffect to prevent hydration errors
  const appRouter = useAppRouter();
  const pathname = usePathname();
  
  // Handle Clerk hooks
  const { user: clerkUser, isLoaded: clerkIsLoaded } = useUser();
  const { signOut } = useClerk();
  const { isSignedIn } = useClerkAuth();

  // Track component mount state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update loading state based on Clerk's loading state
  useEffect(() => {
    if (clerkIsLoaded) {
      setIsLoading(false);
    }
  }, [clerkIsLoaded]);

  // Map Clerk user to our app's user format
  const user = clerkUser ? {
    id: clerkUser.id,
    name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || clerkUser.username || '',
    email: clerkUser.primaryEmailAddress?.emailAddress || '',
    image: clerkUser.imageUrl || null,
    role: (clerkUser.publicMetadata?.role as string) || 'User',
    roles: (clerkUser.publicMetadata?.roles as string[]) || ['User'],
    branchId: (clerkUser.publicMetadata?.branchId as string) || '1',
  } : null;

  const isAuthenticated = !!isSignedIn;

  // These methods are kept for compatibility but now use Clerk
  const login = async (email: string, password: string, branchId?: string) => {
    setIsLoading(true);
    try {
      // This is just a stub - actual login is handled by Clerk components
      setIsLoading(false);
      return { ok: true, error: null };
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const loginWithGoogle = async (branchId?: string) => {
    setIsLoading(true);
    try {
      // This is just a stub - actual login is handled by Clerk components
      setIsLoading(false);
      return { ok: true, error: null };
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await signOut();
      // Clerk will handle the redirect to sign-in page
    } catch (error) {
      setIsLoading(false);
      console.error("Error signing out:", error);
      throw error;
    }
  }, [signOut]);

  const requireAuth = useCallback(() => {
    // Only run redirect if component is mounted
    if (mounted && clerkIsLoaded && !isSignedIn) {
      appRouter.push("/sign-in");
    }
  }, [clerkIsLoaded, isSignedIn, appRouter, mounted]);

  return {
    session: { user },
    user,
    isAuthenticated,
    isLoading,
    login,
    loginWithGoogle,
    logout,
    requireAuth,
    pathname,
  };
}
