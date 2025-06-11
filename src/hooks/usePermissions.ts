"use client";

import { useAuth } from "@/hooks/useAuth";
import { Permission, Role } from "@/types/permissions";
import { hasPermission, hasAnyPermission, hasAllPermissions, roleDefaultPermissions } from "@/utils/rbac";
import { useEffect, useState } from "react";
import { api } from "@/utils/api";

// Map non-standard role names to our Role enum values
const roleMapping: Record<string, Role> = {
  "Employee": Role.STAFF,
  "employee": Role.STAFF,
  "Staff": Role.STAFF,
  "Teacher": Role.TEACHER,
  "teacher": Role.TEACHER,
  "Admin": Role.ADMIN,
  "admin": Role.ADMIN,
  "Administrator": Role.ADMIN,
  "administrator": Role.ADMIN,
  "Principal": Role.PRINCIPAL,
  "principal": Role.PRINCIPAL,
  "Head": Role.PRINCIPAL,
  "Accountant": Role.ACCOUNTANT,
  "accountant": Role.ACCOUNTANT,
  "Receptionist": Role.RECEPTIONIST,
  "receptionist": Role.RECEPTIONIST,
  "Transport Manager": Role.TRANSPORT_MANAGER,
  "transport manager": Role.TRANSPORT_MANAGER,
  "Transport": Role.TRANSPORT_MANAGER,
  "Super Admin": Role.SUPER_ADMIN,
  "super admin": Role.SUPER_ADMIN,
  "SuperAdmin": Role.SUPER_ADMIN,
  "superadmin": Role.SUPER_ADMIN,
};

// Map a role string to a standard Role enum value
const mapToStandardRole = (role: string): Role => {
  // Check if it's already a standard role enum value (case insensitive)
  const standardRoleKeys = Object.values(Role);
  const roleUpperCase = role.toUpperCase();
  
  // Check if it's already a valid standard role
  for (const standardRole of standardRoleKeys) {
    if (standardRole.toUpperCase() === roleUpperCase) {
      return standardRole as Role;
    }
  }
  
  // Otherwise, try to map from our mapping table
  return roleMapping[role] || Role.STAFF; // Default to STAFF if no mapping found
};

