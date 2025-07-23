"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { usePermissions } from "@/hooks/usePermissions";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { isTeacher, isEmployee, isAdmin, isSuperAdmin: isUserRoleSuperAdmin, isERPManager } = useUserRole();
  const { isSuperAdmin } = usePermissions();

  useEffect(() => {
    // Don't do anything while loading
    if (isLoading) {
      return;
    }

    // If not authenticated, go to sign-in
    if (!isAuthenticated) {
      router.push("/sign-in");
      return;
    }

    // If authenticated, redirect to role-specific dashboard
    if (isAuthenticated && user?.id) {
      console.log('Home page: Redirecting authenticated user to appropriate dashboard');
      
      // Check user roles and redirect accordingly
      if (isTeacher) {
        router.push("/staff/teachers/dashboard");
        return;
      }
      
      if (isEmployee) {
        router.push("/staff/employees/dashboard");
        return;
      }
      
      if (isERPManager) {
        router.push("/erp-manager/dashboard");
        return;
      }
      
      // Superadmins go to main dashboard
      if (isSuperAdmin || isUserRoleSuperAdmin) {
        router.push("/dashboard");
        return;
      }
      
      // Everyone else goes to generic dashboard
      router.push("/generic-dashboard");
      return;
    }

    // Fallback: if authenticated but no user data, go to sign-in
    if (isAuthenticated && !user?.id) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, isLoading, user?.id, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#00501B] border-t-transparent"></div>
        <h1 className="text-xl font-semibold text-gray-900">Loading...</h1>
        <p className="mt-2 text-gray-600">
          Please wait while we redirect you.
        </p>
      </div>
    </div>
  );
} 