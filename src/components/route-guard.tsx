"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import { type Permission, Role } from "@/types/permissions";
import { useAuth } from "@/hooks/useAuth";
import { UnauthorizedAccess } from "@/components/ui/unauthorized-access";

interface RouteGuardProps {
  children: ReactNode;
  requiredPermissions: Permission[];
  redirectOnFail?: boolean;
  redirectTo?: string;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

export function RouteGuard({
  children,
  requiredPermissions,
  redirectOnFail = false,
  redirectTo = "/dashboard",
  fallbackTitle,
  fallbackMessage,
}: RouteGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { canAccess, isSuperAdmin } = usePermissions();
  const [showContent, setShowContent] = useState(false);
  const [showUnauthorized, setShowUnauthorized] = useState(false);
  
  useEffect(() => {
    // Skip check during server-side rendering
    if (typeof window === "undefined") {
      return;
    }

    // Still loading auth state
    if (isLoading) {
      return;
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push("/sign-in");
      return;
    }

    // Super admin bypass - always has access to everything
    if (isSuperAdmin) {
      setShowContent(true);
      setShowUnauthorized(false);
      return;
    }

    // Check permissions
    const hasAccess = requiredPermissions.length === 0 || canAccess(requiredPermissions);
    
    if (hasAccess) {
      setShowContent(true);
      setShowUnauthorized(false);
    } else {
      if (redirectOnFail) {
        // Old behavior: redirect to fallback page
        router.push(redirectTo);
      } else {
        // New behavior: show unauthorized page
        setShowContent(false);
        setShowUnauthorized(true);
      }
    }
  }, [
    isAuthenticated, 
    isLoading, 
    user, 
    canAccess, 
    isSuperAdmin, 
    requiredPermissions, 
    redirectOnFail, 
    redirectTo, 
    router
  ]);

  // Show loading or nothing while checking authentication
  if (typeof window === "undefined" || isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#00501B]"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Checking permissions...
          </p>
        </div>
      </div>
    );
  }

  // Show unauthorized access page
  if (showUnauthorized) {
    return (
      <UnauthorizedAccess
        title={fallbackTitle}
        message={fallbackMessage}
        requiredPermissions={requiredPermissions}
      />
    );
  }

  // Show protected content
  if (showContent) {
    return <>{children}</>;
  }

  // Default fallback
  return null;
} 