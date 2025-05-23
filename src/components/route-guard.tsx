"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import { type Permission, Role } from "@/types/permissions";
import { useAuth } from "@/hooks/useAuth";

interface RouteGuardProps {
  children: ReactNode;
  requiredPermissions: Permission[];
  redirectTo?: string;
}

export function RouteGuard({
  children,
  requiredPermissions,
  redirectTo = "/dashboard",
}: RouteGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { canAccess } = usePermissions();
  
  useEffect(() => {
    // Skip check during server-side rendering or loading
    if (typeof window === "undefined" || isLoading) {
      return;
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    // Super admin bypass - always has access to everything
    if (user?.roles?.includes(Role.SUPER_ADMIN)) {
      return;
    }

    // Redirect to fallback page if missing required permissions
    if (requiredPermissions.length > 0 && !canAccess(requiredPermissions)) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, user, canAccess, requiredPermissions, redirectTo, router]);

  // Show nothing while checking authentication or during SSR
  if (
    typeof window === "undefined" ||
    isLoading ||
    !isAuthenticated ||
    (requiredPermissions.length > 0 && !user?.roles?.includes(Role.SUPER_ADMIN) && !canAccess(requiredPermissions))
  ) {
    return null;
  }

  return <>{children}</>;
} 