export function usePermissions() {
  const { user } = useAuth();
  const [forceAdmin, setForceAdmin] = useState(false);
  const [customRolePermissions, setCustomRolePermissions] = useState<string[]>([]);
  
  // Check for force admin mode in localStorage on client-side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isForceAdmin = localStorage.getItem('forceAdmin') === 'true';
      setForceAdmin(isForceAdmin);
      
      // For debugging
      if (isForceAdmin) {
        // console.log("Force admin mode active in usePermissions");
      }
    }
  }, []);
  
  // Debug the user roles
  // console.log("User in usePermissions:", user);
  
  // Get roles from the user object, fallback to 'role' singular if 'roles' array is empty
  let userRoles = user?.roles || [];
  
  // If userRoles is empty but user has a singular role, use that
  if (userRoles.length === 0 && user?.role) {
    userRoles = [user.role];
    // console.log("Using fallback singular role:", user.role);
  }
  
  // Check for localStorage role if available (used by force admin mode)
  if (typeof window !== 'undefined' && userRoles.length === 0) {
    const localStorageRole = localStorage.getItem('userRole');
    if (localStorageRole) {
      userRoles = [localStorageRole];
      // console.log("Using localStorage role:", localStorageRole);
    }
  }
  
  // Check if user is a superadmin (using various possible indicators)
  const isSuperAdmin = 
    forceAdmin || // Force admin mode takes precedence
    userRoles.includes(Role.SUPER_ADMIN) || 
    userRoles.includes('SuperAdmin') || 
    userRoles.includes('superadmin') || 
    user?.role === Role.SUPER_ADMIN ||
    user?.role === 'SuperAdmin' ||
    user?.role === 'superadmin';
  
  // console.log("User roles:", userRoles, "Is super admin:", isSuperAdmin, "Force admin:", forceAdmin);
  
  // Get custom role permissions from user's assigned role
  const { data: userPermissions, isLoading: isLoadingPermissions } = api.role.getUserRoles.useQuery(
    { userId: user?.id || "" },
    { 
      enabled: !!user?.id,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    }
  );

  // Get the first role ID for fetching permissions
  const primaryRoleId = userPermissions && userPermissions.length > 0 ? userPermissions[0]?.id : null;

  // Fetch role permissions using tRPC query hook
  const { data: rolePermissions } = api.role.getUserPermissionsByRoleId.useQuery(
    { roleId: primaryRoleId || "" },
    {
      enabled: !!primaryRoleId,
      refetchOnWindowFocus: false,
    }
  );

  // Update custom role permissions when role permissions load
  useEffect(() => {
    if (userPermissions && userPermissions.length > 0) {
      console.log("User roles found:", userPermissions.map((r: any) => ({ id: r.id, name: r.name })));
    }

    if (rolePermissions && Array.isArray(rolePermissions)) {
      const roleName = userPermissions?.[0]?.name || "Unknown";
      console.log(`Custom role permissions loaded for role "${roleName}":`, rolePermissions);
      setCustomRolePermissions(rolePermissions);
    } else if (userPermissions && userPermissions.length > 0) {
      // User has roles but no permissions loaded yet
      console.log("User has roles but permissions not loaded yet");
    } else {
      // No user roles found, clear custom permissions
      console.log("No user roles found, clearing custom permissions");
      setCustomRolePermissions([]);
    }
  }, [userPermissions, rolePermissions]);
  
  // Check if a user role has default permissions for the specified permission
  const checkRoleDefaultPermissions = (roles: string[], permission: Permission): boolean => {
    for (const role of roles) {
      const defaultPerms = roleDefaultPermissions[role];
      if (defaultPerms?.includes(permission)) {
        return true;
      }
    }
    return false;
  };
  
  return {
    userRoles,
    isSuperAdmin,
    forceAdmin,
    customRolePermissions,
    isLoadingPermissions,
    
    // Check if user has a specific permission based on custom role or role name
    can: (permission: Permission): boolean => {
      // Super admins have all permissions
      if (isSuperAdmin) {
        console.log(`Super admin access granted for permission: ${permission}`);
        return true;
      }
      
      // First check custom role permissions if available
      if (customRolePermissions.length > 0) {
        const hasCustomPermission = customRolePermissions.includes(permission);
        
        if (hasCustomPermission) {
          console.log(`Custom role permission granted for ${permission}. Available permissions: [${customRolePermissions.join(', ')}]`);
          return true;
        } else {
          console.log(`Custom role permission denied for ${permission}. Available permissions: [${customRolePermissions.join(', ')}]`);
        }
      } else {
        console.log(`No custom role permissions loaded for user ${user?.id}`);
      }
      
      // Then check for default permissions based on role type
      const hasDefaultPermission = checkRoleDefaultPermissions(
        userRoles.filter(role => typeof role === 'string'), 
        permission
      );
      
      if (hasDefaultPermission) {
        console.log(`Default permission granted for ${permission} based on roles: [${userRoles.join(', ')}]`);
        return true;
      }
      
      // Fall back to standard permission check
      const result = hasPermission(userRoles, permission);
      console.log(`Standard permission check for ${permission} with roles [${userRoles.join(', ')}]: ${result}`);
      return result;
    },
    
    // Check if user has any of the permissions
    canAny: (permissions: Permission[]): boolean => {
      if (isSuperAdmin) return true;
      
      // First check custom role permissions
      if (customRolePermissions.length > 0) {
        const hasAnyCustomPermission = permissions.some(perm => customRolePermissions.includes(perm));
        if (hasAnyCustomPermission) return true;
      }
      
      // Check default permissions
      for (const perm of permissions) {
        if (checkRoleDefaultPermissions(
          userRoles.filter(role => typeof role === 'string'),
          perm
        )) {
          return true;
        }
      }
      
      // Fall back to standard check
      return hasAnyPermission(userRoles, permissions);
    },
    
    // Check if user has all of the permissions
    canAll: (permissions: Permission[]): boolean => {
      if (isSuperAdmin) return true;
      
      // First check custom role permissions
      if (customRolePermissions.length > 0) {
        const hasAllCustomPermissions = permissions.every(perm => customRolePermissions.includes(perm));
        if (hasAllCustomPermissions) return true;
      }
      
      // Fall back to standard check
      return hasAllPermissions(userRoles, permissions);
    },
    
    // Check if user has access to a specific route/page
    canAccess: (requiredPermissions: Permission[]): boolean => {
      if (!requiredPermissions || requiredPermissions.length === 0) {
        console.log("Empty permissions array - everyone can access");
        return true;
      }

      console.log(`Checking route access for permissions: [${requiredPermissions.join(', ')}]`);

      // Super admins (including force admin mode) can access everything
      if (isSuperAdmin) {
        console.log(`Super admin access granted for: [${requiredPermissions.join(', ')}]`);
        return true;
      }
      
      // First check custom role permissions
      if (customRolePermissions.length > 0) {
        const hasCustomAccess = requiredPermissions.some(perm => customRolePermissions.includes(perm));
        
        console.log(`Custom role check - Required: [${requiredPermissions.join(', ')}], Available: [${customRolePermissions.join(', ')}], Access: ${hasCustomAccess}`);
        
        if (hasCustomAccess) {
          console.log(`Route access granted via custom role permissions`);
          return true;
        }
      } else {
        console.log(`No custom role permissions available, user roles: [${userRoles.join(', ')}]`);
      }
      
      // Check if any of the required permissions is a default permission
      for (const perm of requiredPermissions) {
        if (checkRoleDefaultPermissions(
          userRoles.filter(role => typeof role === 'string'),
          perm
        )) {
          console.log(`Route access granted via default permission: ${perm}`);
          return true;
        }
      }
      
      // Fall back to standard permission check
      console.log(`Checking access using standard permission system for roles: [${userRoles.join(', ')}]`);

      const result = hasAnyPermission(userRoles, requiredPermissions);
      
      // Detailed debugging for each permission
      requiredPermissions.forEach(perm => {
        const hasPerm = hasPermission(userRoles, perm);
        console.log(`- Permission check for ${perm}: ${hasPerm}`);
      });
      
      console.log(`Final route access result: ${result}`);
      return result;
    },
  };
}
