"use client";

import { useAuth } from "@/hooks/useAuth";
import { Permission } from "@/types/permissions";
import { useEffect, useState } from "react";
import { api } from "@/utils/api";

export function usePermissions() {
  const { user } = useAuth();
  const [forceAdmin, setForceAdmin] = useState(false);
  
  // Check for force admin mode in localStorage on client-side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isForceAdmin = localStorage.getItem('forceAdmin') === 'true';
      setForceAdmin(isForceAdmin);
    }
  }, []);

  // Get user permissions using TRPC
  const { data: userPermissions = [], isLoading: isLoadingPermissions } = api.role.getUserPermissions.useQuery(
    { userId: user?.id || '' },
    {
      enabled: !!user?.id,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Check if user is super admin (we'll add this to the role router)
  const { data: userRoles = [] } = api.role.getUserRoles.useQuery(
    { userId: user?.id || '' },
    {
      enabled: !!user?.id,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Check if user has super admin role from Clerk metadata
  const isSuperAdminFromClerk = user?.role === 'super_admin' || 
    user?.roles?.includes('super_admin') ||
    user?.roles?.includes('Super Admin') ||
    user?.roles?.includes('SuperAdmin');
  
  const isSuperAdmin = isSuperAdminFromClerk;
  const isActualSuperAdmin = forceAdmin || isSuperAdmin;

  // Force super admin for debugging
  const debugSuperAdmin = user?.id === 'user_2y1xEACdC5UpJaTuVRuuzH75bOA';

  return {
    userRoles: userRoles.map(userRole => userRole.roleId),
    userPermissions,
    isSuperAdmin: isActualSuperAdmin || debugSuperAdmin,
    forceAdmin,
    isLoadingPermissions,
    
    // Check if user has a specific permission
    can: (permission: Permission, branchId?: string): boolean => {
      // Super admins have all permissions
      if (isActualSuperAdmin || debugSuperAdmin) {
        return true;
      }

      // Check if user has the specific permission
      return userPermissions.includes(permission);
    },
    
    // Check if user has any of the specified permissions
    canAny: (permissions: Permission[], branchId?: string): boolean => {
      if (isActualSuperAdmin || debugSuperAdmin) {
        return true;
      }

      return permissions.some(permission => userPermissions.includes(permission));
    },
    
    // Check if user has all of the specified permissions
    canAll: (permissions: Permission[], branchId?: string): boolean => {
      if (isActualSuperAdmin || debugSuperAdmin) {
        return true;
      }

      return permissions.every(permission => userPermissions.includes(permission));
    },
    
    // Check if user has access to a specific route/page
    canAccess: (requiredPermissions: Permission[], branchId?: string): boolean => {
      if (!requiredPermissions || requiredPermissions.length === 0) {
        return true;
      }

      if (isActualSuperAdmin || debugSuperAdmin) {
        return true;
      }
      
      return requiredPermissions.some(permission => userPermissions.includes(permission));
    },
    
    // Check if user has a specific role
    hasRole: (roleName: string, branchId?: string): boolean => {
      if (!user?.id) return false;
      
      if (isActualSuperAdmin || debugSuperAdmin) {
        return true;
      }
      
      return userRoles.some(userRole => userRole.role?.name === roleName);
    },
    
    // Refresh permissions cache
    refreshPermissions: () => {
      // This will be handled by TRPC's query invalidation
      // We can add a utility for this if needed
    },
  };
}

/**
 * Legacy hook for backward compatibility
 * @deprecated Use usePermissions instead
 */
export function useUserPermissions() {
  return usePermissions();
}
