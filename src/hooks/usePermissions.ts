"use client";

import { useAuth } from "./useAuth";
import { api } from "@/utils/api";
import { useMemo } from "react";

// Define permission types (keep these for backward compatibility and TypeScript)
export type Permission = 
  | "view_dashboard"
  | "view_students"
  | "create_student"
  | "edit_student"
  | "delete_student"
  | "view_teachers"
  | "create_teacher"
  | "edit_teacher"
  | "delete_teacher"
  | "view_employees"
  | "create_employee"
  | "edit_employee"
  | "delete_employee"
  | "view_departments"
  | "create_department"
  | "edit_department"
  | "delete_department"
  | "view_classes"
  | "create_class"
  | "edit_class"
  | "delete_class"
  | "view_money_collection"
  | "create_money_collection"
  | "edit_money_collection"
  | "delete_money_collection"
  | "manage_admissions"
  | "view_attendance"
  | "mark_attendance"
  | "view_leaves"
  | "manage_leave_applications"
  | "manage_leave_policies"
  | "view_salary"
  | "manage_salary_structures"
  | "view_finance_module"
  | "manage_fee_heads"
  | "manage_fee_terms"
  | "manage_classwise_fees"
  | "collect_fees"
  | "view_examinations"
  | "view_report_cards"
  | "generate_report_cards"
  | "view_communication"
  | "create_communication_message"
  | "view_chat"
  | "manage_chat_settings"
  | "view_courtesy_calls"
  | "view_rbac_settings"
  | "manage_permissions"
  | "manage_attendance_locations"
  | "manage_concession_types"
  | "manage_student_concessions"
  | "view_reports"
  | "manage_finance"
  | "manage_examinations"
  | "manage_settings"
  | "manage_roles"
  | "super_admin";

export function usePermissions() {
  const { user, isAuthenticated } = useAuth();

  // Fetch user permissions from the database
  const { data: userPermissions = [], isLoading } = api.role.getUserPermissions.useQuery(
    { userId: user?.id || '' },
    {
      enabled: !!user?.id && isAuthenticated,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Fetch user roles for additional context
  const { data: userRoles = [] } = api.role.getUserRoles.useQuery(
    { userId: user?.id || '' },
    {
      enabled: !!user?.id && isAuthenticated,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Check if user is super admin based on metadata or database roles
  const isSuperAdmin = useMemo(() => {
    if (!isAuthenticated || !user) return false;

    // Check user metadata first (from Supabase)
    const metadataRoles = [user.role, ...(user.roles || [])].filter(Boolean);
    const metadataSuperAdmin = metadataRoles.some(role => {
      if (typeof role === 'string') {
        return role === 'super_admin' || 
               role === 'Super Admin' || 
               role === 'SuperAdmin' ||
               role.toLowerCase().replace(/\s+/g, '_') === 'super_admin' ||
               role.toLowerCase() === 'superadmin';
      }
      return false;
    });

    // Check database roles
    const dbSuperAdmin = userRoles.some(userRole => 
      userRole.role?.name?.toLowerCase().includes('super') ||
      userRole.role?.name?.toLowerCase().includes('admin')
    );

    // Check database permissions
    const permissionSuperAdmin = userPermissions.includes('super_admin');

    return metadataSuperAdmin || dbSuperAdmin || permissionSuperAdmin;
  }, [user, userRoles, userPermissions, isAuthenticated]);

  const hasPermission = (permission: Permission | string): boolean => {
    if (!isAuthenticated || isLoading) return false;
    if (isSuperAdmin) return true;
    return userPermissions.includes(permission);
  };

  const hasAnyPermission = (permissions: (Permission | string)[]): boolean => {
    if (!isAuthenticated || isLoading) return false;
    if (isSuperAdmin) return true;
    return permissions.some(permission => userPermissions.includes(permission));
  };

  const hasAllPermissions = (permissions: (Permission | string)[]): boolean => {
    if (!isAuthenticated || isLoading) return false;
    if (isSuperAdmin) return true;
    return permissions.every(permission => userPermissions.includes(permission));
  };

  const canAccess = (requiredPermissions: (Permission | string)[]): boolean => {
    if (!isAuthenticated) return false;
    if (isSuperAdmin) return true;
    if (requiredPermissions.length === 0) return true;
    return hasAnyPermission(requiredPermissions);
  };

  // Check if user has a specific role
  const hasRole = (roleName: string): boolean => {
    if (!isAuthenticated || isLoading) return false;
    if (isSuperAdmin) return true;
    return userRoles.some(userRole => 
      userRole.role?.name?.toLowerCase() === roleName.toLowerCase()
    );
  };

  return {
    permissions: userPermissions,
    roles: userRoles,
    isLoading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    isSuperAdmin,
    canAccess,
    isAuthenticated,
    user,
    
    // Legacy compatibility methods
    can: hasPermission,
    canAny: hasAnyPermission,
    canAll: hasAllPermissions,
  };
}

/**
 * Legacy hook for backward compatibility
 * @deprecated Use usePermissions instead
 */
export function useUserPermissions() {
  return usePermissions();
}
