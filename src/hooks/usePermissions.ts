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
        console.log("Force admin mode active in usePermissions");
      }
    }
  }, []);
  
  // Debug the user roles
  console.log("User in usePermissions:", user);
  
  // Get roles from the user object, fallback to 'role' singular if 'roles' array is empty
  let userRoles = user?.roles || [];
  
  // If userRoles is empty but user has a singular role, use that
  if (userRoles.length === 0 && user?.role) {
    userRoles = [user.role];
    console.log("Using fallback singular role:", user.role);
  }
  
  // Check for localStorage role if available (used by force admin mode)
  if (typeof window !== 'undefined' && userRoles.length === 0) {
    const localStorageRole = localStorage.getItem('userRole');
    if (localStorageRole) {
      userRoles = [localStorageRole];
      console.log("Using localStorage role:", localStorageRole);
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
  
  console.log("User roles:", userRoles, "Is super admin:", isSuperAdmin, "Force admin:", forceAdmin);
  
  // Get custom role permissions by checking metadata or local storage
  useEffect(() => {
    // Try to get the role ID from user metadata or localStorage
    let roleId = "";
    
    // Check for roleId in user.publicMetadata first (if it exists)
    if (user && typeof user === 'object') {
      const metadata = user as Record<string, any>;
      if (metadata.publicMetadata && typeof metadata.publicMetadata === 'object') {
        roleId = metadata.publicMetadata.roleId || "";
      }
    }
    
    // Check localStorage for cached role ID if not found in metadata
    if (!roleId && typeof window !== 'undefined') {
      roleId = localStorage.getItem('userRoleId') || "";
    }
    
    // If we have a roleId, fetch the permissions
    if (roleId) {
      const fetchPermissions = async () => {
        try {
          // Use the tRPC client directly to avoid the hooks limitation
          const client = api.useContext();
          const permissions = await client.role.getUserPermissionsByRoleId.fetch({ roleId });
          console.log("Custom role permissions loaded:", permissions);
          setCustomRolePermissions(permissions || []);
        } catch (error) {
          console.error("Error fetching custom role permissions:", error);
        }
      };
      
      void fetchPermissions();
    }
  }, [user, api]);
  
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
    
    // Check if user has a specific permission based on custom role or role name
    can: (permission: Permission): boolean => {
      // Super admins have all permissions
      if (isSuperAdmin) return true;
      
      // First check custom role permissions if available
      if (customRolePermissions.length > 0) {
        const hasCustomPermission = customRolePermissions.includes(permission);
        
        if (permission === Permission.VIEW_ATTENDANCE) {
          console.log(`Custom role check for permission ${permission}: ${hasCustomPermission}`);
        }
        
        if (hasCustomPermission) return true;
      }
      
      // Then check for default permissions based on role type
      const hasDefaultPermission = checkRoleDefaultPermissions(
        userRoles.filter(role => typeof role === 'string'), 
        permission
      );
      
      if (hasDefaultPermission) {
        console.log(`User has default permission ${permission} based on role`);
        return true;
      }
      
      // Fall back to standard permission check
      const result = hasPermission(userRoles, permission);
      if (permission === Permission.VIEW_ATTENDANCE) {
        console.log(`Checking ${permission} permission for user roles ${userRoles.join(', ')}: ${result}`);
      }
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

      // Super admins (including force admin mode) can access everything
      if (isSuperAdmin) {
        console.log(`Super admin access granted for: [${requiredPermissions.join(', ')}]`);
        return true;
      }
      
      // First check custom role permissions
      if (customRolePermissions.length > 0) {
        const hasCustomAccess = requiredPermissions.some(perm => customRolePermissions.includes(perm));
        
        if (requiredPermissions.includes(Permission.VIEW_ATTENDANCE)) {
          console.log(`Custom role check for permissions: ${hasCustomAccess}`);
          console.log(`Custom permissions: [${customRolePermissions.join(", ")}]`);
        }
        
        if (hasCustomAccess) return true;
      }
      
      // Check if any of the required permissions is a default permission
      for (const perm of requiredPermissions) {
        if (checkRoleDefaultPermissions(
          userRoles.filter(role => typeof role === 'string'),
          perm
        )) {
          console.log(`User has default access to ${perm} based on role`);
          return true;
        }
      }
      
      // Fall back to standard permission check
      if (requiredPermissions.includes(Permission.VIEW_ATTENDANCE)) {
        console.log(`Checking access for permissions: [${requiredPermissions.join(', ')}]`);
        console.log(`Using roles: [${userRoles.join(', ')}]`);
      }

      const result = hasAnyPermission(userRoles, requiredPermissions);
      
      if (requiredPermissions.includes(Permission.VIEW_ATTENDANCE)) {
        console.log(`Access result for [${requiredPermissions.join(', ')}]: ${result}`);
        
        // Check each permission individually for detailed debugging
        requiredPermissions.forEach(perm => {
          const hasPerm = hasPermission(userRoles, perm);
          console.log(`- Permission check for ${perm}: ${hasPerm}`);
        });
      }
      
      return result;
    },
  };
}
