"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { usePermissions } from "@/hooks/usePermissions";
import { useGlobalLoading } from "@/providers/global-loading-provider";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { isTeacher, isEmployee, isAdmin, isSuperAdmin: isUserRoleSuperAdmin, isERPManager } = useUserRole();
  const { isSuperAdmin } = usePermissions();
  const globalLoading = useGlobalLoading();

  useEffect(() => {
    // Show global loading while auth is loading
    if (isLoading) {
      globalLoading.show("Please wait while we redirect you...");
      return;
    }

    // If not authenticated, go to sign-in
    if (!isAuthenticated) {
      globalLoading.show("Redirecting to sign in...");
      router.push("/sign-in");
      return;
    }

    // If authenticated, redirect to role-specific dashboard
    if (isAuthenticated && user?.id) {
      console.log('Home page: Redirecting authenticated user to appropriate dashboard');
      
      // Check user roles and redirect accordingly
      if (isTeacher) {
        globalLoading.show("Loading teacher dashboard...");
        router.push("/staff/teachers/dashboard");
        return;
      }
      
      if (isEmployee) {
        globalLoading.show("Loading employee dashboard...");
        router.push("/staff/employees/dashboard");
        return;
      }
      
      if (isERPManager) {
        globalLoading.show("Loading ERP manager dashboard...");
        router.push("/erp-manager/dashboard");
        return;
      }
      
      // Superadmins go to main dashboard
      if (isSuperAdmin || isUserRoleSuperAdmin) {
        globalLoading.show("Loading admin dashboard...");
        router.push("/dashboard");
        return;
      }
      
      // Everyone else goes to generic dashboard
      globalLoading.show("Loading dashboard...");
      router.push("/generic-dashboard");
      return;
    }

    // Fallback: if authenticated but no user data, go to sign-in
    if (isAuthenticated && !user?.id) {
      globalLoading.show("Redirecting to sign in...");
      router.push("/sign-in");
      return;
    }

    // If we get here, hide loading
    globalLoading.hide();
  }, [isAuthenticated, isLoading, user?.id, router, globalLoading]);

  return null; // All redirects handled above
} 